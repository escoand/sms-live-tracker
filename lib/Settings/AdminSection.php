<?php

namespace OCA\LiveTracker\Settings;

use OCP\Settings\IIconSection;

class AdminSection implements IIconSection
{
    public function getID(): string
    {
        return 'live_tracker';
    }

    public function getName(): string
    {
        return 'Live Tracker';
    }

    public function getPriority(): int
    {
        return 50;
    }

    public function getIcon(): string
    {
        return '/core/img/actions/settings.svg';
    }
}