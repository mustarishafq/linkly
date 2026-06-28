<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\LinkWebhookService;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function __construct(
        private SettingsService $settings,
        private AuditLogService $audit,
        private LinkWebhookService $linkWebhooks,
    ) {}

    public function show(): JsonResponse
    {
        $nexusSso = $this->settings->getNexusSsoConfig();
        $eventWebhook = $this->settings->getEventWebhookConfig();
        $mcpApi = $this->settings->getMcpApiConfig();

        return response()->json([
            'general' => $this->settings->getGeneralConfig(),
            'nexus_sso' => $this->settings->redactNexusSsoConfig($nexusSso),
            'qr_default' => $this->settings->getQrDefaultConfig(),
            'event_webhook' => $this->settings->redactEventWebhookConfig($eventWebhook),
            'mcp_api' => $this->settings->redactMcpApiConfig($mcpApi),
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

            $changedFields = $this->diffEventWebhookConfig($before, $after);

            if ($changedFields) {
                $user = request()->attributes->get('auth_user');
                $this->audit->write([
                    'actor_user_id' => $user?->id,
                    'action' => 'settings_updated',
                    'details' => [
                        'scope' => 'event_webhook',
                        'changed_fields' => $changedFields,
                        'webhook_count' => count($after['webhooks']),
                    ],
                ]);
            }

            $response['event_webhook'] = $this->settings->redactEventWebhookConfig($after);
        }

        if ($request->has('mcp_api')) {
            $patch = $request->input('mcp_api');
            if (! is_array($patch)) {
                return $this->error('invalid_input', 'mcp_api object is required', 400);
            }

            $before = $this->settings->getMcpApiConfig();

            try {
                $after = $this->settings->updateMcpApiConfig($patch);
            } catch (\InvalidArgumentException $error) {
                return $this->error('invalid_mcp_api', $error->getMessage(), 400);
            }

            $changedFields = [];
            if (array_key_exists('rate_limit', $patch) && (int) $before['rate_limit'] !== (int) $after['rate_limit']) {
                $changedFields[] = 'rate_limit';
            }
            if (array_key_exists('api_key', $patch) && strlen((string) ($patch['api_key'] ?? '')) > 0) {
                $changedFields[] = 'api_key';
            }

            if ($changedFields) {
                $user = request()->attributes->get('auth_user');
                $this->audit->write([
                    'actor_user_id' => $user?->id,
                    'action' => 'settings_updated',
                    'details' => [
                        'scope' => 'mcp_api',
                        'changed_fields' => $changedFields,
                        'rate_limit' => $after['rate_limit'],
                        'api_key_rotated' => in_array('api_key', $changedFields, true),
                    ],
                ]);
            }

            $response['mcp_api'] = $this->settings->redactMcpApiConfig($after);
        }

        if ($response === []) {
            return $this->error('invalid_input', 'No settings payload provided', 400);
        }

        return response()->json($response);
    }

    public function testEventWebhook(Request $request): JsonResponse
    {
        $webhookId = trim((string) $request->input('webhook_id', ''));

        if ($webhookId === '') {
            return $this->error('invalid_input', 'webhook_id is required', 400);
        }

        $webhook = $this->settings->findEventWebhookById($webhookId);

        if (! $webhook) {
            return $this->error('not_found', 'Webhook not found', 404);
        }

        if (! ($webhook['enabled'] ?? false)) {
            return $this->error('webhook_disabled', 'Enable this webhook before sending a test', 400);
        }

        if (trim((string) ($webhook['url'] ?? '')) === '') {
            return $this->error('invalid_webhook', 'Webhook URL is required', 400);
        }

        if (strlen($webhook['secret'] ?? '') < 32) {
            return $this->error('invalid_webhook', 'Webhook secret is required', 400);
        }

        if (! ($webhook['events']['webhook.test'] ?? false)) {
            return $this->error('event_disabled', 'Enable test events for this webhook first', 400);
        }

        $actor = $request->attributes->get('auth_user');
        $result = $this->linkWebhooks->sendTest($webhook, $actor);

        if (! $result->ok) {
            return response()->json([
                'code' => 'delivery_failed',
                'message' => $result->message ?? 'Test webhook delivery failed. Check the URL and secret.',
                'receiver_status' => $result->status,
                'receiver_body' => $result->receiverBody,
            ], 502);
        }

        return response()->json(['ok' => true, 'message' => 'Test webhook sent']);
    }

    /** @return array<int, string> */
    private function diffEventWebhookConfig(array $before, array $after): array
    {
        $changed = [];

        if (count($before['webhooks'] ?? []) !== count($after['webhooks'] ?? [])) {
            $changed[] = 'webhooks.count';
        }

        $beforeById = collect($before['webhooks'] ?? [])->keyBy('id');
        foreach ($after['webhooks'] ?? [] as $webhook) {
            $id = (string) $webhook['id'];
            $previous = $beforeById->get($id);

            if (! $previous) {
                $changed[] = "webhooks.{$id}.created";

                continue;
            }

            foreach (['name', 'url', 'enabled'] as $field) {
                if (($previous[$field] ?? null) !== ($webhook[$field] ?? null)) {
                    $changed[] = "webhooks.{$id}.{$field}";
                }
            }

            foreach (SettingsService::EVENT_WEBHOOK_KEYS as $eventKey) {
                if (($previous['events'][$eventKey] ?? false) !== ($webhook['events'][$eventKey] ?? false)) {
                    $changed[] = "webhooks.{$id}.events.{$eventKey}";
                }
            }
        }

        return $changed;
    }
}
