<?php

namespace App\Services;

use App\Support\SqlDate;
use Illuminate\Support\Facades\DB;

class AuditLogService
{
    private const SENSITIVE_KEYS = [
        'password',
        'password_hash',
        'secret',
        'token',
        'reset_token',
        'verification_token',
        'access_token',
    ];

    private const ENTITY_LABEL_FIELDS = [
        'ShortLink' => ['slug', 'title', 'destination_url'],
        'Campaign' => ['name', 'title'],
        'CustomDomain' => ['domain'],
        'QRDesign' => ['name', 'link_id'],
        'RedirectRule' => ['name', 'link_id', 'rule_type'],
        'ABVariant' => ['variant_name', 'name', 'link_id'],
        'ClickLog' => ['slug', 'link_id', 'country'],
        'LinkNotificationRule' => ['label', 'link_id', 'metric'],
    ];

    private const ENTITY_SNAPSHOT_FIELDS = [
        'ShortLink' => ['slug', 'title', 'destination_url', 'status', 'campaign_id', 'domain_id', 'tags'],
        'Campaign' => ['name', 'title', 'status', 'description'],
        'CustomDomain' => ['domain', 'verification_status', 'is_primary', 'owner_user_id'],
        'QRDesign' => ['name', 'link_id', 'is_active', 'foreground_color', 'background_color'],
        'RedirectRule' => ['name', 'link_id', 'is_active', 'rule_type', 'target_url'],
        'ABVariant' => ['name', 'variant_name', 'link_id', 'weight', 'destination_url'],
        'ClickLog' => ['slug', 'link_id', 'country', 'browser', 'device_type', 'is_converted', 'is_unique', 'is_test'],
        'LinkNotificationRule' => ['label', 'link_id', 'metric', 'trigger_mode', 'trigger_value', 'subscriber_user_ids'],
    ];

    public function write(array $data): void
    {
        DB::table('audit_logs')->insert([
            'actor_user_id' => $data['actor_user_id'] ?? null,
            'action' => $data['action'],
            'target_user_id' => $data['target_user_id'] ?? null,
            'details' => isset($data['details']) ? json_encode($data['details']) : null,
            'created_date' => SqlDate::now(),
        ]);
    }

    public function entityCreated(?string $actorUserId, string $entity, array $record): void
    {
        $payload = $record;
        unset($payload['created_date'], $payload['updated_date']);

        $this->write([
            'actor_user_id' => $actorUserId,
            'action' => 'entity_created',
            'details' => [
                'entity' => $entity,
                'entity_id' => $record['id'],
                'label' => $this->entityLabel($entity, $payload),
                'snapshot' => $this->entitySnapshot($entity, $payload),
            ],
        ]);
    }

    public function entityBulkCreated(?string $actorUserId, string $entity, array $records): void
    {
        $this->write([
            'actor_user_id' => $actorUserId,
            'action' => 'entity_bulk_created',
            'details' => [
                'entity' => $entity,
                'count' => count($records),
                'entity_ids' => array_slice(array_column($records, 'id'), 0, 100),
                'labels' => array_slice(array_map(fn ($r) => $this->entityLabel($entity, $r), $records), 0, 25),
            ],
        ]);
    }

    public function entityUpdated(
        ?string $actorUserId,
        string $entity,
        string $entityId,
        array $before,
        array $after,
        ?string $operation = null
    ): void {
        $changes = $this->diffChanges($before, $after);
        $changedFields = array_keys($changes);

        $this->write([
            'actor_user_id' => $actorUserId,
            'action' => 'entity_updated',
            'details' => [
                'entity' => $entity,
                'entity_id' => $entityId,
                'label' => $this->entityLabel($entity, $after),
                'operation' => $operation,
                'changed_fields' => $changedFields,
                'changes' => $changedFields ? $changes : null,
                'snapshot' => $this->entitySnapshot($entity, $after),
            ],
        ]);
    }

    public function entityDeleted(?string $actorUserId, string $entity, array $record): void
    {
        $this->write([
            'actor_user_id' => $actorUserId,
            'action' => 'entity_deleted',
            'details' => [
                'entity' => $entity,
                'entity_id' => $record['id'],
                'label' => $this->entityLabel($entity, $record),
                'snapshot' => $this->entitySnapshot($entity, $record),
            ],
        ]);
    }

    private function entityLabel(string $entity, array $payload): string
    {
        foreach (self::ENTITY_LABEL_FIELDS[$entity] ?? ['id'] as $field) {
            if (! empty($payload[$field])) {
                return (string) $payload[$field];
            }
        }

        return ! empty($payload['id']) ? (string) $payload['id'] : $entity;
    }

    private function entitySnapshot(string $entity, array $payload): array
    {
        $fields = self::ENTITY_SNAPSHOT_FIELDS[$entity] ?? array_slice(array_keys($payload), 0, 12);
        $snapshot = [];

        foreach ($fields as $field) {
            if (! array_key_exists($field, $payload)) {
                continue;
            }
            $snapshot[$field] = $this->sanitizeValue($field, $payload[$field]);
        }

        return $snapshot;
    }

    private function diffChanges(array $before, array $after): array
    {
        $keys = array_unique(array_merge(array_keys($before), array_keys($after)));
        $changes = [];

        foreach ($keys as $key) {
            if (in_array($key, self::SENSITIVE_KEYS, true)) {
                continue;
            }

            $from = $before[$key] ?? null;
            $to = $after[$key] ?? null;

            if (json_encode($from) === json_encode($to)) {
                continue;
            }

            $changes[$key] = [
                'from' => $this->sanitizeValue($key, $from),
                'to' => $this->sanitizeValue($key, $to),
            ];
        }

        return $changes;
    }

    private function sanitizeValue(string $key, mixed $value): mixed
    {
        if (in_array($key, self::SENSITIVE_KEYS, true)) {
            return '[redacted]';
        }

        if (is_array($value) || is_object($value)) {
            $text = json_encode($value);

            return strlen($text) > 240 ? substr($text, 0, 240).'…' : $value;
        }

        if (is_string($value) && strlen($value) > 240) {
            return substr($value, 0, 240).'…';
        }

        return $value;
    }
}
