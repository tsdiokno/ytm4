<?php
require_once __DIR__ . '/common.php';

$method = $_SERVER['REQUEST_METHOD'];
$playlist = read_json_locked(PLAYLIST_FILE, [
    'queue' => [],
    'history' => [],
    'settings' => ['allowGuestDelete' => true]
]);

if ($method === 'POST') {
    $input = get_json_input();
    
    $id = trim($input['id'] ?? '');
    $url = trim($input['url'] ?? '');
    $title = trim($input['title'] ?? 'YouTube Track');
    $author = trim($input['author'] ?? 'YouTube Creator');
    $thumbnail = trim($input['thumbnail'] ?? "https://i.ytimg.com/vi/{$id}/hqdefault.jpg");
    $duration = intval($input['duration'] ?? 180);
    $addedBy = trim($input['addedBy'] ?? 'Guest');
    $playImmediately = !empty($input['playImmediately']) && verify_host_auth();

    if (empty($id)) {
        json_response(['error' => 'Invalid YouTube track ID'], 400);
    }

    $trackItem = [
        'id' => $id,
        'url' => $url,
        'title' => $title,
        'author' => $author,
        'thumbnail' => $thumbnail,
        'duration' => $duration > 0 ? $duration : 180,
        'addedBy' => $addedBy ?: 'Guest',
        'addedAt' => round(microtime(true) * 1000),
        'uid' => uniqid('track_', true)
    ];

    if ($playImmediately) {
        // Direct play on Host request
        $state = read_json_locked(STATE_FILE, []);
        if (!empty($state['currentTrack'])) {
            $playlist['history'] = array_slice(array_merge([$state['currentTrack']], $playlist['history'] ?? []), 0, 30);
        }
        $now = microtime(true);
        $state['currentTrack'] = $trackItem;
        $state['status'] = 'playing';
        $state['referenceTime'] = 0;
        $state['epochTimestamp'] = $now;
        $state['version'] = ($state['version'] ?? 0) + 1;
        $state['updatedAt'] = $now;

        write_json_locked(STATE_FILE, $state);
        write_json_locked(PLAYLIST_FILE, $playlist);

        json_response([
            'success' => true,
            'message' => 'Now playing track immediately',
            'track' => $trackItem,
            'state' => $state,
            'playlist' => $playlist
        ]);
    } else {
        // Append to queue
        $queue = $playlist['queue'] ?? [];
        $queue[] = $trackItem;
        $playlist['queue'] = $queue;

        // If currently idle with no track playing, automatically load this track
        $state = read_json_locked(STATE_FILE, []);
        $stateUpdated = false;
        if (empty($state['currentTrack']) || $state['status'] === 'idle') {
            $next = array_shift($playlist['queue']);
            $state['currentTrack'] = $next;
            $state['status'] = 'playing';
            $state['referenceTime'] = 0;
            $now = microtime(true);
            $state['epochTimestamp'] = $now;
            $state['version'] = ($state['version'] ?? 0) + 1;
            $state['updatedAt'] = $now;
            $stateUpdated = true;
            write_json_locked(STATE_FILE, $state);
        }

        write_json_locked(PLAYLIST_FILE, $playlist);

        json_response([
            'success' => true,
            'track' => $trackItem,
            'queue' => $playlist['queue'],
            'state' => $stateUpdated ? $state : null
        ]);
    }
} elseif ($method === 'DELETE') {
    $uid = $_GET['uid'] ?? '';
    if (empty($uid)) {
        json_response(['error' => 'Missing track UID'], 400);
    }

    $isHost = verify_host_auth();
    $allowGuestDelete = $playlist['settings']['allowGuestDelete'] ?? true;

    if (!$isHost && !$allowGuestDelete) {
        json_response(['error' => 'Unauthorized: Only host can remove items from queue'], 403);
    }

    $queue = $playlist['queue'] ?? [];
    $filtered = array_values(array_filter($queue, function ($item) use ($uid) {
        return ($item['uid'] ?? '') !== $uid;
    }));

    $playlist['queue'] = $filtered;
    write_json_locked(PLAYLIST_FILE, $playlist);

    json_response(['success' => true, 'queue' => $filtered]);
} elseif ($method === 'PATCH') {
    // Reorder queue (Host only)
    if (!verify_host_auth()) {
        json_response(['error' => 'Unauthorized: Host credentials required'], 401);
    }

    $input = get_json_input();
    if (isset($input['queue']) && is_array($input['queue'])) {
        $playlist['queue'] = $input['queue'];
        write_json_locked(PLAYLIST_FILE, $playlist);
        json_response(['success' => true, 'queue' => $playlist['queue']]);
    } else {
        json_response(['error' => 'Invalid queue payload'], 400);
    }
} else {
    json_response(['error' => 'Method not allowed'], 405);
}
