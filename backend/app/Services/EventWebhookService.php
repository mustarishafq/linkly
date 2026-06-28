<?php

namespace App\Services;

use App\Support\EventWebhookMetadata;
use App\Support\WebhookDeliveryResult;
use Illuminate\Http\Client\ConnectionException;
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

                $this->deliverPayload(
                    trim((string) $webhook['url']),
                    (string) $webhook['secret'],
                    $payload,
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
    public function sendTestPayload(array $webhook, array $payload): WebhookDeliveryResult
    {
        $url = trim((string) ($webhook['url'] ?? ''));
        $secret = (string) ($webhook['secret'] ?? '');

        if ($url === '' || strlen($secret) < 32) {
            return WebhookDeliveryResult::failure('Webhook URL and secret are required.');
        }

        return $this->deliverPayload($url, $secret, $payload, true);
    }

    private function buildActionUrl(?string $actionPath): string
    {
        $base = rtrim((string) config('linkly.frontend_url'), '/');
        $path = $actionPath ? '/'.ltrim($actionPath, '/') : '';

        return $base.$path;
    }

    /** @param  array<string, mixed>  $payload */
    private function deliverPayload(
        string $url,
        string $secret,
        array $payload,
        bool $logFailure = false,
    ): WebhookDeliveryResult {
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'X-Webhook-Secret' => $secret,
                    'User-Agent' => self::USER_AGENT,
                    'Accept' => 'application/json',
                ])
                ->withBody(json_encode($payload, JSON_THROW_ON_ERROR), 'application/json')
                ->post($url);

            if ($response->successful()) {
                return WebhookDeliveryResult::success($response->status());
            }

            $bodySnippet = $this->bodySnippet($response->body());
            $message = $this->failureMessage($response->status(), $bodySnippet);

            if ($logFailure) {
                Log::warning('Event webhook test delivery failed', [
                    'event' => $payload['event'] ?? null,
                    'url' => $url,
                    'status' => $response->status(),
                    'body' => $bodySnippet,
                ]);
            }

            return WebhookDeliveryResult::failure($message, $response->status(), $bodySnippet);
        } catch (ConnectionException $exception) {
            $message = 'Could not connect to the webhook URL. Check the URL and that outbound HTTPS is allowed from this server.';

            if ($logFailure) {
                Log::warning('Event webhook test delivery failed', [
                    'event' => $payload['event'] ?? null,
                    'url' => $url,
                    'message' => $exception->getMessage(),
                ]);
            } else {
                Log::warning('Event webhook delivery failed', [
                    'event' => $payload['event'] ?? null,
                    'url' => $url,
                    'message' => $exception->getMessage(),
                ]);
            }

            return WebhookDeliveryResult::failure($message);
        } catch (\Throwable $exception) {
            if ($logFailure) {
                Log::warning('Event webhook test delivery failed', [
                    'event' => $payload['event'] ?? null,
                    'url' => $url,
                    'message' => $exception->getMessage(),
                ]);
            } else {
                Log::warning('Event webhook delivery failed', [
                    'event' => $payload['event'] ?? null,
                    'url' => $url,
                    'message' => $exception->getMessage(),
                ]);
            }

            return WebhookDeliveryResult::failure($exception->getMessage());
        }
    }

    private function failureMessage(int $status, ?string $bodySnippet): string
    {
        return match (true) {
            $status === 401 => 'Receiver rejected the shared secret (HTTP 401). Use the same secret on both sides.',
            $status === 404 => 'Webhook URL not found (HTTP 404). Check the receiver endpoint path.',
            $status === 405 => 'Receiver does not accept POST requests (HTTP 405).',
            $status === 422 => 'Receiver rejected the payload (HTTP 422).'.($bodySnippet ? " {$bodySnippet}" : ''),
            $status >= 500 => "Receiver server error (HTTP {$status}).",
            default => "Receiver returned HTTP {$status}.".($bodySnippet ? " {$bodySnippet}" : ''),
        };
    }

    private function bodySnippet(?string $body): ?string
    {
        if ($body === null || $body === '') {
            return null;
        }

        $decoded = json_decode($body, true);
        if (is_array($decoded) && isset($decoded['message']) && is_string($decoded['message'])) {
            return $decoded['message'];
        }

        $plain = trim(preg_replace('/\s+/', ' ', strip_tags($body)) ?? '');

        return $plain !== '' ? mb_substr($plain, 0, 200) : null;
    }
}
