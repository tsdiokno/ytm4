<?php
require_once __DIR__ . '/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed'], 405);
}

if (!verify_host_auth()) {
    json_response(['error' => 'Unauthorized: Host credentials required'], 401);
}

$state = read_json_locked(STATE_FILE, []);
$playlist = read_json_locked(PLAYLIST_FILE, [
    'queue' => [],
    'history' => []
]);

// Archive current track into history
if (!empty($state['currentTrack'])) {
    $history = $playlist['history'] ?? [];
    array_unshift($history, $state['currentTrack']);
    $playlist['history'] = array_slice($history, 0, 30);
}

$queue = $playlist['queue'] ?? [];
$now = microtime(true);

if (count($queue) > 0) {
    $nextTrack = array_shift($queue);
    $playlist['queue'] = $queue;

    $state['currentTrack'] = $nextTrack;
    $state['status'] = 'playing';
    $state['referenceTime'] = 0;
    $state['epochTimestamp'] = $now;
    $state['playbackRate'] = 1.0;
    $state['version'] = ($state['version'] ?? 0) + 1;
    $state['updatedAt'] = $now;
} else {
    $state['currentTrack'] = null;
    $state['status'] = 'idle';
    $state['referenceTime'] = 0;
    $state['epochTimestamp'] = $now;
    $state['version'] = ($state['version'] ?? 0) + 1;
    $state['updatedAt'] = $now;
}

write_json_locked(STATE_FILE, $state);
write_json_locked(PLAYLIST_FILE, $playlist);

json_response([
    'success' => true,
    'state' => $state,
    'playlist' => $playlist,
    'serverTime' => $now
]);
