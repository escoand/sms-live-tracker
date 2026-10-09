<?php

namespace OCA\LiveTracker\Service;

interface TrackerBackend
{
    public function settings(): array;

    public function request(string $name): void;

    public function receive(array $event): void;
}