<?php

namespace App\Services;

use App\Support\SqlDate;
use Illuminate\Support\Facades\DB;

class QrDesignService
{
    private const QR_STYLES = ['square', 'rounded', 'dots'];

    private const QR_SIZES = [200, 300, 400, 600, 800];

    public function __construct(private AuditLogService $audit) {}

    public function fetchAll(): array
    {
        return DB::table('qr_designs')
            ->orderByDesc('created_date')
            ->get()
            ->map(fn ($row) => $this->hydrateRow($row))
            ->all();
    }

    public function filter(array $where, string $sortBy = '-created_date', int $limit = 200): array
    {
        $all = $this->fetchAll();
        $filtered = array_values(array_filter($all, fn ($row) => $this->matchesWhere($row, $where)));

        return $this->applyLimit($this->sortRecords($filtered, $sortBy), $limit);
    }

    public function find(int $id): ?array
    {
        $row = DB::table('qr_designs')->where('id', $id)->first();

        return $row ? $this->hydrateRow($row) : null;
    }

    public function create(array $body, ?string $actorUserId, bool $audit = true): array
    {
        $now = SqlDate::now();
        $data = $this->normalizeDesignInput($body);

        if (empty($data['link_id'])) {
            throw new \InvalidArgumentException('link_id is required');
        }

        $id = DB::table('qr_designs')->insertGetId([
            ...$data,
            'created_date' => $now,
            'updated_date' => $now,
        ]);

        $record = [
            'id' => $id,
            'created_date' => now()->toIso8601String(),
            'updated_date' => now()->toIso8601String(),
            ...$data,
        ];

        if ($audit) {
            $this->audit->entityCreated($actorUserId, 'QRDesign', $record);
        }

        return $record;
    }

    public function bulkCreate(array $items, ?string $actorUserId): array
    {
        $created = [];

        foreach ($items as $item) {
            $created[] = $this->create($item, $actorUserId, audit: false);
        }

        if (count($created) === 1) {
            $this->audit->entityCreated($actorUserId, 'QRDesign', $created[0]);
        } elseif (count($created) > 1) {
            $this->audit->entityBulkCreated($actorUserId, 'QRDesign', $created);
        }

        return $created;
    }

    public function update(int $id, array $body, ?string $actorUserId): ?array
    {
        $existing = DB::table('qr_designs')->where('id', $id)->first();
        if (! $existing) {
            return null;
        }

        $before = $this->hydrateRow($existing);
        $patch = $this->normalizeDesignInput($body, partial: true);
        $nextData = array_merge($this->rowToData($existing), $patch);

        DB::table('qr_designs')->where('id', $id)->update([
            ...$nextData,
            'updated_date' => SqlDate::now(),
        ]);

        $updated = [
            'id' => (int) $existing->id,
            'created_date' => SqlDate::toIso8601($existing->created_date),
            'updated_date' => now()->toIso8601String(),
            ...$nextData,
        ];

        $this->audit->entityUpdated($actorUserId, 'QRDesign', (string) $id, $before, $updated);

        return $updated;
    }

    public function delete(int $id, ?string $actorUserId): ?array
    {
        $existing = DB::table('qr_designs')->where('id', $id)->first();
        if (! $existing) {
            return null;
        }

        $record = $this->hydrateRow($existing);
        DB::table('qr_designs')->where('id', $id)->delete();
        $this->audit->entityDeleted($actorUserId, 'QRDesign', $record);

        return $record;
    }

    public function sortRecords(array $records, string $sortBy): array
    {
        $desc = str_starts_with($sortBy, '-');
        $field = ltrim($sortBy, '-');

        usort($records, function ($a, $b) use ($field, $desc) {
            $left = $a[$field] ?? null;
            $right = $b[$field] ?? null;

            if ($left === $right) {
                return 0;
            }

            $cmp = $left <=> $right;

            return $desc ? -$cmp : $cmp;
        });

        return $records;
    }

    public function applyLimit(array $records, int $limit): array
    {
        if ($limit <= 0) {
            return $records;
        }

        return array_slice($records, 0, $limit);
    }

