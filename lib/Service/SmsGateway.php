<?php

namespace OCA\LiveTracker\Service;

use OCP\Http\Client\IClientService;
use OCP\IConfig;
use Psr\Log\LoggerInterface;

class SmsGateway implements TrackerBackend
{
    public function __construct(
        private TrackerData $data,
        private IConfig $config,
        private IClientService $clients,
        private LoggerInterface $logger,
    ) {
    }

    public function settings(): array
    {
        return [
            'authentication' => [
                'label' => 'Gateway authentication (username:password)',
                'type' => 'password',
                'description' => 'Public Cloud credentials in username:password format.',
                'documentation' => 'https://docs.sms-gate.app/getting-started/public-cloud-server/#how-to-use',
            ],
            'encryption' => [
                'label' => 'Encryption passphrase',
                'type' => 'password',
                'description' => 'Must match the passphrase configured in SMS Gate for encrypted messages.',
                'documentation' => 'https://docs.sms-gate.app/privacy/encryption/#passphrase-encryption',
            ],
            'message' => [
                'label' => 'Position request message',
                'type' => 'text',
                'description' => 'Text sent to the tracker to request its current position.',
            ],
        ];
    }

    private function setting(string $key): string
    {
        return $this->config->getAppValue('live_tracker', 'backend.sms_gate.' . $key, '');
    }

    private function decrypt(string $value): string
    {
        if (!str_starts_with($value, '$aes-256-cbc/pbkdf2-sha1$')) {
            return $value;
        }
        $parts = explode('$', $value);
        $iterations = (int) substr($parts[2] ?? '', 2);
        $salt = base64_decode($parts[3] ?? '', true);
        $ciphertext = base64_decode($parts[4] ?? '', true);
        if ($iterations < 1 || $iterations > 1000000 || $salt === false || strlen($salt) !== 16 || $ciphertext === false) {
            throw new \InvalidArgumentException('Invalid encrypted SMS value');
        }
        $key = hash_pbkdf2('sha1', $this->setting('encryption'), $salt, $iterations, 32, true);
        $result = openssl_decrypt($ciphertext, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $salt);
        if ($result === false) {
            throw new \InvalidArgumentException('Unable to decrypt SMS value');
        }
        return $result;
    }

    private function encrypt(string $value): string
    {
        $salt = random_bytes(16);
        $key = hash_pbkdf2('sha1', $this->setting('encryption'), $salt, 75000, 32, true);
        $encrypted = openssl_encrypt($value, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $salt);
        if ($encrypted === false) {
            throw new \RuntimeException('Unable to encrypt SMS value');
        }
        return '$aes-256-cbc/pbkdf2-sha1$i=75000$' . base64_encode($salt) . '$' . base64_encode($encrypted);
    }

