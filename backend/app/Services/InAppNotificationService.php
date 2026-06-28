<?php

namespace App\Services;

use App\Support\SqlDate;
use Illuminate\Support\Facades\DB;

class InAppNotificationService
{
    /**
     * @param  array<int, string>  $recipientUserIds
     * @param  array<string, mixed>  $context
     */
    public function dispatch(
        string $type,
        array $recipientUserIds,
        string $title,
        string $body,
        array $context = [],
    ): void {
        $recipients = array_values(array_unique(array_filter($recipientUserIds)));
        if ($recipients === []) {
            return;
        }

        $now = SqlDate::now();
        $linkId = isset($context['link']['id']) ? (int) $context['link']['id'] : null;
        $ruleId = isset($context['rule']['id']) ? (int) $context['rule']['id'] : null;
        $metadata = $context !== [] ? json_encode($context) : null;

        foreach ($recipients as $userId) {
            DB::table('user_notifications')->insert([
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'body' => $body,
                'link_id' => $linkId,
                'rule_id' => $ruleId,
                'is_read' => false,
                'metadata' => $metadata,
                'created_date' => $now,
            ]);
        }
    }

    /** @return array<int, array<string, mixed>> */
    public function listForUser(string $userId, int $limit = 50): array
    {
        return DB::table('user_notifications')
            ->where('user_id', $userId)
            ->orderByDesc('created_date')
            ->limit(max(1, min($limit, 200)))
            ->get()
            ->map(fn ($row) => $this->hydrate($row))
            ->all();
    }

    public function unreadCountForUser(string $userId): int
    {
        return (int) DB::table('user_notifications')
            ->where('user_id', $userId)
            ->where('is_read', false)
            ->count();
    }

    /** @return array<int, array<string, mixed>> */
    public function listUnreadSince(string $userId, ?string $sinceIso = null): array
    {
        $query = DB::table('user_notifications')
            ->where('user_id', $userId)
            ->where('is_read', false);

        if ($sinceIso) {
            try {
                $since = SqlDate::now(SqlDate::parse($sinceIso));
                $query->where('created_date', '>', $since);
            } catch (\Throwable) {
                return [];
            }
        }

        return $query
            ->orderBy('created_date')
            ->get()
            ->map(fn ($row) => $this->hydrate($row))
            ->all();
    }

    public function markRead(string $userId, string $notificationId): bool
    {
        return DB::table('user_notifications')
            ->where('id', $notificationId)
            ->where('user_id', $userId)
            ->update(['is_read' => true]) > 0;
    }

    public function markAllRead(string $userId): int
    {
        return DB::table('user_notifications')
            ->where('user_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true]);
    }

    private function hydrate(object $row): array
    {
        $metadata = null;
        if ($row->metadata) {
            $metadata = is_string($row->metadata)
                ? json_decode($row->metadata, true)
                : (array) $row->metadata;
        }

        return [
            'id' => (int) $row->id,
            'user_id' => (int) $row->user_id,
            'type' => $row->type,
            'title' => $row->title,
            'body' => $row->body,
            'link_id' => $row->link_id !== null ? (int) $row->link_id : null,
            'rule_id' => $row->rule_id !== null ? (int) $row->rule_id : null,
            'is_read' => (bool) $row->is_read,
            'metadata' => $metadata,
            'created_date' => SqlDate::toIso8601($row->created_date),
        ];
    }
}
