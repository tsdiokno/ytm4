<?php
require_once __DIR__ . '/common.php';

$state = read_json_locked(STATE_FILE, [
    'status' => 'idle',
    'currentTrack' => null,
    'referenceTime' => 0,
    'epochTimestamp' => time(),
    'playbackRate' => 1.0,
    'version' => 1,
    'updatedAt' => time()
]);

$playlist = read_json_locked(PLAYLIST_FILE, [
    'queue' => [],
    'history' => [],
    'settings' => [
        'roomName' => 'Crowd-Q Lounge',
        'allowGuestDelete' => true
    ]
]);

// Strip private hashes from settings
$safeSettings = $playlist['settings'] ?? [];
unset($safeSettings['hostPasswordHash']);

$responsePayload = [
    'serverTime' => microtime(true),
    'state' => $state,
    'playlist' => [
        'queue' => $playlist['queue'] ?? [],
        'history' => $playlist['history'] ?? [],
        'settings' => $safeSettings
    ]
];

$etag = md5(($state['version'] ?? '1') . '-' . ($state['updatedAt'] ?? '0') . '-' . count($playlist['queue'] ?? []));
header('ETag: "' . $etag . '"');

if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH'], '"') === $etag) {
    http_response_code(304);
    exit;
}

json_response($responsePayload);
