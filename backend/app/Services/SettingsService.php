<?php

namespace App\Services;

use App\Support\SqlDate;
use Illuminate\Support\Facades\DB;

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

    private const DEFAULT_EVENT_WEBHOOK = [
        'enabled' => false,
        'name' => 'Nexus Brain',
        'url' => '',
        'secret' => '',
        'events' => [
            'link.created' => true,
            'link.updated' => false,
            'link.deleted' => false,
            'user.registered' => true,
            'user.approved' => true,
            'link.metric_threshold' => true,
            'webhook.test' => true,
        ],
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
            'enabled' => (bool) ($config['enabled'] ?? false),
            'name' => trim((string) ($config['name'] ?? self::DEFAULT_EVENT_WEBHOOK['name'])),
            'url' => trim((string) ($config['url'] ?? '')),
            'secret_set' => strlen($config['secret'] ?? '') >= 32,
            'events' => $this->normalizeEventWebhookEvents($config['events'] ?? []),
        ];
    }

    public function updateEventWebhookConfig(array $patch): array
    {
        $current = $this->getEventWebhookConfig();
        $next = $current;

        if (array_key_exists('enabled', $patch)) {
            $next['enabled'] = (bool) $patch['enabled'];
        }

        if (array_key_exists('name', $patch)) {
            $next['name'] = trim((string) ($patch['name'] ?? '')) ?: self::DEFAULT_EVENT_WEBHOOK['name'];
        }

        if (array_key_exists('url', $patch)) {
            $next['url'] = trim((string) ($patch['url'] ?? ''));
        }

        if (array_key_exists('events', $patch)) {
            if (! is_array($patch['events'])) {
                throw new \InvalidArgumentException('events must be an object');
            }
            $next['events'] = $this->normalizeEventWebhookEvents($patch['events']);
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

        if ($next['enabled']) {
            if ($next['url'] === '' || ! filter_var($next['url'], FILTER_VALIDATE_URL)) {
                throw new \InvalidArgumentException('A valid webhook URL is required when notifications are enabled');
            }
            if (strlen($next['secret'] ?? '') < 32) {
                throw new \InvalidArgumentException('A webhook secret of at least 32 characters is required when notifications are enabled');
            }
        }

        $this->upsertSetting('event_webhook', $next);

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
        return [
            'enabled' => (bool) ($value['enabled'] ?? false),
            'name' => trim((string) ($value['name'] ?? '')) ?: self::DEFAULT_EVENT_WEBHOOK['name'],
            'url' => trim((string) ($value['url'] ?? '')),
            'secret' => (string) ($value['secret'] ?? ''),
            'events' => $this->normalizeEventWebhookEvents($value['events'] ?? []),
        ];
    }

    private function normalizeEventWebhookEvents(array $events): array
    {
        $normalized = self::DEFAULT_EVENT_WEBHOOK['events'];

        foreach (self::EVENT_WEBHOOK_KEYS as $key) {
            if (array_key_exists($key, $events)) {
                $normalized[$key] = (bool) $events[$key];
            }
        }

        return $normalized;
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
