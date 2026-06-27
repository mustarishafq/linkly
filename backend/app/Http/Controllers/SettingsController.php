<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function __construct(
        private SettingsService $settings,
        private AuditLogService $audit,
    ) {}

    public function show(): JsonResponse
    {
        $nexusSso = $this->settings->getNexusSsoConfig();
        $eventWebhook = $this->settings->getEventWebhookConfig();

        return response()->json([
            'general' => $this->settings->getGeneralConfig(),
            'nexus_sso' => $this->settings->redactNexusSsoConfig($nexusSso),
            'qr_default' => $this->settings->getQrDefaultConfig(),
            'event_webhook' => $this->settings->redactEventWebhookConfig($eventWebhook),
        ]);
    }

    public function qrDefault(): JsonResponse
    {
        return response()->json([
            'qr_default' => $this->settings->getQrDefaultConfig(),
        ]);
    }

    public function generalDefaults(): JsonResponse
    {
        $general = $this->settings->getGeneralConfig();

        return response()->json([
            'general' => [
                'organization_name' => $general['organization_name'],
                'default_domain' => $general['default_domain'],
                'brand_primary' => $general['brand_primary'],
                'timezone' => $general['timezone'],
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $response = [];

        if ($request->has('general')) {
            $patch = $request->input('general');
            if (! is_array($patch)) {
                return $this->error('invalid_input', 'general object is required', 400);
            }

            $before = $this->settings->getGeneralConfig();

            try {
                $after = $this->settings->updateGeneralConfig($patch);
            } catch (\InvalidArgumentException $error) {
                return $this->error('invalid_general', $error->getMessage(), 400);
            }

            $changedFields = [];
            foreach (['organization_name', 'default_domain', 'brand_primary', 'timezone'] as $field) {
                if (array_key_exists($field, $patch) && ($before[$field] ?? null) !== ($after[$field] ?? null)) {
                    $changedFields[] = $field;
                }
            }

            if ($changedFields) {
                $user = request()->attributes->get('auth_user');
                $this->audit->write([
                    'actor_user_id' => $user?->id,
                    'action' => 'settings_updated',
                    'details' => [
                        'scope' => 'general',
                        'changed_fields' => $changedFields,
                        'organization_name' => $after['organization_name'],
                        'timezone' => $after['timezone'],
                    ],
                ]);
            }

            $response['general'] = $after;
        }

        if ($request->has('nexus_sso')) {
            $patch = $request->input('nexus_sso');
            if (! is_array($patch)) {
                return $this->error('invalid_input', 'nexus_sso object is required', 400);
            }

            $before = $this->settings->getNexusSsoConfig();

            try {
                $after = $this->settings->updateNexusSsoConfig($patch);
            } catch (\InvalidArgumentException $error) {
                return $this->error('invalid_secret', $error->getMessage(), 400);
            }

            $changedFields = [];
            if (array_key_exists('enabled', $patch) && (bool) $before['enabled'] !== (bool) $after['enabled']) {
                $changedFields[] = 'enabled';
            }
            if (array_key_exists('issuer', $patch) && $before['issuer'] !== $after['issuer']) {
                $changedFields[] = 'issuer';
            }
            if (array_key_exists('default_role', $patch) && $before['default_role'] !== $after['default_role']) {
                $changedFields[] = 'default_role';
            }
            if (array_key_exists('secret', $patch) && strlen((string) ($patch['secret'] ?? '')) > 0) {
                $changedFields[] = 'secret';
            }

            if ($changedFields) {
                $user = request()->attributes->get('auth_user');
                $this->audit->write([
                    'actor_user_id' => $user?->id,
                    'action' => 'settings_updated',
                    'details' => [
                        'scope' => 'nexus_sso',
                        'changed_fields' => $changedFields,
                        'enabled' => $after['enabled'],
                        'issuer' => $after['issuer'],
                        'default_role' => $after['default_role'],
                        'secret_rotated' => in_array('secret', $changedFields, true),
                    ],
                ]);
            }

            $response['nexus_sso'] = $this->settings->redactNexusSsoConfig($after);
        }

        if ($request->has('qr_default')) {
            $patch = $request->input('qr_default');
            if (! is_array($patch)) {
                return $this->error('invalid_input', 'qr_default object is required', 400);
            }

            $before = $this->settings->getQrDefaultConfig();

            try {
                $after = $this->settings->updateQrDefaultConfig($patch);
            } catch (\InvalidArgumentException $error) {
                return $this->error('invalid_qr_default', $error->getMessage(), 400);
            }

            $changedFields = [];
            foreach (['name', 'fg_color', 'bg_color', 'eye_color', 'style', 'size', 'logo_size', 'logo_url'] as $field) {
                if (array_key_exists($field, $patch) && ($before[$field] ?? null) !== ($after[$field] ?? null)) {
                    $changedFields[] = $field;
                }
            }

            if ($changedFields) {
                $user = request()->attributes->get('auth_user');
                $this->audit->write([
                    'actor_user_id' => $user?->id,
                    'action' => 'settings_updated',
                    'details' => [
                        'scope' => 'qr_default',
                        'changed_fields' => $changedFields,
                        'name' => $after['name'],
                        'style' => $after['style'],
                        'size' => $after['size'],
                    ],
                ]);
            }

            $response['qr_default'] = $after;
        }

        if ($request->has('event_webhook')) {
            $patch = $request->input('event_webhook');
            if (! is_array($patch)) {
                return $this->error('invalid_input', 'event_webhook object is required', 400);
            }

            $before = $this->settings->getEventWebhookConfig();

            try {
                $after = $this->settings->updateEventWebhookConfig($patch);
            } catch (\InvalidArgumentException $error) {
                return $this->error('invalid_event_webhook', $error->getMessage(), 400);
            }

            $changedFields = [];
            if (array_key_exists('enabled', $patch) && (bool) $before['enabled'] !== (bool) $after['enabled']) {
                $changedFields[] = 'enabled';
            }
            if (array_key_exists('name', $patch) && $before['name'] !== $after['name']) {
                $changedFields[] = 'name';
            }
            if (array_key_exists('url', $patch) && $before['url'] !== $after['url']) {
                $changedFields[] = 'url';
            }
            if (array_key_exists('events', $patch)) {
                foreach (SettingsService::EVENT_WEBHOOK_KEYS as $eventKey) {
                    if (($before['events'][$eventKey] ?? false) !== ($after['events'][$eventKey] ?? false)) {
                        $changedFields[] = "events.{$eventKey}";
                    }
                }
            }
            if (array_key_exists('secret', $patch) && strlen((string) ($patch['secret'] ?? '')) > 0) {
                $changedFields[] = 'secret';
            }

            if ($changedFields) {
                $user = request()->attributes->get('auth_user');
                $this->audit->write([
                    'actor_user_id' => $user?->id,
                    'action' => 'settings_updated',
                    'details' => [
                        'scope' => 'event_webhook',
                        'changed_fields' => $changedFields,
                        'enabled' => $after['enabled'],
                        'url' => $after['url'],
                        'secret_rotated' => in_array('secret', $changedFields, true),
                    ],
                ]);
            }

            $response['event_webhook'] = $this->settings->redactEventWebhookConfig($after);
        }

        if ($response === []) {
            return $this->error('invalid_input', 'No settings payload provided', 400);
        }

        return response()->json($response);
    }
}
