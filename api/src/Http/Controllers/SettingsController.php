<?php
declare(strict_types=1);

namespace CrowdQ\Http\Controllers;

use CrowdQ\Storage\JsonRepository;

class SettingsController
{
    public function __construct(private JsonRepository $repo) {}

    public function update(): void
    {
        $input = json_decode(file_get_contents('php://input') ?: '{}', true);
        if (!is_array($input)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid settings JSON']);
            return;
        }

        $playlist = $this->repo->getPlaylist();
        $settings = $playlist->settings;

        if (isset($input['roomName'])) {
            $settings['roomName'] = trim((string)$input['roomName']);
        }
        if (isset($input['maxQueueLength'])) {
            $settings['maxQueueLength'] = max(5, min(200, (int)$input['maxQueueLength']));
        }
        if (isset($input['maxUserSongsInQueue'])) {
            $settings['maxUserSongsInQueue'] = max(1, min(20, (int)$input['maxUserSongsInQueue']));
        }
        if (isset($input['password']) && $input['password'] !== '') {
            $settings['isPasswordProtected'] = true;
            $settings['hostPasswordHash'] = password_hash((string)$input['password'], PASSWORD_DEFAULT);
        } elseif (isset($input['isPasswordProtected']) && $input['isPasswordProtected'] === false) {
            $settings['isPasswordProtected'] = false;
            unset($settings['hostPasswordHash']);
        }

        $newPlaylist = new \CrowdQ\DTO\PlaylistDTO(
            queue: $playlist->queue,
            history: $playlist->history,
            settings: $settings
        );
        $this->repo->savePlaylist($newPlaylist);

        echo json_encode([
            'success' => true,
            'settings' => $newPlaylist->jsonSerialize()['settings'],
        ]);
    }
}
