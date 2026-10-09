<?php

namespace OCA\LiveTracker\Service;

use OCP\IConfig;

class BackendRegistry
{
    public function __construct(private IConfig $config, private SmsGateway $smsGate)
    {
    }

    public function available(): array
    {
        return ['sms_gate' => 'SMS Gate'];
    }

    public function activeId(): string
    {
        return $this->config->getAppValue('live_tracker', 'backend.active', 'sms_gate');
    }

    public function get(string $id): TrackerBackend
    {
        return match ($id) {
            'sms_gate' => $this->smsGate,
            default => throw new \InvalidArgumentException('Unknown tracker backend'),
        };
    }

    public function active(): TrackerBackend
    {
        return $this->get($this->activeId());
    }
}