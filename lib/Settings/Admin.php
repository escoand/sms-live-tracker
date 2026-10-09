<?php

namespace OCA\LiveTracker\Settings;

use OCA\LiveTracker\Service\BackendRegistry;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IConfig;
use OCP\IURLGenerator;
use OCP\Settings\ISettings;

class Admin implements ISettings
{
    public function __construct(private IConfig $config, private IURLGenerator $urls, private BackendRegistry $backends)
    {
    }

    public function getForm(): TemplateResponse
    {
        $backend = $this->backends->activeId();
        $token = $this->config->getAppValue('live_tracker', 'backend.' . $backend . '.webhook_token', '');
        if ($token === '') {
            $token = bin2hex(random_bytes(32));
            $this->config->setAppValue('live_tracker', 'backend.' . $backend . '.webhook_token', $token);
        }
        $backends = $this->backends->available();
        $backendSettings = [];
        foreach ($backends as $backendId => $label) {
            $fields = $this->backends->get($backendId)->settings();
            $values = [];
            foreach ($fields as $key => $field) {
                $values[$key] = $field['type'] === 'password'
                    ? '' : $this->config->getAppValue('live_tracker', 'backend.' . $backendId . '.' . $key, '');
            }
            $backendSettings[$backendId] = ['fields' => $fields, 'values' => $values];
        }
        $bootstrap = json_encode([
            'saveUrl' => $this->urls->linkToRoute('live_tracker.page.save'),
            'webhookUrl' => $this->urls->linkToRouteAbsolute('live_tracker.page.receive', ['backend' => $backend, 'token' => $token]),
            'backend' => $backend,
            'backends' => $backends,
            'backendSettings' => $backendSettings,
            'maptilerKey' => $this->config->getAppValue('live_tracker', 'maptiler_key', ''),
        ], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_THROW_ON_ERROR);
        return new TemplateResponse('live_tracker', 'admin', [
            'componentStylesheet' => $this->urls->linkTo('live_tracker', 'js/admin.css') . '?v=' . substr(hash_file('sha256', __DIR__ . '/../../js/admin.css'), 0, 12),
            'bootstrap' => $bootstrap,
        ], '');
    }

    public function getSection(): string
    {
        return 'live_tracker';
    }

    public function getPriority(): int
    {
        return 50;
    }
}