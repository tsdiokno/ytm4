<?php

declare(strict_types=1);

if (file_exists(dirname(__DIR__) . '/vendor/autoload.php')) {
    require_once dirname(__DIR__) . '/vendor/autoload.php';
} else {
    spl_autoload_register(function ($class) {
        $prefix = 'CrowdQ\\';
        $baseDir = dirname(__DIR__) . '/src/php/';
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

use CrowdQ\QueueService;
use CrowdQ\PlaybackService;
use CrowdQ\ConfigService;
use CrowdQ\Response;

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    Response::json(['status' => 'ok']);
}

$queueService = new QueueService();
$playbackService = new PlaybackService($queueService);
$configService = new ConfigService();

$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Clean URI path (e.g. /api/queue -> queue)
$path = trim(preg_replace('#^/api/?#', '', $requestUri), '/');

switch ($path) {
    case 'state':
        if ($method === 'GET') {
            Response::json($queueService->getState());
        } else {
            Response::error("Method {$method} not allowed", 405);
        }
        break;

    case 'playback':
        if ($method === 'GET') {
            Response::json($playbackService->getPlayback());
        } elseif ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $currentVideoId = isset($input['currentVideoId']) ? (string)$input['currentVideoId'] : null;
            $isPlaying = !empty($input['isPlaying']);
            $elapsedMs = isset($input['elapsedMs']) ? (int)$input['elapsedMs'] : 0;

            $newState = $playbackService->updatePlayback($currentVideoId, $isPlaying, $elapsedMs);
            Response::success($newState, 'Playback state updated');
        } else {
            Response::error("Method {$method} not allowed", 405);
        }
        break;

    case 'playback/sync':
        if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $elapsedMs = isset($input['elapsedMs']) ? (int)$input['elapsedMs'] : 0;
            $newState = $playbackService->syncElapsed($elapsedMs);
            Response::success($newState, 'Playback position synced');
        } else {
            Response::error("Method {$method} not allowed", 405);
        }
        break;

    case '':
    case 'queue':
        if ($method === 'GET') {
            Response::json($queueService->getQueue());
        } elseif ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            if (isset($input['queue']) && is_array($input['queue'])) {
                $queueService->saveQueue($input['queue']);
                Response::success($queueService->getQueue(), 'Queue replaced successfully');
            } elseif (isset($input['song']) && is_array($input['song'])) {
                $result = $queueService->addSong($input['song']);
                if ($result['added']) {
                    Response::success($result['queue'], $result['message']);
                } else {
                    Response::error($result['message'], 409, ['queue' => $result['queue']]);
                }
            } else {
                Response::error('Invalid payload format. Expected { queue: [...] } or { song: {...} }');
            }
        } elseif ($method === 'DELETE') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $index = isset($input['index']) ? (int)$input['index'] : null;
            $result = $queueService->removeSong($index);
            Response::success($result['queue'], 'Song removed');
        } else {
            Response::error("Method {$method} not allowed", 405);
        }
        break;

    case 'queue/next':
        if ($method === 'POST') {
            $result = $queueService->removeSong(0);
            Response::success($result['queue'], 'Advanced to next song');
        } else {
            Response::error('Method not allowed', 405);
        }
        break;

    case 'queue/clear':
        if ($method === 'POST') {
            $result = $queueService->clearQueue();
            Response::success($result['queue'], 'Queue cleared');
        } else {
            Response::error('Method not allowed', 405);
        }
        break;

    case 'config':
        if ($method === 'GET') {
            Response::json($configService->getPublicConfig());
        } else {
            Response::error('Method not allowed', 405);
        }
        break;

    case 'get_queue.php':
        Response::json($queueService->getQueue());
        break;

    case 'save_queue.php':
        $data = json_decode(file_get_contents('php://input'), true);
        $queue = $data['queue'] ?? [];
        $queueService->saveQueue($queue);
        Response::json(['success' => true]);
        break;

    default:
        Response::error('Endpoint not found', 404);
        break;
}
