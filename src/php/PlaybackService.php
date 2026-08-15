<?php

declare(strict_types=1);

namespace CrowdQ;

class PlaybackService
{
    private QueueService $queueService;

    public function __construct(?QueueService $queueService = null)
    {
        $this->queueService = $queueService ?? new QueueService();
    }

    /**
     * Get playback state or full state document.
     */
    public function getPlayback(): array
    {
        $state = $this->queueService->getState();
        return $state['playback'];
    }

    /**
     * Update playback state atomically.
     *
     * @param string|null $currentVideoId
     * @param bool $isPlaying
     * @param int $elapsedMs
     */
    public function updatePlayback(?string $currentVideoId, bool $isPlaying, int $elapsedMs): array
    {
        $state = $this->queueService->getState();
        $nowMs = (int)round(microtime(true) * 1000);

        $state['playback'] = [
            'currentVideoId' => $currentVideoId,
            'isPlaying' => $isPlaying,
            'elapsedMs' => max(0, $elapsedMs),
            'updatedAt' => $nowMs,
        ];

        $this->queueService->saveState($state);

        return $state;
    }

    /**
     * Update only elapsed position timestamp (periodic ping from host).
     */
    public function syncElapsed(int $elapsedMs): array
    {
        $state = $this->queueService->getState();
        $nowMs = (int)round(microtime(true) * 1000);

        $state['playback']['elapsedMs'] = max(0, $elapsedMs);
        $state['playback']['updatedAt'] = $nowMs;

        $this->queueService->saveState($state);

        return $state;
    }
}