    public function matchesWhere(array $row, array $where): bool
    {
        foreach ($where as $key => $expected) {
            $actual = $row[$key] ?? null;
            if (is_array($expected)) {
                if (! in_array($actual, $expected, true)) {
                    return false;
                }
            } elseif ((string) $actual !== (string) $expected) {
                return false;
            }
        }

        return true;
    }

    private function hydrateRow(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'created_date' => SqlDate::toIso8601($row->created_date),
            'updated_date' => SqlDate::toIso8601($row->updated_date),
            ...$this->rowToData($row),
        ];
    }

    private function rowToData(object $row): array
    {
        return [
            'link_id' => (int) $row->link_id,
            'name' => (string) $row->name,
            'fg_color' => (string) $row->fg_color,
            'bg_color' => (string) $row->bg_color,
            'eye_color' => (string) $row->eye_color,
            'style' => (string) $row->style,
            'size' => (int) $row->size,
            'logo_size' => (int) $row->logo_size,
            'logo_url' => (string) $row->logo_url,
            'source' => (string) $row->source,
            'is_active' => (bool) $row->is_active,
        ];
    }

    private function normalizeDesignInput(array $body, bool $partial = false): array
    {
        $normalized = [];

        if (array_key_exists('link_id', $body) || ! $partial) {
            $linkId = (int) ($body['link_id'] ?? 0);
            if ($linkId <= 0 && ! $partial) {
                throw new \InvalidArgumentException('link_id is required');
            }
            if ($linkId > 0) {
                $normalized['link_id'] = $linkId;
            }
        }

        if (array_key_exists('name', $body) || ! $partial) {
            $name = trim((string) ($body['name'] ?? ''));
            if ($name === '' && ! $partial) {
                throw new \InvalidArgumentException('name is required');
            }
            if ($name !== '') {
                $normalized['name'] = $name;
            }
        }

        foreach (['fg_color', 'bg_color', 'eye_color'] as $colorKey) {
            if (array_key_exists($colorKey, $body) || ! $partial) {
                $color = strtolower(trim((string) ($body[$colorKey] ?? '')));
                if (! preg_match('/^#[0-9a-f]{6}$/', $color)) {
                    if ($partial && ! array_key_exists($colorKey, $body)) {
                        continue;
                    }
                    throw new \InvalidArgumentException("{$colorKey} must be a valid hex color");
                }
                $normalized[$colorKey] = $color;
            }
        }

        if (array_key_exists('style', $body) || ! $partial) {
            $style = (string) ($body['style'] ?? 'square');
            if (! in_array($style, self::QR_STYLES, true)) {
                if ($partial && ! array_key_exists('style', $body)) {
                    $style = 'square';
                } else {
                    throw new \InvalidArgumentException('style must be square, rounded, or dots');
                }
            }
            $normalized['style'] = $style;
        }

        if (array_key_exists('size', $body) || ! $partial) {
            $size = (int) ($body['size'] ?? 300);
            if (! in_array($size, self::QR_SIZES, true)) {
                if ($partial && ! array_key_exists('size', $body)) {
                    $size = 300;
                } else {
                    throw new \InvalidArgumentException('size must be one of: '.implode(', ', self::QR_SIZES));
                }
            }
            $normalized['size'] = $size;
        }

        if (array_key_exists('logo_size', $body) || ! $partial) {
            $logoSize = (int) ($body['logo_size'] ?? 20);
            if ($logoSize < 10 || $logoSize > 40) {
                if ($partial && ! array_key_exists('logo_size', $body)) {
                    $logoSize = 20;
                } else {
                    throw new \InvalidArgumentException('logo_size must be between 10 and 40');
                }
            }
            $normalized['logo_size'] = $logoSize;
        }

        if (array_key_exists('logo_url', $body) || ! $partial) {
            $normalized['logo_url'] = trim((string) ($body['logo_url'] ?? ''));
        }

        if (array_key_exists('source', $body) || ! $partial) {
            $source = (string) ($body['source'] ?? 'custom');
            $normalized['source'] = $source === 'global' ? 'global' : 'custom';
        }

        if (array_key_exists('is_active', $body) || ! $partial) {
            $normalized['is_active'] = (bool) ($body['is_active'] ?? false);
        }

        return $normalized;
    }
}
