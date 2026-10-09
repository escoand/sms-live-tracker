<?php

namespace OCA\LiveTracker\Controller;

use OCA\LiveTracker\Service\BackendRegistry;
use OCA\LiveTracker\Service\TrackerData;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\Attribute\PublicPage;
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\AppFramework\Http\JSONResponse;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IURLGenerator;
use Psr\Log\LoggerInterface;

class PageController extends Controller
{
    public function __construct(
        IRequest $request,
        private TrackerData $data,
        private BackendRegistry $backends,
        private IConfig $configStore,
        private IURLGenerator $urls,
        private LoggerInterface $logger,
    ) {
        parent::__construct('live_tracker', $request);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function index(): TemplateResponse
    {
        $response = new TemplateResponse('live_tracker', 'main', [
            'config' => $this->urls->linkToRoute('live_tracker.page.config'),
            'routes' => $this->urls->linkToRoute('live_tracker.page.routes'),
            'trackers' => $this->urls->linkToRoute('live_tracker.page.trackers'),
            'request' => $this->urls->linkToRoute('live_tracker.page.request'),
            'worker' => $this->urls->linkTo('live_tracker', 'js/maplibre-gl-worker.js'),
            'stylesheet' => $this->urls->linkTo('live_tracker', 'js/index.css') . '?v=' . substr(hash_file('sha256', __DIR__ . '/../../js/index.css'), 0, 12),
        ]);
        $policy = new ContentSecurityPolicy();
        foreach (['https://demotiles.maplibre.org', 'https://api.maptiler.com'] as $domain) {
            $policy->addAllowedConnectDomain($domain);
            $policy->addAllowedImageDomain($domain);
            $policy->addAllowedFontDomain($domain);
        }
        $policy->addAllowedWorkerSrcDomain("'self'");
        $policy->addAllowedWorkerSrcDomain('blob:');
        $response->setContentSecurityPolicy($policy);
        return $response;
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function config(): JSONResponse
    {
        return new JSONResponse(['apiKey' => $this->configStore->getAppValue('live_tracker', 'maptiler_key', '')]);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function trackers(): JSONResponse
    {
        return new JSONResponse($this->data->read('trackers'));
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function routes(): JSONResponse
    {
        return new JSONResponse($this->data->read('routes'));
    }

    #[NoAdminRequired]
    public function request(): JSONResponse
    {
        try {
            $tracker = $this->request->getParam('tracker');
            if (!is_string($tracker) || trim($tracker) === '') {
                throw new \InvalidArgumentException('Tracker name is required');
            }
            $this->backends->active()->request(trim($tracker));
            return new JSONResponse(['status' => 'ok']);
        } catch (\InvalidArgumentException $error) {
            return new JSONResponse(['error' => $error->getMessage()], 400);
        } catch (\Throwable $error) {
            $this->logger->error('Live Tracker position request failed', [
                'backend' => $this->backends->activeId(),
                'exception' => $error,
            ]);
            return new JSONResponse([
                'error' => 'Could not request tracker position. Check the Nextcloud log.',
            ], 502);
        }
    }

    #[PublicPage]
    #[NoCSRFRequired]
    public function receive(string $backend, string $token): JSONResponse
    {
        $expected = $this->configStore->getAppValue('live_tracker', 'backend.' . $backend . '.webhook_token', '');
        if ($expected === '' || !hash_equals($expected, $token)) {
            $this->logger->warning('Live Tracker rejected a webhook with an invalid token', [
                'backend' => $backend,
            ]);
            return new JSONResponse(['error' => 'Not found'], 404);
        }
        try {
            if ($backend !== $this->backends->activeId()) {
                $this->logger->warning('Live Tracker rejected a webhook for an inactive backend', [
                    'backend' => $backend,
                    'active_backend' => $this->backends->activeId(),
                ]);
                return new JSONResponse(['error' => 'Backend not active'], 409);
            }
            $this->request->throwDecodingExceptionIfAny();
            $event = $this->request->getParams();
            if (!isset($event['event']) || !is_string($event['event'])) {
                throw new \InvalidArgumentException('Invalid event');
            }
            $this->backends->get($backend)->receive($event);
            return new JSONResponse(['status' => 'ok']);
        } catch (\JsonException | \InvalidArgumentException $error) {
            $this->logger->warning('Live Tracker rejected an invalid webhook', [
                'backend' => $backend,
                'exception' => $error,
            ]);
            return new JSONResponse(['error' => 'Invalid SMS event'], 400);
        } catch (\Throwable $error) {
            $this->logger->error('Live Tracker webhook processing failed', [
                'backend' => $backend,
                'exception' => $error,
            ]);
            return new JSONResponse(['error' => 'Webhook processing failed. Check the Nextcloud log.'], 500);
        }
    }

    public function save(): JSONResponse
    {
        try {
            $backend = $this->request->getParam('backend', $this->backends->activeId());
            $this->backends->get($backend);
            $collections = [];
            foreach (['trackers', 'routes'] as $name) {
                $value = $this->request->getParam($name, '');
                if ($value !== '') {
                    if (!is_string($value)) {
                        throw new \InvalidArgumentException('Expected a GeoJSON FeatureCollection');
                    }
                    $collection = json_decode($value, true, 512, JSON_THROW_ON_ERROR);
                    if (!is_array($collection)) {
                        throw new \InvalidArgumentException('Expected a GeoJSON FeatureCollection');
                    }
                    $this->data->validate($name, $collection);
                    $collections[$name] = $collection;
                }
            }
            foreach ($collections as $name => $collection) {
                $this->data->save($name, $collection);
            }
            $this->configStore->setAppValue('live_tracker', 'backend.active', $backend);
            foreach ($this->backends->get($backend)->settings() as $key => $field) {
                $value = $this->request->getParam($key, null);
                if (is_string($value) && $value !== '') {
                    $this->configStore->setAppValue('live_tracker', 'backend.' . $backend . '.' . $key, $value);
                }
            }
            $mapKey = $this->request->getParam('maptiler_key', null);
            if (is_string($mapKey)) {
                $this->configStore->setAppValue('live_tracker', 'maptiler_key', $mapKey);
            }
            return new JSONResponse(['status' => 'saved']);
        } catch (\JsonException | \InvalidArgumentException $error) {
            $this->logger->warning('Live Tracker settings or GeoJSON import was rejected', [
                'exception' => $error,
            ]);
            return new JSONResponse(['error' => $error->getMessage()], 400);
        } catch (\Throwable $error) {
            $this->logger->error('Live Tracker settings could not be saved', ['exception' => $error]);
            return new JSONResponse(['error' => 'Settings could not be saved. Check the Nextcloud log.'], 500);
        }
    }
}