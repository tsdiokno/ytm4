<?php
declare(strict_types=1);

namespace CrowdQ\Http\Controllers;

use CrowdQ\Storage\JsonRepository;

class AuthController
{
    public function __construct(private JsonRepository $repo) {}

    public function login(): void
    {
        $input = json_decode(file_get_contents('php://input') ?: '{}', true);
        $password = (string)($input['password'] ?? '');

        $playlist = $this->repo->getPlaylist();
        $settings = $playlist->settings;

        if (empty($settings['isPasswordProtected'])) {
            $token = bin2hex(random_bytes(16));
            echo json_encode(['success' => true, 'token' => $token]);
            return;
        }

        $expectedHash = $settings['hostPasswordHash'] ?? '';
        if (password_verify($password, (string)$expectedHash)) {
            $token = bin2hex(random_bytes(16));
            echo json_encode(['success' => true, 'token' => $token]);
            return;
        }

        http_response_code(401);
        echo json_encode(['error' => 'Incorrect host password']);
    }
}
