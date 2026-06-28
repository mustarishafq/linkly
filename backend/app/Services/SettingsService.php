<?php

namespace App\Services;

use App\Support\SqlDate;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SettingsService
{
    private const DEFAULT_NEXUS_SSO = [
        'enabled' => false,
        'secret' => '',
        'issuer' => '',
        'default_role' => 'user',
        'default_role_id' => null,
    ];

    private const DEFAULT_QR_DEFAULT = [
        'name' => 'Organization Default',
        'fg_color' => '#000000',
        'bg_color' => '#ffffff',
        'eye_color' => '#000000',
        'style' => 'square',
        'size' => 300,
        'logo_size' => 20,
        'logo_url' => '',
    ];

    private const DEFAULT_GENERAL = [
        'organization_name' => 'EMZI Nexus Linkly',
        'default_domain' => '',
        'brand_primary' => '#0f766e',
        'timezone' => 'UTC',
    ];

    private const DEFAULT_WEBHOOK_EVENTS = [
        'link.created' => true,
        'link.updated' => false,
        'link.deleted' => false,
        'user.registered' => true,
        'user.approved' => true,
        'link.metric_threshold' => true,
        'webhook.test' => true,
    ];

    private const DEFAULT_EVENT_WEBHOOK = [
        'webhooks' => [],
    ];

    private const DEFAULT_MCP_API = [
        'api_key' => '',
        'rate_limit' => 60,
    ];

    public const EVENT_WEBHOOK_KEYS = [
        'link.created',
        'link.updated',
        'link.deleted',
        'user.registered',
        'user.approved',
        'link.metric_threshold',
        'webhook.test',
    ];

    private const QR_STYLES = ['square', 'rounded', 'dots'];

    private const QR_SIZES = [200, 300, 400, 600, 800];

    public function seedDefaults(): void
    {
        if (! DB::table('settings')->where('key', 'nexus_sso')->exists()) {
            DB::table('settings')->insert([
                'key' => 'nexus_sso',
                'value' => json_encode(self::DEFAULT_NEXUS_SSO),
                'updated_date' => SqlDate::now(),
            ]);
        }

        if (! DB::table('organization_qr_defaults')->exists()) {
            DB::table('organization_qr_defaults')->insert([
                'id' => 1,
                ...self::DEFAULT_QR_DEFAULT,
                'updated_date' => SqlDate::now(),
            ]);
        }

        if (! DB::table('settings')->where('key', 'general')->exists()) {
            DB::table('settings')->insert([
                'key' => 'general',
                'value' => json_encode(self::DEFAULT_GENERAL),
                'updated_date' => SqlDate::now(),
            ]);
        }

        if (! DB::table('settings')->where('key', 'event_webhook')->exists()) {
            DB::table('settings')->insert([
                'key' => 'event_webhook',
                'value' => json_encode(self::DEFAULT_EVENT_WEBHOOK),
                'updated_date' => SqlDate::now(),
            ]);
        }

        if (! DB::table('settings')->where('key', 'mcp_api')->exists()) {
            DB::table('settings')->insert([
                'key' => 'mcp_api',
                'value' => json_encode(self::DEFAULT_MCP_API),
                'updated_date' => SqlDate::now(),
            ]);
        }
    }

    public function getNexusSsoConfig(): array
    {
        $row = DB::table('settings')->where('key', 'nexus_sso')->first();

        if (! $row) {
            return self::DEFAULT_NEXUS_SSO;
        }

        $value = is_string($row->value) ? json_decode($row->value, true) : (array) $row->value;

        return [
            'enabled' => (bool) ($value['enabled'] ?? false),
            'secret' => (string) ($value['secret'] ?? ''),
            'issuer' => trim((string) ($value['issuer'] ?? '')),
            'default_role' => ($value['default_role'] ?? 'user') === 'admin' ? 'admin' : 'user',
            'default_role_id' => $value['default_role_id'] ?? null,
        ];
    }

    public function redactNexusSsoConfig(array $config): array
    {
        return [
            'enabled' => (bool) $config['enabled'],
            'secret_set' => strlen($config['secret'] ?? '') >= 32,
            'issuer' => $config['issuer'] ?? '',
            'default_role' => ($config['default_role'] ?? 'user') === 'admin' ? 'admin' : 'user',
            'default_role_id' => $config['default_role_id'] ?? null,
        ];
    }

    public function updateNexusSsoConfig(array $patch): array
    {
        $current = $this->getNexusSsoConfig();
        $next = $current;

        if (array_key_exists('enabled', $patch)) {
            $next['enabled'] = (bool) $patch['enabled'];
        }

        if (array_key_exists('issuer', $patch)) {
            $next['issuer'] = trim((string) ($patch['issuer'] ?? ''));
        }

        if (array_key_exists('default_role', $patch)) {
            $next['default_role'] = ($patch['default_role'] ?? 'user') === 'admin' ? 'admin' : 'user';
        }

        if (array_key_exists('default_role_id', $patch)) {
            $next['default_role_id'] = $patch['default_role_id'] ?? null;
        }

        if (array_key_exists('secret', $patch)) {
            $incoming = (string) ($patch['secret'] ?? '');
            if ($incoming !== '') {
                if (strlen($incoming) < 32) {
                    throw new \InvalidArgumentException('Secret must be at least 32 characters');
                }
                $next['secret'] = $incoming;
            }
        }

        $this->upsertSetting('nexus_sso', $next);

        return $next;
    }

    public function isSsoConfigured(array $config): bool
    {
        return (bool) ($config['enabled'] && strlen($config['secret'] ?? '') >= 32);
    }

    public function getQrDefaultConfig(): array
    {
        $row = DB::table('organization_qr_defaults')->where('id', 1)->first();

        if (! $row) {
            return self::DEFAULT_QR_DEFAULT;
        }

        return $this->normalizeQrDefaultConfig([
            'name' => $row->name,
            'fg_color' => $row->fg_color,
            'bg_color' => $row->bg_color,
            'eye_color' => $row->eye_color,
            'style' => $row->style,
            'size' => $row->size,
            'logo_size' => $row->logo_size,
            'logo_url' => $row->logo_url,
        ]);
    }

    public function getGeneralConfig(): array
    {
        $row = DB::table('settings')->where('key', 'general')->first();

        if (! $row) {
            return self::DEFAULT_GENERAL;
        }

        $value = is_string($row->value) ? json_decode($row->value, true) : (array) $row->value;

        return $this->normalizeGeneralConfig($value);
    }

    public function updateGeneralConfig(array $patch): array
    {
        $current = $this->getGeneralConfig();
        $next = $current;

        if (array_key_exists('organization_name', $patch)) {
            $name = trim((string) ($patch['organization_name'] ?? ''));
            if ($name === '') {
                throw new \InvalidArgumentException('organization_name is required');
            }
            $next['organization_name'] = $name;
        }

        if (array_key_exists('default_domain', $patch)) {
            $next['default_domain'] = strtolower(trim((string) ($patch['default_domain'] ?? '')));
        }

        if (array_key_exists('brand_primary', $patch)) {
            $color = strtolower(trim((string) ($patch['brand_primary'] ?? '')));
            if (! preg_match('/^#[0-9a-f]{6}$/', $color)) {
                throw new \InvalidArgumentException('brand_primary must be a valid hex color');
            }
            $next['brand_primary'] = $color;
        }

        if (array_key_exists('timezone', $patch)) {
            $timezone = trim((string) ($patch['timezone'] ?? ''));
            if ($timezone === '' || ! in_array($timezone, timezone_identifiers_list(), true)) {
                throw new \InvalidArgumentException('timezone must be a valid IANA timezone');
            }
            $next['timezone'] = $timezone;
        }

        $this->upsertSetting('general', $next);

        return $next;
    }

    public function getEventWebhookConfig(): array
    {
        $row = DB::table('settings')->where('key', 'event_webhook')->first();

        if (! $row) {
            return self::DEFAULT_EVENT_WEBHOOK;
        }

        $value = is_string($row->value) ? json_decode($row->value, true) : (array) $row->value;

        return $this->normalizeEventWebhookConfig($value);
    }

    public function redactEventWebhookConfig(array $config): array
    {
        return [
            'webhooks' => array_map(
                fn (array $webhook) => $this->redactWebhookRecord($webhook),
                $config['webhooks'] ?? []
            ),
        ];
    }

    public function updateEventWebhookConfig(array $patch): array
    {
        $current = $this->getEventWebhookConfig();

        if (! array_key_exists('webhooks', $patch)) {
            throw new \InvalidArgumentException('webhooks array is required');
        }

        if (! is_array($patch['webhooks'])) {
            throw new \InvalidArgumentException('webhooks must be an array');
        }

        $existingById = [];
        foreach ($current['webhooks'] as $webhook) {
            $existingById[(string) $webhook['id']] = $webhook;
        }

        $nextWebhooks = [];
        foreach ($patch['webhooks'] as $webhookPatch) {
            if (! is_array($webhookPatch)) {
                throw new \InvalidArgumentException('Each webhook must be an object');
            }

            $id = trim((string) ($webhookPatch['id'] ?? ''));
            $existing = $id !== '' ? ($existingById[$id] ?? null) : null;

            $nextWebhooks[] = $this->normalizeWebhookRecord($webhookPatch, $existing);
        }

        $next = ['webhooks' => $nextWebhooks];
        $this->validateEventWebhookConfig($next);
        $this->upsertSetting('event_webhook', $next);

        return $next;
    }

    public function findEventWebhookById(string $webhookId): ?array
    {
        foreach ($this->getEventWebhookConfig()['webhooks'] as $webhook) {
            if ((string) $webhook['id'] === $webhookId) {
                return $webhook;
            }
        }

        return null;
    }

    /** @param  array<int, int|string>  $userIds @return array<int, string|null> */
    public function resolveNexusSsoIds(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        $rows = DB::table('users')
            ->whereIn('id', $userIds)
            ->select('id', 'nexus_sso_id')
            ->get()
            ->keyBy(fn ($row) => (int) $row->id);

        return array_map(
            fn ($userId) => isset($rows[(int) $userId]) && $rows[(int) $userId]->nexus_sso_id
                ? (string) $rows[(int) $userId]->nexus_sso_id
                : null,
            $userIds
        );
    }

    public static function generateWebhookSecret(): string
    {
        return 'whsec_'.bin2hex(random_bytes(32));
    }

    public function getMcpApiConfig(): array
    {
        $row = DB::table('settings')->where('key', 'mcp_api')->first();

        if (! $row) {
            return self::DEFAULT_MCP_API;
        }

        $value = is_string($row->value) ? json_decode($row->value, true) : (array) $row->value;

        return $this->normalizeMcpApiConfig($value);
    }

    public function redactMcpApiConfig(array $config): array
    {
        return [
            'api_key_set' => strlen($config['api_key'] ?? '') >= 32,
            'rate_limit' => max(1, (int) ($config['rate_limit'] ?? 60)),
        ];
    }

    public function updateMcpApiConfig(array $patch): array
    {
        $current = $this->getMcpApiConfig();
        $next = $current;

        if (array_key_exists('api_key', $patch)) {
            $incoming = (string) ($patch['api_key'] ?? '');
            if ($incoming !== '') {
                if (strlen($incoming) < 32) {
                    throw new \InvalidArgumentException('api_key must be at least 32 characters');
                }
                $next['api_key'] = $incoming;
            }
        }

        if (array_key_exists('rate_limit', $patch)) {
            $next['rate_limit'] = max(1, (int) $patch['rate_limit']);
        }

        $this->upsertSetting('mcp_api', $next);

        return $next;
    }

    public function updateQrDefaultConfig(array $patch): array
    {
        $current = $this->getQrDefaultConfig();
        $next = $current;

        if (array_key_exists('name', $patch)) {
            $next['name'] = trim((string) ($patch['name'] ?? '')) ?: self::DEFAULT_QR_DEFAULT['name'];
        }

        foreach (['fg_color', 'bg_color', 'eye_color'] as $colorKey) {
            if (array_key_exists($colorKey, $patch)) {
                $color = strtolower(trim((string) ($patch[$colorKey] ?? '')));
                if (! preg_match('/^#[0-9a-f]{6}$/', $color)) {
                    throw new \InvalidArgumentException("{$colorKey} must be a valid hex color");
                }
                $next[$colorKey] = $color;
            }
        }

        if (array_key_exists('style', $patch)) {
            $style = (string) ($patch['style'] ?? 'square');
            if (! in_array($style, self::QR_STYLES, true)) {
                throw new \InvalidArgumentException('style must be square, rounded, or dots');
            }
            $next['style'] = $style;
        }

        if (array_key_exists('size', $patch)) {
            $size = (int) $patch['size'];
            if (! in_array($size, self::QR_SIZES, true)) {
                throw new \InvalidArgumentException('size must be one of: '.implode(', ', self::QR_SIZES));
            }
            $next['size'] = $size;
        }

        if (array_key_exists('logo_size', $patch)) {
            $logoSize = (int) $patch['logo_size'];
            if ($logoSize < 10 || $logoSize > 40) {
                throw new \InvalidArgumentException('logo_size must be between 10 and 40');
            }
            $next['logo_size'] = $logoSize;
        }

        if (array_key_exists('logo_url', $patch)) {
            $next['logo_url'] = trim((string) ($patch['logo_url'] ?? ''));
        }

        $exists = DB::table('organization_qr_defaults')->where('id', 1)->exists();

        if ($exists) {
            DB::table('organization_qr_defaults')
                ->where('id', 1)
                ->update([
                    'name' => $next['name'],
                    'fg_color' => $next['fg_color'],
                    'bg_color' => $next['bg_color'],
                    'eye_color' => $next['eye_color'],
                    'style' => $next['style'],
                    'size' => $next['size'],
                    'logo_size' => $next['logo_size'],
                    'logo_url' => $next['logo_url'],
                    'updated_date' => SqlDate::now(),
                ]);
        } else {
            DB::table('organization_qr_defaults')->insert([
                'id' => 1,
                ...$next,
                'updated_date' => SqlDate::now(),
            ]);
        }

        return $next;
    }

    private function normalizeQrDefaultConfig(array $value): array
    {
        $style = (string) ($value['style'] ?? self::DEFAULT_QR_DEFAULT['style']);
        if (! in_array($style, self::QR_STYLES, true)) {
            $style = self::DEFAULT_QR_DEFAULT['style'];
        }

        $size = (int) ($value['size'] ?? self::DEFAULT_QR_DEFAULT['size']);
        if (! in_array($size, self::QR_SIZES, true)) {
            $size = self::DEFAULT_QR_DEFAULT['size'];
        }

        $logoSize = (int) ($value['logo_size'] ?? self::DEFAULT_QR_DEFAULT['logo_size']);
        if ($logoSize < 10 || $logoSize > 40) {
            $logoSize = self::DEFAULT_QR_DEFAULT['logo_size'];
        }

        return [
            'name' => trim((string) ($value['name'] ?? '')) ?: self::DEFAULT_QR_DEFAULT['name'],
            'fg_color' => $this->normalizeHexColor($value['fg_color'] ?? null, self::DEFAULT_QR_DEFAULT['fg_color']),
            'bg_color' => $this->normalizeHexColor($value['bg_color'] ?? null, self::DEFAULT_QR_DEFAULT['bg_color']),
            'eye_color' => $this->normalizeHexColor($value['eye_color'] ?? null, self::DEFAULT_QR_DEFAULT['eye_color']),
            'style' => $style,
            'size' => $size,
            'logo_size' => $logoSize,
            'logo_url' => trim((string) ($value['logo_url'] ?? '')),
        ];
    }

    private function normalizeHexColor(mixed $value, string $fallback): string
    {
        $color = strtolower(trim((string) $value));

        return preg_match('/^#[0-9a-f]{6}$/', $color) ? $color : $fallback;
    }

    private function normalizeGeneralConfig(array $value): array
    {
        $timezone = trim((string) ($value['timezone'] ?? self::DEFAULT_GENERAL['timezone']));
        if (! in_array($timezone, timezone_identifiers_list(), true)) {
            $timezone = self::DEFAULT_GENERAL['timezone'];
        }

        return [
            'organization_name' => trim((string) ($value['organization_name'] ?? '')) ?: self::DEFAULT_GENERAL['organization_name'],
            'default_domain' => strtolower(trim((string) ($value['default_domain'] ?? ''))),
            'brand_primary' => $this->normalizeHexColor($value['brand_primary'] ?? null, self::DEFAULT_GENERAL['brand_primary']),
            'timezone' => $timezone,
        ];
    }

    private function normalizeEventWebhookConfig(array $value): array
    {
        if (isset($value['webhooks']) && is_array($value['webhooks'])) {
            return [
                'webhooks' => array_values(array_map(
                    fn (array $webhook) => $this->normalizeWebhookRecord($webhook),
                    $value['webhooks']
                )),
            ];
        }

        if (isset($value['url']) || isset($value['enabled']) || isset($value['name'])) {
            return [
                'webhooks' => [
                    $this->normalizeWebhookRecord([
                        'id' => (string) Str::uuid(),
                        'name' => $value['name'] ?? 'Nexus Brain',
                        'url' => $value['url'] ?? '',
                        'secret' => $value['secret'] ?? '',
                        'enabled' => $value['enabled'] ?? false,
                        'events' => $value['events'] ?? [],
                    ]),
                ],
            ];
        }

        return self::DEFAULT_EVENT_WEBHOOK;
    }

    /** @param  array<string, mixed>  $patch @param  array<string, mixed>|null  $existing */
    private function normalizeWebhookRecord(array $patch, ?array $existing = null): array
    {
        $id = trim((string) ($patch['id'] ?? $existing['id'] ?? ''));
        if ($id === '') {
            $id = (string) Str::uuid();
        }

        $secret = (string) ($existing['secret'] ?? '');
        if (array_key_exists('secret', $patch)) {
            $incoming = (string) ($patch['secret'] ?? '');
            if ($incoming !== '') {
                if (strlen($incoming) < 32) {
                    throw new \InvalidArgumentException('Secret must be at least 32 characters');
                }
                $secret = $incoming;
            }
        }

        if ($secret === '' && ($patch['enabled'] ?? $existing['enabled'] ?? false)) {
            $secret = self::generateWebhookSecret();
        }

        return [
            'id' => $id,
            'name' => trim((string) ($patch['name'] ?? $existing['name'] ?? '')) ?: 'Nexus Brain',
            'url' => trim((string) ($patch['url'] ?? $existing['url'] ?? '')),
            'secret' => $secret,
            'enabled' => (bool) ($patch['enabled'] ?? $existing['enabled'] ?? false),
            'events' => $this->normalizeEventWebhookEvents($patch['events'] ?? $existing['events'] ?? []),
        ];
    }

    /** @param  array<string, mixed>  $webhook */
    private function redactWebhookRecord(array $webhook): array
    {
        return [
            'id' => (string) $webhook['id'],
            'name' => trim((string) ($webhook['name'] ?? 'Nexus Brain')),
            'url' => trim((string) ($webhook['url'] ?? '')),
            'secret_set' => strlen($webhook['secret'] ?? '') >= 32,
            'enabled' => (bool) ($webhook['enabled'] ?? false),
            'events' => $this->normalizeEventWebhookEvents($webhook['events'] ?? []),
        ];
    }

    private function validateEventWebhookConfig(array $config): void
    {
        foreach ($config['webhooks'] as $webhook) {
            if (! ($webhook['enabled'] ?? false)) {
                continue;
            }

            $url = trim((string) ($webhook['url'] ?? ''));
            if ($url === '' || ! filter_var($url, FILTER_VALIDATE_URL)) {
                throw new \InvalidArgumentException('A valid webhook URL is required for each enabled webhook');
            }

            if (strlen($webhook['secret'] ?? '') < 32) {
                throw new \InvalidArgumentException('A webhook secret of at least 32 characters is required for each enabled webhook');
            }
        }
    }

    private function normalizeEventWebhookEvents(array $events): array
    {
        $normalized = self::DEFAULT_WEBHOOK_EVENTS;

        foreach (self::EVENT_WEBHOOK_KEYS as $key) {
            if (array_key_exists($key, $events)) {
                $normalized[$key] = (bool) $events[$key];
            }
        }

        return $normalized;
    }

    private function normalizeMcpApiConfig(array $value): array
    {
        return [
            'api_key' => (string) ($value['api_key'] ?? ''),
            'rate_limit' => max(1, (int) ($value['rate_limit'] ?? self::DEFAULT_MCP_API['rate_limit'])),
        ];
    }

    private function upsertSetting(string $key, array $value): void
    {
        $exists = DB::table('settings')->where('key', $key)->exists();

        if ($exists) {
            DB::table('settings')
                ->where('key', $key)
                ->update([
                    'value' => json_encode($value),
                    'updated_date' => SqlDate::now(),
                ]);

            return;
        }

        DB::table('settings')->insert([
            'key' => $key,
            'value' => json_encode($value),
            'updated_date' => SqlDate::now(),
        ]);
    }
}
