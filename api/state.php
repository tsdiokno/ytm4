<?php
require_once __DIR__ . '/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed'], 405);
}

if (!verify_host_auth()) {
    json_response(['error' => 'Unauthorized: Host credentials required'], 401);
}

$input = get_json_input();
$state = read_json_locked(STATE_FILE, []);

$now = microtime(true);

if (isset($input['status'])) {
    $state['status'] = in_array($input['status'], ['playing', 'paused', 'idle', 'buffering', 'ended']) ? $input['status'] : 'idle';
}

if (isset($input['referenceTime'])) {
    $state['referenceTime'] = max(0, floatval($input['referenceTime']));
}

if (isset($input['playbackRate'])) {
    $state['playbackRate'] = floatval($input['playbackRate']) > 0 ? floatval($input['playbackRate']) : 1.0;
}

if (isset($input['currentTrack'])) {
    $state['currentTrack'] = $input['currentTrack'];
}

$state['epochTimestamp'] = isset($input['epochTimestamp']) ? floatval($input['epochTimestamp']) : $now;
$state['version'] = ($state['version'] ?? 0) + 1;
$state['updatedAt'] = $now;

$saved = write_json_locked(STATE_FILE, $state);

if ($saved) {
    json_response([
        'success' => true,
        'state' => $state,
        'serverTime' => $now
    ]);
} else {
    json_response(['error' => 'Failed to persist state'], 500);
}
