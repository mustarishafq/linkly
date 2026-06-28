<?php

namespace App\Services\Mcp;

use App\Services\SettingsService;

class McpSettingsService
{
    public function __construct(private SettingsService $settings) {}

    /** @return array{apiKeys: array<int, string>, rateLimit: int} */
    public function resolve(): array
    {
        $apiKeys = [];

        $primary = trim((string) config('mcp.api_key', ''));
        if ($primary !== '') {
            $apiKeys[] = $primary;
        }

        foreach (config('mcp.api_keys', []) as $key) {
            $key = trim((string) $key);
            if ($key !== '') {
                $apiKeys[] = $key;
            }
        }

        $rateLimit = max(1, (int) config('mcp.rate_limit', 60));

        $dbConfig = $this->settings->getMcpApiConfig();
        $dbKey = trim((string) ($dbConfig['api_key'] ?? ''));
        if ($dbKey !== '') {
            $apiKeys[] = $dbKey;
        }

        if (array_key_exists('rate_limit', $dbConfig)) {
            $rateLimit = max(1, (int) $dbConfig['rate_limit']);
        }

        return [
            'apiKeys' => array_values(array_unique($apiKeys)),
            'rateLimit' => $rateLimit,
        ];
    }

    public static function generateApiKey(): string
    {
        return bin2hex(random_bytes(32));
    }
}
