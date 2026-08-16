<?php
declare(strict_types=1);

namespace CrowdQ\DTO;

use JsonSerializable;

final class PlaylistDTO implements JsonSerializable
{
    /**
     * @param TrackItemDTO[] $queue
     * @param TrackItemDTO[] $history
     * @param array<string, mixed> $settings
     */
    public function __construct(
        public readonly array $queue,
        public readonly array $history,
        public readonly array $settings
    ) {}

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        $queue = [];
        if (!empty($data['queue']) && is_array($data['queue'])) {
            foreach ($data['queue'] as $item) {
                if (is_array($item)) {
                    $queue[] = TrackItemDTO::fromArray($item);
                }
            }
        }

        $history = [];
        if (!empty($data['history']) && is_array($data['history'])) {
            foreach ($data['history'] as $item) {
                if (is_array($item)) {
                    $history[] = TrackItemDTO::fromArray($item);
                }
            }
        }

        $settings = is_array($data['settings'] ?? null) ? $data['settings'] : [
            'roomName' => 'Crowd-Q Room',
            'isPasswordProtected' => false,
            'maxQueueLength' => 50,
            'maxUserSongsInQueue' => 3,
        ];

        return new self(
            queue: $queue,
            history: $history,
            settings: $settings
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        $safeSettings = $this->settings;
        unset($safeSettings['hostPasswordHash']);

        return [
            'queue' => array_map(fn(TrackItemDTO $t) => $t->jsonSerialize(), $this->queue),
            'history' => array_map(fn(TrackItemDTO $t) => $t->jsonSerialize(), $this->history),
            'settings' => $safeSettings,
        ];
    }
}