    public function request(string $name): void
    {
        if ($this->setting('authentication') === '' || $this->setting('encryption') === '') {
            $this->logger->warning('SMS Gate request blocked because required settings are missing', [
                'setting_authentication' => $this->setting('authentication') !== '',
                'setting_encryption' => $this->setting('encryption') !== '',
            ]);
            throw new \InvalidArgumentException('Configure SMS Gate authentication and encryption in administration settings first');
        }
        $trackers = $this->data->read('trackers');
        foreach ($trackers['features'] as &$tracker) {
            if (($tracker['properties']['name'] ?? null) !== $name) {
                continue;
            }
            $number = $tracker['properties']['number'] ?? '';
            if (!is_string($number) || $number === '') {
                $this->logger->warning('SMS Gate request blocked because tracker has no phone number');
                throw new \InvalidArgumentException('Tracker has no phone number');
            }
            $body = [
                'isEncrypted' => true,
                'phoneNumbers' => [$this->encrypt($number)],
                'priority' => 100,
                'ttl' => 3600,
                'textMessage' => ['text' => $this->encrypt($this->setting('message'))],
            ];
            $response = $this->clients->newClient()->post('https://api.sms-gate.app/3rdparty/v1/messages', [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Basic ' . base64_encode($this->setting('authentication')),
                ],
                'body' => json_encode($body, JSON_THROW_ON_ERROR),
                'http_errors' => false,
            ]);
            if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
                $this->logger->error('SMS Gate rejected a position request', [
                    'status_code' => $response->getStatusCode(),
                ]);
                throw new \RuntimeException('SMS gateway rejected the request (HTTP ' . $response->getStatusCode() . ')');
            }
            unset($tracker['properties']['failed'], $tracker['properties']['sent'], $tracker['properties']['delivered'], $tracker['properties']['cancelled']);
            $tracker['properties']['requested'] = gmdate('c');
            $this->data->save('trackers', $trackers);
            $this->logger->info('SMS Gate accepted a position request');
            return;
        }
        $this->logger->warning('SMS Gate request referenced an unknown tracker');
        throw new \InvalidArgumentException('Unknown tracker');
    }

    public function receive(array $event): void
    {
        if (($event['event'] ?? '') === 'system:ping') {
            $this->logger->debug('SMS Gate system ping received');
            return;
        }
        $kind = $event['event'] ?? '';
        if (
            !in_array($kind, ['sms:sent', 'sms:delivered', 'sms:received', 'sms:failed', 'sms:cancelled'], true)
            || !is_array($event['payload'] ?? null)
        ) {
            $this->logger->warning('SMS Gate sent an unsupported webhook event', [
                'event_type' => is_string($kind) ? $kind : 'invalid',
            ]);
            throw new \InvalidArgumentException('Unknown SMS event');
        }
        $payload = $event['payload'];
        $numberField = $kind === 'sms:received' ? 'sender' : 'recipient';
        $rawNumber = $payload[$numberField] ?? $payload['phoneNumber'] ?? '';
        $number = $this->decrypt(is_string($rawNumber) ? $rawNumber : '');
        $trackers = $this->data->read('trackers');
        foreach ($trackers['features'] as &$tracker) {
            if (($tracker['properties']['number'] ?? null) !== $number) {
                continue;
            }
            $properties = &$tracker['properties'];
            unset($properties['requested'], $properties['sent'], $properties['delivered'], $properties['failed'], $properties['cancelled']);
            $field = [
                'sms:sent' => 'sent',
                'sms:delivered' => 'delivered',
                'sms:received' => 'received',
                'sms:failed' => 'failed',
                'sms:cancelled' => 'cancelled',
            ][$kind];
            $timestamp = $payload[$field . 'At'] ?? null;
            if ($timestamp !== null && strtotime((string) $timestamp) !== false) {
                $properties[$field] = gmdate('c', strtotime((string) $timestamp));
            }
            if ($kind === 'sms:received') {
                $message = $this->decrypt((string) ($payload['message'] ?? ''));
                $longitude = null;
                $latitude = null;
                $battery = null;
                foreach (preg_split('/[\r\n]+/', $message) as $line) {
                    if (str_starts_with($line, 'Lon:'))
                        $longitude = (float) substr($line, 4);
                    if (str_starts_with($line, 'Lat:'))
                        $latitude = (float) substr($line, 4);
                    if (str_starts_with($line, 'Bat:'))
                        $battery = substr($line, 4);
                }
                if ($longitude !== null && $latitude !== null && $battery !== null && $battery !== '') {
                    $tracker['geometry']['coordinates'] = [$longitude, $latitude];
                    $properties['battery'] = $battery;
                    $this->logger->debug('SMS Gate location parsed successfully', [
                        'event_type' => $kind,
                    ]);
                } else {
                    $this->logger->warning('SMS Gate location message did not contain valid coordinates and battery data', [
                        'event_type' => $kind,
                    ]);
                }
            }
            $this->data->save('trackers', $trackers);
            $this->logger->info('SMS Gate webhook processed', ['event_type' => $kind]);
            return;
        }
        $this->logger->warning('SMS Gate webhook did not match a tracker', ['event_type' => $kind]);
    }
}