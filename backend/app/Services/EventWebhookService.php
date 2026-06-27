<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EventWebhookService
{
    public function __construct(private SettingsService $settings) {}

    /**
     * @param  array<int, string>  $recipientUserIds
     * @param  array<string, mixed>  $context
     */
    public function dispatch(string $event, array $recipientUserIds, string $title, string $body, array $context = []): void
    {
        $config = $this->settings->getEventWebhookConfig();

        if (! ($config['enabled'] ?? false)) {
            return;
        }

        if (! ($config['events'][$event] ?? false)) {
            return;
        }

        $url = trim((string) ($config['url'] ?? ''));
        $secret = (string) ($config['secret'] ?? '');

        if ($url === '' || strlen($secret) < 32) {
            return;
        }

        $recipients = array_values(array_unique(array_filter($recipientUserIds)));

        foreach ($recipients as $userId) {
            $this->sendPayload($url, $secret, [
                'event' => $event,
                'recipient_user_id' => $userId,
                'title' => $title,
                'body' => $body,
                'timestamp' => now()->toIso8601String(),
                'context' => $context,
            ]);
        }
    }

    /** @param  array<string, mixed>  $payload */
    private function sendPayload(string $url, string $secret, array $payload): void
    {
        try {
            Http::timeout(5)
                ->withHeaders(['X-Webhook-Secret' => $secret])
                ->post($url, $payload);
        } catch (\Throwable $exception) {
            Log::warning('Event webhook delivery failed', [
                'event' => $payload['event'] ?? null,
                'message' => $exception->getMessage(),
            ]);
        }
    }
}
