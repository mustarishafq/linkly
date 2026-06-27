<?php

namespace App\Services;

use App\Support\SqlDate;
use Illuminate\Support\Facades\DB;

class EntityService
{
    public function __construct(private AuditLogService $audit) {}

    public function tableFor(string $entity): ?string
    {
        if (! in_array($entity, config('linkly.entities', []), true)) {
            return null;
        }

        return 'entity_'.strtolower($entity);
    }

    public function fetchAll(string $table): array
    {
        return DB::table($table)
            ->select('id', 'payload', 'created_date', 'updated_date')
            ->get()
            ->map(fn ($row) => $this->hydrateRow($row))
            ->all();
    }

    public function find(string $table, string $id): ?array
    {
        $row = DB::table($table)
            ->select('id', 'payload', 'created_date', 'updated_date')
            ->where('id', $id)
            ->first();

        return $row ? $this->hydrateRow($row) : null;
    }

    public function create(string $table, string $entity, array $body, ?string $actorUserId): array
    {
        $now = SqlDate::now();
        $payload = $body;
        unset($payload['id'], $payload['created_date'], $payload['updated_date']);

        $id = DB::table($table)->insertGetId([
            'payload' => json_encode($payload),
            'created_date' => $now,
            'updated_date' => $now,
        ]);

        $record = [
            'id' => $id,
            'created_date' => now()->toIso8601String(),
            'updated_date' => now()->toIso8601String(),
            ...$body,
        ];

        $this->audit->entityCreated($actorUserId, $entity, $record);

        return $record;
    }

    public function bulkCreate(string $table, string $entity, array $items, ?string $actorUserId): array
    {
        $created = [];

        foreach ($items as $item) {
            $now = SqlDate::now();
            $payload = $item;
            unset($payload['id'], $payload['created_date'], $payload['updated_date']);

            $id = DB::table($table)->insertGetId([
                'payload' => json_encode($payload),
                'created_date' => $now,
                'updated_date' => $now,
            ]);

            $created[] = [
                'id' => $id,
                'created_date' => now()->toIso8601String(),
                'updated_date' => now()->toIso8601String(),
                ...$item,
            ];
        }

        if (count($created) === 1) {
            $this->audit->entityCreated($actorUserId, $entity, $created[0]);
        } elseif (count($created) > 1) {
            $this->audit->entityBulkCreated($actorUserId, $entity, $created);
        }

        return $created;
    }

    public function update(string $table, string $entity, string $id, array $body, ?string $actorUserId): ?array
    {
        $existing = DB::table($table)->where('id', $id)->first();
        if (! $existing) {
            return null;
        }

        $before = $this->parsePayload($existing->payload);
        $updated = [
            'id' => $existing->id,
            'created_date' => SqlDate::toIso8601($existing->created_date),
            'updated_date' => now()->toIso8601String(),
            ...$before,
            ...$body,
        ];

        $nextPayload = $updated;
        unset($nextPayload['id'], $nextPayload['created_date'], $nextPayload['updated_date']);

        DB::table($table)->where('id', $id)->update([
            'payload' => json_encode($nextPayload),
            'updated_date' => SqlDate::now(),
        ]);

        $this->audit->entityUpdated($actorUserId, $entity, $id, $before, $nextPayload);

        return $updated;
    }

    public function delete(string $table, string $entity, string $id, ?string $actorUserId): ?array
    {
        $existing = DB::table($table)->where('id', $id)->first();
        if (! $existing) {
            return null;
        }

        $payload = $this->parsePayload($existing->payload);
        $record = [
            'id' => $existing->id,
            'created_date' => SqlDate::toIso8601($existing->created_date),
            'updated_date' => SqlDate::toIso8601($existing->updated_date),
            ...$payload,
        ];

        DB::table($table)->where('id', $id)->delete();
        $this->audit->entityDeleted($actorUserId, $entity, $record);

        return $record;
    }

    public function sortRecords(array $records, ?string $sortBy): array
    {
        if (! $sortBy) {
            return $records;
        }

        $desc = str_starts_with($sortBy, '-');
        $field = $desc ? substr($sortBy, 1) : $sortBy;

        usort($records, function ($a, $b) use ($field, $desc) {
            $av = $a[$field] ?? null;
            $bv = $b[$field] ?? null;

            if ($av === null && $bv === null) {
                return 0;
            }
            if ($av === null) {
                return $desc ? 1 : -1;
            }
            if ($bv === null) {
                return $desc ? -1 : 1;
            }

            if (is_numeric($av) && is_numeric($bv)) {
                return $desc ? $bv <=> $av : $av <=> $bv;
            }

            $cmp = strcmp((string) $av, (string) $bv);

            return $desc ? -$cmp : $cmp;
        });

        return $records;
    }

    public function applyLimit(array $records, mixed $limit): array
    {
        $max = (int) $limit;
        if ($max <= 0) {
            return $records;
        }

        return array_slice($records, 0, $max);
    }

    public function matchesWhere(array $row, array $where): bool
    {
        foreach ($where as $key => $expected) {
            $actual = $row[$key] ?? null;
            if (is_array($expected)) {
                if (! in_array($actual, $expected, true)) {
                    return false;
                }
            } elseif ($actual !== $expected) {
                return false;
            }
        }

        return true;
    }

    private function hydrateRow(object $row): array
    {
        $payload = $this->parsePayload($row->payload);

        return [
            'id' => (int) $row->id,
            'created_date' => SqlDate::toIso8601($row->created_date),
            'updated_date' => SqlDate::toIso8601($row->updated_date),
            ...$payload,
        ];
    }

    private function parsePayload(mixed $value): array
    {
        if (! $value) {
            return [];
        }

        if (is_string($value)) {
            return json_decode($value, true) ?: [];
        }

        if (is_array($value)) {
            return $value;
        }

        return (array) $value;
    }
}
