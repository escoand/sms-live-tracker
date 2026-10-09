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

namespace OCP {
    interface IRequest
    {
        public function getParams();
        public function throwDecodingExceptionIfAny();
    }

    interface IConfig
    {
        public function getAppValue($app, $key, $default = '');
    }

    interface IURLGenerator
    {
    }
}

namespace OCP\AppFramework {
    class Controller
    {
        protected \OCP\IRequest $request;

        public function __construct(string $appName, \OCP\IRequest $request)
        {
            $this->request = $request;
        }
    }
}

namespace OCP\AppFramework\Http {
    class JSONResponse
    {
        public function __construct(public array $data = [], public int $status = 200)
        {
        }
    }
}

namespace OCP\AppFramework\Http\Attribute {
    #[\Attribute(\Attribute::TARGET_METHOD)]
    class NoAdminRequired
    {
    }

    #[\Attribute(\Attribute::TARGET_METHOD)]
    class NoCSRFRequired
    {
    }

    #[\Attribute(\Attribute::TARGET_METHOD)]
    class PublicPage
    {
    }
}

namespace {
    use OCA\LiveTracker\Controller\PageController;
    use OCA\LiveTracker\Service\BackendRegistry;
    use OCA\LiveTracker\Service\TrackerBackend;
    use OCA\LiveTracker\Service\TrackerData;
    use OCP\IConfig;
    use OCP\IRequest;
    use OCP\IURLGenerator;
    use Psr\Log\LoggerInterface;

    require_once __DIR__ . '/../lib/Service/TrackerBackend.php';
    require_once __DIR__ . '/../lib/Service/TrackerData.php';
    require_once __DIR__ . '/../lib/Service/BackendRegistry.php';
    require_once __DIR__ . '/../lib/Controller/PageController.php';

    class TestWebhookRequest implements IRequest
    {
        public function __construct(public array $params = [], public bool $malformed = false)
        {
        }

        public function getParams()
        {
            return $this->params;
        }

        public function throwDecodingExceptionIfAny()
        {
            if ($this->malformed) {
                throw new JsonException('Malformed JSON');
            }
        }
    }

    class TestWebhookConfig implements IConfig
    {
        public function getAppValue($app, $key, $default = '')
        {
            return $app === 'live_tracker' && $key === 'backend.sms_gate.webhook_token'
                ? 'synthetic-token'
                : $default;
        }
    }

    class TestWebhookLogger implements LoggerInterface
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

    class TestWebhookBackend implements TrackerBackend
    {
        public array $received = [];

        public function __construct(private bool $rejectEvents = false)
        {
        }

        public function settings(): array
        {
            return [];
        }

        public function request(string $name): void
        {
        }

        public function receive(array $event): void
        {
            if ($this->rejectEvents) {
                throw new InvalidArgumentException('Invalid SMS event');
            }
            $this->received[] = $event;
        }
    }

    class TestWebhookRegistry extends BackendRegistry
    {
        public function __construct(private TrackerBackend $backend, private string $activeBackend)
        {
        }

        public function activeId(): string
        {
            return $this->activeBackend;
        }

        public function get(string $id): TrackerBackend
        {
            if ($id !== 'sms_gate') {
                throw new InvalidArgumentException('Unknown tracker backend');
            }
            return $this->backend;
        }
    }

    function checkResponse(bool $condition, string $message): void
    {
        if (!$condition) {
            throw new RuntimeException($message);
        }
    }

    function controllerForWebhook(
        string $activeBackend = 'sms_gate',
        bool $malformed = false,
        bool $rejectEvents = false,
    ): array {
        $request = new TestWebhookRequest([
            'event' => 'sms:received',
            'payload' => ['sender' => '+15551234567'],
        ], $malformed);
        $backend = new TestWebhookBackend($rejectEvents);
        $registry = new TestWebhookRegistry($backend, $activeBackend);
        $data = (new ReflectionClass(TrackerData::class))->newInstanceWithoutConstructor();
        $controller = new PageController(
            $request,
            $data,
            $registry,
            new TestWebhookConfig(),
            new class implements IURLGenerator {},
            new TestWebhookLogger(),
        );
        return [$controller, $backend, $request];
    }

    [$controller, $backend] = controllerForWebhook();
    $response = $controller->receive('sms_gate', 'wrong-token');
    checkResponse($response->status === 404, 'invalid webhook token must return 404');
    checkResponse($backend->received === [], 'invalid token must not reach the backend');

    [$controller] = controllerForWebhook('another_backend');
    $response = $controller->receive('sms_gate', 'synthetic-token');
    checkResponse($response->status === 409, 'inactive backend webhook must return 409');

    [$controller] = controllerForWebhook('sms_gate', true);
    $response = $controller->receive('sms_gate', 'synthetic-token');
    checkResponse($response->status === 400, 'malformed JSON must return 400');

    [$controller, $backend] = controllerForWebhook();
    $response = $controller->receive('sms_gate', 'synthetic-token');
    checkResponse($response->status === 200, 'valid webhook must return 200');
    checkResponse(count($backend->received) === 1, 'valid webhook must reach the backend once');

    [$controller] = controllerForWebhook('sms_gate', false, true);
    $response = $controller->receive('sms_gate', 'synthetic-token');
    checkResponse($response->status === 400, 'backend validation failure must return 400');

    echo "Webhook controller validation passed\n";
}