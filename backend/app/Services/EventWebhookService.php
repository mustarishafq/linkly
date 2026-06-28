<?php

namespace App\Services;

use App\Support\EventWebhookMetadata;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EventWebhookService
{
    private const USER_AGENT = 'Linkly-Webhooks/1.0';

    public function __construct(private SettingsService $settings) {}

    /**
     * @param  array<int, int|string>  $recipientUserIds
     * @param  array<string, mixed>  $domainObject
     */
    public function dispatch(
        string $event,
        array $recipientUserIds,
        string $title,
        string $body,
        array $domainObject,
        ?string $actionPath = null,
    ): void {
        $metadata = EventWebhookMetadata::forEvent($event);
        if (! $metadata) {
            return;
        }

        $config = $this->settings->getEventWebhookConfig();
        $webhooks = array_values(array_filter(
            $config['webhooks'] ?? [],
            fn (array $webhook) => ($webhook['enabled'] ?? false)
                && trim((string) ($webhook['url'] ?? '')) !== ''
                && strlen((string) ($webhook['secret'] ?? '')) >= 32
                && ($webhook['events'][$event] ?? false)
        ));

        if ($webhooks === []) {
            return;
        }

        $domainKey = EventWebhookMetadata::domainKey($event);
        $actionUrl = $this->buildActionUrl($actionPath);
        $recipients = $this->resolveRecipients($recipientUserIds);

        foreach ($webhooks as $webhook) {
            foreach ($recipients as $recipient) {
                $payload = [
                    'event' => $event,
                    'timestamp' => now()->utc()->toIso8601String(),
                    'webhook_id' => (string) $webhook['id'],
                    'type' => $metadata['type'],
                    'category' => $metadata['category'],
                    'title' => $title,
                    'body' => $body,
                    'action_url' => $actionUrl,
                    'nexus_sso_id' => $recipient,
                    $domainKey => $domainObject,
                ];

                $this->sendPayload(
                    trim((string) $webhook['url']),
                    (string) $webhook['secret'],
                    $payload
                );
            }
        }
    }

    /**
     * @return array<int, string|null>
     */
    public function resolveRecipients(array $recipientUserIds): array
    {
        $ids = array_values(array_unique(array_filter($recipientUserIds, fn ($id) => $id !== null && $id !== '')));
        if ($ids === []) {
            return [null];
        }

        $ssoIds = $this->settings->resolveNexusSsoIds($ids);
        $distinct = array_values(array_unique(array_filter($ssoIds, fn ($id) => $id !== null && $id !== '')));

        if ($distinct === []) {
            return [null];
        }

        return $distinct;
    }

    /** @param  array<string, mixed>  $payload */
    public function sendTestPayload(array $webhook, array $payload): bool
    {
        $url = trim((string) ($webhook['url'] ?? ''));
        $secret = (string) ($webhook['secret'] ?? '');

        if ($url === '' || strlen($secret) < 32) {
            return false;
        }

        return $this->sendPayload($url, $secret, $payload, true);
    }

    private function buildActionUrl(?string $actionPath): string
    {
        $base = rtrim((string) config('linkly.frontend_url'), '/');
        $path = $actionPath ? '/'.ltrim($actionPath, '/') : '';

        return $base.$path;
    }

    /** @param  array<string, mixed>  $payload */
    private function sendPayload(string $url, string $secret, array $payload, bool $throwOnFailure = false): bool
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'X-Webhook-Secret' => $secret,
                    'User-Agent' => self::USER_AGENT,
                    'Content-Type' => 'application/json',
                ])
                ->post($url, $payload);

            if ($throwOnFailure && ! $response->successful()) {
                Log::warning('Event webhook test delivery failed', [
                    'event' => $payload['event'] ?? null,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return false;
            }

            return $response->successful();
        } catch (\Throwable $exception) {
            Log::warning('Event webhook delivery failed', [
                'event' => $payload['event'] ?? null,
                'message' => $exception->getMessage(),
            ]);

            return false;
        }
    }
}
