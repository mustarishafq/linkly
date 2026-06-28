<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class LinkWebhookService
{
    public function __construct(
        private EventWebhookService $webhooks,
        private InAppNotificationService $inApp,
    ) {}

    /** @param  array<string, mixed>  $link */
    public function linkCreated(array $link, int|string|null $ownerUserId): void
    {
        $label = $this->linkLabel($link);
        $this->dispatchLinkEvent(
            'link.created',
            $link,
            $ownerUserId,
            'New link created',
            "Short link \"{$label}\" was created.",
            '/links/'.($link['id'] ?? ''),
        );
    }

    /** @param  array<string, mixed>  $link */
    public function linkUpdated(array $link, int|string|null $ownerUserId): void
    {
        $label = $this->linkLabel($link);
        $this->dispatchLinkEvent(
            'link.updated',
            $link,
            $ownerUserId,
            'Link updated',
            "Short link \"{$label}\" was updated.",
            '/links/'.($link['id'] ?? ''),
        );
    }

    /** @param  array<string, mixed>  $link */
    public function linkDeleted(array $link, int|string|null $ownerUserId): void
    {
        $label = $this->linkLabel($link);
        $this->dispatchLinkEvent(
            'link.deleted',
            $link,
            $ownerUserId,
            'Link deleted',
            "Short link \"{$label}\" was removed.",
            '/links',
        );
    }

    public function userRegistered(object $user): void
    {
        $adminIds = DB::table('users')
            ->where('role', 'admin')
            ->where('is_approved', true)
            ->pluck('id')
            ->all();

        $name = trim((string) ($user->full_name ?? '')) ?: (string) ($user->email ?? 'A user');
        $title = 'New user registration';
        $body = "{$name} registered and is awaiting approval.";
        $snapshot = $this->userSnapshot($user);
        $context = ['user' => $snapshot];

        if ($adminIds !== []) {
            $this->inApp->dispatch('user.registered', $adminIds, $title, $body, $context);
        }

        $this->webhooks->dispatch(
            'user.registered',
            $adminIds,
            $title,
            $body,
            $snapshot,
            '/admin/users',
        );
    }

    public function userApproved(object $user): void
    {
        $name = trim((string) ($user->full_name ?? '')) ?: (string) ($user->email ?? 'Your account');
        $title = 'Account approved';
        $body = "{$name}'s account has been approved.";
        $snapshot = $this->userSnapshot($user);
        $context = ['user' => $snapshot];

        $this->inApp->dispatch('user.approved', [(int) $user->id], $title, $body, $context);

        $this->webhooks->dispatch(
            'user.approved',
            [(int) $user->id],
            $title,
            $body,
            $snapshot,
            '/dashboard',
        );
    }

    /**
     * @param  array<string, mixed>  $link
     * @param  array<string, mixed>  $rule
     * @param  array<int, int|string>  $subscriberUserIds
     */
    public function linkMetricThreshold(
        array $link,
        array $rule,
        array $subscriberUserIds,
        string $title,
        string $body,
        array $metrics,
        float $metricValue,
        string $metricKey,
    ): void {
        $domainObject = [
            ...$this->linkSnapshot($link),
            'rule' => [
                'id' => $rule['id'] ?? null,
                'metric' => $rule['metric'] ?? null,
                'notify_type' => $rule['notify_type'] ?? null,
                'target_value' => $rule['target_value'] ?? $rule['trigger_value'] ?? null,
                'label' => $rule['label'] ?? null,
            ],
            'metrics' => $metrics,
            'metric_value' => $metricValue,
            'metric_key' => $metricKey,
        ];

        $this->webhooks->dispatch(
            'link.metric_threshold',
            $subscriberUserIds,
            $title,
            $body,
            $domainObject,
            '/links/'.($link['id'] ?? ''),
        );
    }

    public function sendTest(array $webhook, object $actor): bool
    {
        $now = now()->utc()->toIso8601String();
        $actorSsoId = $this->webhooks->resolveRecipients([(int) $actor->id])[0] ?? null;

        $payload = [
            'event' => 'webhook.test',
            'timestamp' => $now,
            'webhook_id' => (string) ($webhook['id'] ?? ''),
            'type' => 'info',
            'category' => 'system',
            'title' => 'Test notification',
            'body' => 'This is a test webhook delivery from EMZI Nexus Linkly.',
            'action_url' => rtrim((string) config('linkly.frontend_url'), '/').'/links',
            'nexus_sso_id' => $actorSsoId ?? 'test-nexus-sso-id',
            'link' => [
                'id' => 'test-link-id',
                'slug' => 'test-link',
                'title' => 'Test Link',
                'destination_url' => 'https://example.com',
                'status' => 'active',
                'tags' => [],
                'created_date' => $now,
            ],
        ];

        return $this->webhooks->sendTestPayload($webhook, $payload);
    }

    /**
     * @param  array<string, mixed>  $link
     * @param  array<int, int|string>  $recipientUserIds
     */
    private function dispatchLinkEvent(
        string $event,
        array $link,
        int|string|null $ownerUserId,
        string $title,
        string $body,
        string $actionPath,
    ): void {
        $snapshot = $this->linkSnapshot($link);
        $recipients = $this->normalizeRecipientIds($ownerUserId ? [$ownerUserId] : []);
        $context = [
            'link' => [
                'id' => $link['id'] ?? null,
                'slug' => $link['slug'] ?? null,
                'title' => $link['title'] ?? null,
            ],
        ];

        if ($recipients !== []) {
            $this->inApp->dispatch($event, $recipients, $title, $body, $context);
        }

        $this->webhooks->dispatch($event, $recipients, $title, $body, $snapshot, $actionPath);
    }

    /** @param  array<int, int|string|null>  $ids @return array<int, int> */
    private function normalizeRecipientIds(array $ids): array
    {
        return array_values(array_unique(array_filter(
            array_map(fn ($id) => is_numeric($id) ? (int) $id : null, $ids),
            fn ($id) => $id !== null && $id > 0,
        )));
    }

    /** @param  array<string, mixed>  $link */
    private function linkLabel(array $link): string
    {
        $title = trim((string) ($link['title'] ?? ''));

        return $title !== '' ? $title : '/'.($link['slug'] ?? 'link');
    }

    /** @param  array<string, mixed>  $link @return array<string, mixed> */
    private function linkSnapshot(array $link): array
    {
        return [
            'id' => $link['id'] ?? null,
            'slug' => $link['slug'] ?? null,
            'title' => $link['title'] ?? null,
            'destination_url' => $link['destination_url'] ?? null,
            'status' => $link['status'] ?? 'active',
            'campaign_id' => $link['campaign_id'] ?? null,
            'domain_id' => $link['domain_id'] ?? null,
            'custom_domain' => $link['custom_domain'] ?? null,
            'tags' => $link['tags'] ?? [],
            'created_date' => $link['created_date'] ?? null,
        ];
    }

    /** @return array<string, mixed> */
    private function userSnapshot(object $user): array
    {
        return [
            'id' => $user->id ?? null,
            'email' => $user->email ?? null,
            'full_name' => $user->full_name ?? null,
            'role' => $user->role ?? 'user',
            'is_approved' => (bool) ($user->is_approved ?? false),
        ];
    }
}
