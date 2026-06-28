<?php

namespace App\Support;

class EventWebhookMetadata
{
    /** @return array{type: string, category: string, recipientKeys: array<int, string>}|null */
    public static function forEvent(string $event): ?array
    {
        return match ($event) {
            'link.created' => [
                'type' => 'info',
                'category' => 'task',
                'recipientKeys' => ['owner'],
            ],
            'link.updated' => [
                'type' => 'info',
                'category' => 'task',
                'recipientKeys' => ['owner'],
            ],
            'link.deleted' => [
                'type' => 'warning',
                'category' => 'task',
                'recipientKeys' => ['owner'],
            ],
            'user.registered' => [
                'type' => 'info',
                'category' => 'approval',
                'recipientKeys' => ['admin'],
            ],
            'user.approved' => [
                'type' => 'success',
                'category' => 'approval',
                'recipientKeys' => ['user'],
            ],
            'link.metric_threshold' => [
                'type' => 'info',
                'category' => 'task',
                'recipientKeys' => ['subscriber'],
            ],
            'webhook.test' => [
                'type' => 'info',
                'category' => 'system',
                'recipientKeys' => ['actor'],
            ],
            default => null,
        };
    }

    public static function domainKey(string $event): string
    {
        return explode('.', $event, 2)[0];
    }
}
