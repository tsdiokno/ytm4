<?php
declare(strict_types=1);

// PSR-4 Autoloader implementation (Zero-dependency fallback if vendor/autoload.php not generated)
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
} else {
    spl_autoload_register(function (string $class) {
        $prefix = 'CrowdQ\\';
        $baseDir = __DIR__ . '/src/';
        $len = strlen($prefix);
        if (strncmp($prefix, $class, $len) !== 0) {
            return;
        }
        $relativeClass = substr($class, $len);
        $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
        if (file_exists($file)) {
            require $file;
        }
    });
}

use CrowdQ\Http\Router;
use CrowdQ\Http\Controllers\SyncController;
use CrowdQ\Http\Controllers\QueueController;
use CrowdQ\Http\Controllers\PlaybackController;
use CrowdQ\Http\Controllers\AuthController;
use CrowdQ\Http\Controllers\OembedController;
use CrowdQ\Http\Controllers\SettingsController;
use CrowdQ\Storage\JsonRepository;

// Security & CORS headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Host-Token, If-None-Match, Cache-Control');
header('Access-Control-Expose-Headers: ETag');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $repo = new JsonRepository();
    $router = new Router();

    $syncCtrl = new SyncController($repo);
    $queueCtrl = new QueueController($repo);
    $playbackCtrl = new PlaybackController($repo);
    $authCtrl = new AuthController($repo);
    $oembedCtrl = new OembedController();
    $settingsCtrl = new SettingsController($repo);

    // Routes
    $router->get('/api/sync', [$syncCtrl, 'handle']);
    $router->post('/api/queue', [$queueCtrl, 'add']);
    $router->delete('/api/queue', [$queueCtrl, 'remove']);
    $router->patch('/api/queue', [$queueCtrl, 'reorder']);
    $router->post('/api/skip', [$queueCtrl, 'skip']);
    $router->post('/api/state', [$playbackCtrl, 'updateState']);
    $router->post('/api/auth', [$authCtrl, 'login']);
    $router->get('/api/oembed', [$oembedCtrl, 'fetch']);
    $router->post('/api/settings', [$settingsCtrl, 'update']);

    $router->dispatch();
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal Server Error',
        'message' => $e->getMessage(),
    ]);
}
