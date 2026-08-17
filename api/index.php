<?php
declare(strict_types=1);

// Security & CORS headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, If-None-Match, Cache-Control');
header('Access-Control-Expose-Headers: ETag');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// -------------------------------------------------------------
// Storage Paths & Constants
// -------------------------------------------------------------
define('DATA_DIR', dirname(__DIR__) . '/data');
define('STATE_FILE', DATA_DIR . '/state.json');
define('PLAYLIST_FILE', DATA_DIR . '/playlist.json');
define('DEFAULT_PASSWORD_HASH', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'); // sha256("password")

// -------------------------------------------------------------
// Storage Helpers with Atomic Locking
// -------------------------------------------------------------
function read_json_locked(string $filePath, array $default = []): array
{
    if (!file_exists($filePath)) {
        write_json_locked($filePath, $default);
        return $default;
    }

    $fp = @fopen($filePath, 'r');
    if (!$fp) {
        return $default;
    }

    if (flock($fp, LOCK_SH)) {
        $contents = stream_get_contents($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        if ($contents === false || trim($contents) === '') {
            return $default;
        }
        $data = json_decode($contents, true);
        return is_array($data) ? $data : $default;
    }

    fclose($fp);
    return $default;
}

function write_json_locked(string $filePath, array $data): bool
{
    $dir = dirname($filePath);
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }

    $fp = @fopen($filePath, 'c+');
    if (!$fp) {
        return false;
    }

    if (flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        rewind($fp);
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        fwrite($fp, $json !== false ? $json : '{}');
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        return true;
    }

    fclose($fp);
    return false;
}

function get_state(): array
{
    return read_json_locked(STATE_FILE, [
        'status' => 'idle',
        'currentTrack' => null,
        'currentTime' => 0,
        'referenceTime' => 0,
        'epochTimestamp' => time(),
        'playbackRate' => 1.0,
        'version' => 1,
        'updatedAt' => time(),
    ]);
}

function get_playlist(): array
{
    return read_json_locked(PLAYLIST_FILE, [
        'queue' => [],
        'history' => [],
        'settings' => [
            'roomName' => 'Crowd-Q Lounge',
            'hostPasswordHash' => DEFAULT_PASSWORD_HASH,
            'allowGuestDelete' => true,
            'maxQueueSize' => 50,
        ],
    ]);
}

function get_json_body(): array
{
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function verify_host_auth(array $playlist): bool
{
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = trim($matches[1]);
        $expected = $playlist['settings']['hostPasswordHash'] ?? DEFAULT_PASSWORD_HASH;
        return hash_equals($expected, $token);
    }
    return false;
}

// -------------------------------------------------------------
// Request Routing
// -------------------------------------------------------------
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$rawUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

// Normalize path: strip .php and normalize subpaths
$path = rtrim($rawUri, '/');
$path = preg_replace('/\.php$/', '', $path) ?? $path;
$apiPos = strpos($path, '/api');
if ($apiPos !== false) {
    $path = substr($path, $apiPos);
}

try {
    switch ("{$method} {$path}") {
        // ---------------------------------------------------------
        // GET /api/sync
        // ---------------------------------------------------------
        case 'GET /api/sync':
            $state = get_state();
            $playlist = get_playlist();

            $safeSettings = $playlist['settings'] ?? [];
            unset($safeSettings['hostPasswordHash']);

            $queueUids = array_map(fn($t) => $t['uid'] ?? '', $playlist['queue'] ?? []);
            $etag = '"' . md5(($state['version'] ?? 1) . '-' . ($state['updatedAt'] ?? 0) . '-' . implode(',', $queueUids)) . '"';

            header('ETag: ' . $etag);
            header('Cache-Control: private, no-cache, no-transform');

            if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
                http_response_code(304);
                exit;
            }

            echo json_encode([
                'state' => $state,
                'playlist' => [
                    'queue' => $playlist['queue'] ?? [],
                    'history' => $playlist['history'] ?? [],
                    'settings' => $safeSettings,
                ],
                'timestamp' => time(),
            ], JSON_UNESCAPED_SLASHES);
            break;

        // ---------------------------------------------------------
        // POST /api/auth
        // ---------------------------------------------------------
        case 'POST /api/auth':
            $body = get_json_body();
            $password = (string)($body['password'] ?? '');

            if ($password === '') {
                http_response_code(400);
                echo json_encode(['error' => 'Password is required']);
                exit;
            }

            $playlist = get_playlist();
            $expectedHash = $playlist['settings']['hostPasswordHash'] ?? DEFAULT_PASSWORD_HASH;
            $providedHash = hash('sha256', $password);

            if (hash_equals($expectedHash, $providedHash)) {
                echo json_encode([
                    'success' => true,
                    'token' => $providedHash,
                    'message' => 'Host mode authenticated successfully',
                ]);
            } else {
                http_response_code(401);
                echo json_encode(['error' => 'Incorrect host password']);
            }
            break;

        // ---------------------------------------------------------
        // POST /api/state (Host only)
        // ---------------------------------------------------------
        case 'POST /api/state':
            $playlist = get_playlist();
            if (!verify_host_auth($playlist)) {
                http_response_code(401);
                echo json_encode(['error' => 'Unauthorized: Host credentials required']);
                exit;
            }

            $input = get_json_body();
            $state = get_state();
            $now = time();

            if (!empty($input['status']) && in_array($input['status'], ['playing', 'paused', 'idle', 'buffering', 'ended'], true)) {
                $state['status'] = $input['status'];
            }
            if (isset($input['currentTime']) && is_numeric($input['currentTime'])) {
                $state['currentTime'] = max(0, (float)$input['currentTime']);
                $state['referenceTime'] = $state['currentTime'];
                $state['epochTimestamp'] = $now;
                $state['playbackRate'] = 1.0;
            } elseif (isset($input['referenceTime']) && is_numeric($input['referenceTime'])) {
                $state['currentTime'] = max(0, (float)$input['referenceTime']);
                $state['referenceTime'] = $state['currentTime'];
                $state['epochTimestamp'] = $now;
                $state['playbackRate'] = 1.0;
            }
            if (array_key_exists('currentTrack', $input)) {
                $state['currentTrack'] = $input['currentTrack'];
            }

            $state['version'] = ($state['version'] ?? 0) + 1;
            $state['updatedAt'] = $now;

            write_json_locked(STATE_FILE, $state);

            echo json_encode(['success' => true, 'state' => $state]);
            break;

        // ---------------------------------------------------------
        // POST /api/queue (Add Track)
        // ---------------------------------------------------------
        case 'POST /api/queue':
            $input = get_json_body();
            $rawTrack = isset($input['track']) && is_array($input['track']) ? $input['track'] : $input;
            $id = trim((string)($rawTrack['id'] ?? ''));

            if ($id === '') {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid YouTube track ID']);
                exit;
            }

            $playlist = get_playlist();
            $maxQueue = (int)($playlist['settings']['maxQueueSize'] ?? 50);

            if (count($playlist['queue'] ?? []) >= $maxQueue) {
                http_response_code(400);
                echo json_encode(['error' => "Queue is full (maximum {$maxQueue} tracks)"]);
                exit;
            }

            $trackItem = [
                'id' => $id,
                'url' => (string)($rawTrack['url'] ?? "https://www.youtube.com/watch?v={$id}"),
                'title' => (string)($rawTrack['title'] ?? 'YouTube Track'),
                'author' => (string)($rawTrack['author'] ?? $rawTrack['artist'] ?? 'YouTube Creator'),
                'thumbnail' => (string)($rawTrack['thumbnail'] ?? "https://i.ytimg.com/vi/{$id}/hqdefault.jpg"),
                'duration' => (int)($rawTrack['duration'] ?? 180) > 0 ? (int)$rawTrack['duration'] : 180,
                'addedBy' => (string)($rawTrack['addedBy'] ?? 'Guest'),
                'addedAt' => (int)round(microtime(true) * 1000),
                'uid' => 'track_' . time() . '_' . bin2hex(random_bytes(3)),
            ];

            // Host immediate play shortcut
            if (!empty($rawTrack['playImmediately']) && verify_host_auth($playlist)) {
                $state = get_state();
                if (!empty($state['currentTrack'])) {
                    array_unshift($playlist['history'], $state['currentTrack']);
                    $playlist['history'] = array_slice($playlist['history'], 0, 30);
                }

                $state['currentTrack'] = $trackItem;
                $state['status'] = 'playing';
                $state['currentTime'] = 0;
                $state['referenceTime'] = 0;
                $state['epochTimestamp'] = time();
                $state['playbackRate'] = 1.0;
                $state['version'] = ($state['version'] ?? 0) + 1;
                $state['updatedAt'] = time();

                write_json_locked(STATE_FILE, $state);
                write_json_locked(PLAYLIST_FILE, $playlist);

                echo json_encode([
                    'success' => true,
                    'message' => 'Playing immediately',
                    'track' => $trackItem,
                    'state' => $state,
                    'playlist' => $playlist,
                ]);
                exit;
            }

            $playlist['queue'][] = $trackItem;
            write_json_locked(PLAYLIST_FILE, $playlist);

            echo json_encode([
                'success' => true,
                'track' => $trackItem,
                'queue' => $playlist['queue'],
            ]);
            break;

        // ---------------------------------------------------------
        // DELETE /api/queue (Remove Track)
        // ---------------------------------------------------------
        case 'DELETE /api/queue':
            $input = get_json_body();
            $uid = (string)($input['uid'] ?? $_GET['uid'] ?? '');

            if ($uid === '') {
                http_response_code(400);
                echo json_encode(['error' => 'Missing track UID']);
                exit;
            }

            $playlist = get_playlist();
            $isHost = verify_host_auth($playlist);
            $allowGuestDelete = $playlist['settings']['allowGuestDelete'] ?? true;

            if (!$isHost && !$allowGuestDelete) {
                http_response_code(403);
                echo json_encode(['error' => 'Unauthorized: Only host can remove items from queue']);
                exit;
            }

            $playlist['queue'] = array_values(array_filter(
                $playlist['queue'] ?? [],
                fn($item) => ($item['uid'] ?? '') !== $uid
            ));

            write_json_locked(PLAYLIST_FILE, $playlist);

            echo json_encode(['success' => true, 'queue' => $playlist['queue']]);
            break;

        // ---------------------------------------------------------
        // PATCH /api/queue (Reorder Queue, Host only)
        // ---------------------------------------------------------
        case 'PATCH /api/queue':
            $playlist = get_playlist();
            if (!verify_host_auth($playlist)) {
                http_response_code(401);
                echo json_encode(['error' => 'Unauthorized: Host credentials required']);
                exit;
            }

            $input = get_json_body();
            if (!isset($input['queue']) || !is_array($input['queue'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid queue payload']);
                exit;
            }

            $playlist['queue'] = array_values($input['queue']);
            write_json_locked(PLAYLIST_FILE, $playlist);

            echo json_encode(['success' => true, 'queue' => $playlist['queue']]);
            break;

        // ---------------------------------------------------------
        // POST /api/skip (Skip Track, Host only)
        // ---------------------------------------------------------
        case 'POST /api/skip':
            $playlist = get_playlist();
            if (!verify_host_auth($playlist)) {
                http_response_code(401);
                echo json_encode(['error' => 'Unauthorized: Host credentials required']);
                exit;
            }

            $state = get_state();
            if (!empty($state['currentTrack'])) {
                array_unshift($playlist['history'], $state['currentTrack']);
                $playlist['history'] = array_slice($playlist['history'], 0, 30);
            }

            $queue = $playlist['queue'] ?? [];
            $now = time();

            if (!empty($queue)) {
                $nextTrack = array_shift($queue);
                $playlist['queue'] = $queue;
                $state['currentTrack'] = $nextTrack;
                $state['status'] = 'playing';
                $state['currentTime'] = 0;
                $state['referenceTime'] = 0;
                $state['epochTimestamp'] = $now;
                $state['playbackRate'] = 1.0;
            } else {
                $playlist['queue'] = [];
                $state['currentTrack'] = null;
                $state['status'] = 'idle';
                $state['currentTime'] = 0;
                $state['referenceTime'] = 0;
                $state['epochTimestamp'] = $now;
                $state['playbackRate'] = 1.0;
            }

            $state['version'] = ($state['version'] ?? 0) + 1;
            $state['updatedAt'] = $now;

            write_json_locked(STATE_FILE, $state);
            write_json_locked(PLAYLIST_FILE, $playlist);

            echo json_encode([
                'success' => true,
                'state' => $state,
                'playlist' => $playlist,
            ]);
            break;

        // ---------------------------------------------------------
        // GET /api/oembed (YouTube metadata proxy)
        // ---------------------------------------------------------
        case 'GET /api/oembed':
            $videoUrl = (string)($_GET['url'] ?? '');
            if ($videoUrl === '' && !empty($_GET['id'])) {
                $videoUrl = 'https://www.youtube.com/watch?v=' . urlencode((string)$_GET['id']);
            }

            if ($videoUrl === '') {
                http_response_code(400);
                echo json_encode(['error' => 'URL or video ID parameter is required']);
                exit;
            }

            $targetUrl = 'https://www.youtube.com/oembed?url=' . urlencode($videoUrl) . '&format=json';
            $context = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'header' => "User-Agent: Crowd-Q/1.0\r\n",
                    'timeout' => 5,
                ],
            ]);

            $res = @file_get_contents($targetUrl, false, $context);
            if ($res !== false) {
                echo $res;
            } else {
                echo json_encode([
                    'title' => 'YouTube Video',
                    'author_name' => 'YouTube Creator',
                    'thumbnail_url' => '',
                ]);
            }
            break;

        // ---------------------------------------------------------
        // POST /api/settings (Host only)
        // ---------------------------------------------------------
        case 'POST /api/settings':
            $playlist = get_playlist();
            if (!verify_host_auth($playlist)) {
                http_response_code(401);
                echo json_encode(['error' => 'Unauthorized: Host credentials required']);
                exit;
            }

            $input = get_json_body();
            $settings = $playlist['settings'] ?? [];

            if (isset($input['roomName']) && is_string($input['roomName'])) {
                $settings['roomName'] = trim($input['roomName']);
            }
            if (isset($input['maxQueueSize']) && is_numeric($input['maxQueueSize'])) {
                $settings['maxQueueSize'] = max(5, min(200, (int)$input['maxQueueSize']));
            }
            if (isset($input['allowGuestDelete']) && is_bool($input['allowGuestDelete'])) {
                $settings['allowGuestDelete'] = $input['allowGuestDelete'];
            }
            if (!empty($input['password'])) {
                $settings['hostPasswordHash'] = hash('sha256', (string)$input['password']);
            }

            $playlist['settings'] = $settings;
            write_json_locked(PLAYLIST_FILE, $playlist);

            $safeSettings = $settings;
            unset($safeSettings['hostPasswordHash']);

            echo json_encode(['success' => true, 'settings' => $safeSettings]);
            break;

        // ---------------------------------------------------------
        // 404 Fallback
        // ---------------------------------------------------------
        default:
            http_response_code(404);
            echo json_encode([
                'error' => 'Endpoint not found',
                'method' => $method,
                'path' => $path,
            ]);
            break;
    }
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal Server Error',
        'message' => $e->getMessage(),
    ]);
}