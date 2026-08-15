<?php

declare(strict_types=1);

namespace CrowdQ;

class ConfigService
{
    private string $configFile;

    public function __construct(?string $configFile = null)
    {
        $this->configFile = $configFile ?? dirname(__DIR__, 2) . '/config.json';
    }

    /**
     * Get the YouTube API key if configured.
     */
    public function getYouTubeApiKey(): ?string
    {
        if (file_exists($this->configFile)) {
            $content = file_get_contents($this->configFile);
            $data = json_decode($content, true);
            if (is_array($data) && !empty($data['youtube_api_key']) && $data['youtube_api_key'] !== 'YOUR_API_KEY') {
                return (string) $data['youtube_api_key'];
            }
        }
        return null;
    }

    /**
     * Get safe public configuration.
     */
    public function getPublicConfig(): array
    {
        $apiKey = $this->getYouTubeApiKey();
        return [
            'hasApiKey' => !empty($apiKey),
            'youtube_api_key' => $apiKey,
        ];
    }
}
