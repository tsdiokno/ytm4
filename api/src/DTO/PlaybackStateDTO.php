<?php
declare(strict_types=1);

namespace CrowdQ\DTO;

use JsonSerializable;

final class PlaybackStateDTO implements JsonSerializable
{
    public function __construct(
        public readonly int $version,
        public readonly string $status,
        public readonly ?TrackItemDTO $currentTrack,
        public readonly float $currentTime,
        public readonly int $updatedAt
    ) {}

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        $currentTrack = null;
        if (!empty($data['currentTrack']) && is_array($data['currentTrack'])) {
            $currentTrack = TrackItemDTO::fromArray($data['currentTrack']);
        }

        return new self(
            version: (int)($data['version'] ?? 1),
            status: (string)($data['status'] ?? 'idle'),
            currentTrack: $currentTrack,
            currentTime: (float)($data['currentTime'] ?? $data['referenceTime'] ?? 0.0),
            updatedAt: (int)($data['updatedAt'] ?? time())
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'version' => $this->version,
            'status' => $this->status,
            'currentTrack' => $this->currentTrack?->jsonSerialize(),
            'currentTime' => $this->currentTime,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
