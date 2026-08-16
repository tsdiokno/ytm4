<?php
require_once __DIR__ . '/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed'], 405);
}

$input = get_json_input();
$password = $input['password'] ?? '';

if (empty($password)) {
    json_response(['error' => 'Password is required'], 400);
}

$playlist = read_json_locked(PLAYLIST_FILE, []);
$expectedHash = $playlist['settings']['hostPasswordHash'] ?? DEFAULT_HOST_PASS_HASH;
$providedHash = hash('sha256', $password);

if (hash_equals($expectedHash, $providedHash)) {
    json_response([
        'success' => true,
        'token' => $providedHash,
        'message' => 'Host mode authenticated successfully'
    ]);
} else {
    json_response([
        'error' => 'Incorrect host password'
    ], 401);
}
