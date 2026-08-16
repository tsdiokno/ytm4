<?php
declare(strict_types=1);

namespace CrowdQ\Http\Controllers;

use CrowdQ\DTO\PlaybackStateDTO;
use CrowdQ\Storage\JsonRepository;

class PlaybackController
{
    public function __construct(private JsonRepository $repo) {}

    public function updateState(): void
    {
        $input = json_decode(file_get_contents('php://input') ?: '{}', true);
        if (!is_array($input)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON']);
            return;
        }

        $state = $this->repo->getState();
        $now = time();

        $status = isset($input['status']) && in_array($input['status'], ['playing', 'paused', 'idle'], true)
            ? $input['status']
            : $state->status;

        $currentTime = isset($input['currentTime']) 
            ? (float)$input['currentTime'] 
            : (isset($input['referenceTime']) ? (float)$input['referenceTime'] : $state->currentTime);

        $newState = new PlaybackStateDTO(
            version: $state->version + 1,
            status: $status,
            currentTrack: $state->currentTrack,
            currentTime: max(0.0, $currentTime),
            updatedAt: $now
        );

        $this->repo->saveState($newState);

        echo json_encode([
            'success' => true,
            'state' => $newState->jsonSerialize(),
        ]);
    }
}
