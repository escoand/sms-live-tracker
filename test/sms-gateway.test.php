<?php

namespace Psr\Log {
    interface LoggerInterface
    {
        public function emergency($message, array $context = []);
        public function alert($message, array $context = []);
        public function critical($message, array $context = []);
        public function error($message, array $context = []);
        public function warning($message, array $context = []);
        public function notice($message, array $context = []);
        public function info($message, array $context = []);
        public function debug($message, array $context = []);
        public function log($level, $message, array $context = []);
    }
}

namespace {
    require_once __DIR__ . '/../lib/Service/TrackerBackend.php';
    require_once __DIR__ . '/../lib/Service/TrackerData.php';
    require_once __DIR__ . '/../lib/Service/SmsGateway.php';

    use OCA\LiveTracker\Service\SmsGateway;
    use OCA\LiveTracker\Service\TrackerData;
    use Psr\Log\LoggerInterface;

    class TestTrackerData extends TrackerData
    {
        public int $saveCount = 0;

        public function __construct(private array $trackers)
        {
        }

        public function read(string $name): array
        {
            if ($name !== 'trackers') {
                throw new RuntimeException('Unexpected collection read');
            }
            return $this->trackers;
        }

        public function save(string $name, array $collection): void
        {
            if ($name !== 'trackers') {
                throw new RuntimeException('Unexpected collection write');
            }
            $this->saveCount++;
            $this->trackers = $collection;
        }
    }

    class TestLogger implements LoggerInterface
    {
        public function emergency($message, array $context = [])
        {
        }
        public function alert($message, array $context = [])
        {
        }
        public function critical($message, array $context = [])
        {
        }
        public function error($message, array $context = [])
        {
        }
        public function warning($message, array $context = [])
        {
        }
        public function notice($message, array $context = [])
        {
        }
        public function info($message, array $context = [])
        {
        }
        public function debug($message, array $context = [])
        {
        }
        public function log($level, $message, array $context = [])
        {
        }
    }

    function check(bool $condition, string $message): void
    {
        if (!$condition) {
            throw new RuntimeException($message);
        }
    }

    function syntheticEvents(): array
    {
        return [
            'sms:sent' => [
                'event' => 'sms:sent',
                'payload' => [
                    'sentAt' => '2026-01-01T10:00:00+02:00',
                    'recipient' => '+15551234567',
                ],
            ],
            'sms:delivered' => [
                'event' => 'sms:delivered',
                'payload' => [
                    'deliveredAt' => '2026-01-01T10:00:05+02:00',
                    'recipient' => '+15551234567',
                ],
            ],
            'sms:received' => [
                'event' => 'sms:received',
                'payload' => [
                    'receivedAt' => '2026-01-01T10:00:10+02:00',
                    'sender' => '+15551234567',
                    'message' => "Lat:12.345\nLon:67.890\nBat:100%\n",
                ],
            ],
            'sms:failed' => [
                'event' => 'sms:failed',
                'payload' => [
                    'failedAt' => '2026-01-01T10:00:15+02:00',
                    'recipient' => '+15551234567',
                    'reason' => 'Synthetic failure',
                    'message' => "SomeMessage\n",
                ],
            ],
            'sms:cancelled' => [
                'event' => 'sms:cancelled',
                'payload' => [
                    'cancelledAt' => '2026-01-01T10:00:20+02:00',
                    'recipient' => '+15551234567',
                ],
            ],
        ];
    }

    function gatewayWithTrackers(array $trackers): array
    {
        $data = new TestTrackerData($trackers);
        $gateway = (new ReflectionClass(SmsGateway::class))->newInstanceWithoutConstructor();
        (new ReflectionProperty(SmsGateway::class, 'data'))->setValue($gateway, $data);
        (new ReflectionProperty(SmsGateway::class, 'logger'))->setValue($gateway, new TestLogger());
        return [$gateway, $data];
    }

    function trackerFixture(): array
    {
        return [
            'type' => 'FeatureCollection',
            'features' => [
                [
                    'type' => 'Feature',
                    'geometry' => ['type' => 'Point', 'coordinates' => [0, 0]],
                    'properties' => [
                        'number' => '+15551234567',
                        'requested' => 'old-request',
                        'sent' => 'old-sent',
                        'delivered' => 'old-delivered',
                        'failed' => 'old-failed',
                        'cancelled' => 'old-cancelled',
                    ],
                ]
            ],
        ];
    }

    $events = syntheticEvents();
    foreach ([
        'sms:sent' => ['sent', 'sentAt'],
        'sms:delivered' => ['delivered', 'deliveredAt'],
        'sms:received' => ['received', 'receivedAt'],
        'sms:failed' => ['failed', 'failedAt'],
        'sms:cancelled' => ['cancelled', 'cancelledAt'],
    ] as $kind => [$status, $timestampField]) {
        [$gateway, $data] = gatewayWithTrackers(trackerFixture());
        $gateway->receive($events[$kind]);
        $tracker = $data->read('trackers')['features'][0];
        check(
            $tracker['properties'][$status] === gmdate('c', strtotime($events[$kind]['payload'][$timestampField])),
            $kind . ' must normalize its timestamp to UTC',
        );
        foreach (['requested', 'sent', 'delivered', 'failed', 'cancelled'] as $staleStatus) {
            if ($staleStatus !== $status) {
                check(!isset($tracker['properties'][$staleStatus]), $kind . ' must clear stale ' . $staleStatus . ' status');
            }
        }
        if ($kind === 'sms:received') {
            check($tracker['geometry']['coordinates'] === [67.89, 12.345], 'received event must update coordinates');
            check($tracker['properties']['battery'] === '100%', 'received event must update battery');
        }
    }

    $legacyReceived = $events['sms:received'];
    unset($legacyReceived['payload']['sender']);
    $legacyReceived['payload']['phoneNumber'] = '+15551234567';
    [$legacyGateway, $legacyData] = gatewayWithTrackers(trackerFixture());
    $legacyGateway->receive($legacyReceived);
    check(
        $legacyData->read('trackers')['features'][0]['geometry']['coordinates'] === [67.89, 12.345],
        'legacy phoneNumber payloads must remain supported',
    );

    $zeroCoordinateEvent = $events['sms:received'];
    $zeroCoordinateEvent['payload']['message'] = "Lat:0\nLon:0\nBat:0%\n";
    [$zeroCoordinateGateway, $zeroCoordinateData] = gatewayWithTrackers(trackerFixture());
    $zeroCoordinateGateway->receive($zeroCoordinateEvent);
    $zeroCoordinateTracker = $zeroCoordinateData->read('trackers')['features'][0];
    check($zeroCoordinateTracker['geometry']['coordinates'] === [0.0, 0.0], 'zero coordinates must be retained');
    check($zeroCoordinateTracker['properties']['battery'] === '0%', 'zero battery must be retained');

    [$pingGateway, $pingData] = gatewayWithTrackers(trackerFixture());
    $pingGateway->receive(['event' => 'system:ping', 'payload' => ['health' => 'ok']]);
    check($pingData->saveCount === 0, 'system ping must not save or mutate tracker data');

    [$invalidGateway] = gatewayWithTrackers(trackerFixture());
    try {
        $invalidGateway->receive(['event' => 'sms:received', 'payload' => 'not-json']);
        throw new RuntimeException('Malformed event payload was accepted');
    } catch (InvalidArgumentException $error) {
    }
    try {
        $invalidGateway->receive(['event' => 'sms:unknown', 'payload' => []]);
        throw new RuntimeException('Unsupported event was accepted');
    } catch (InvalidArgumentException $error) {
    }

    echo "SMS Gate event validation passed\n";
}