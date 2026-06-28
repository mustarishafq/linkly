<?php

namespace App\Services\Mcp;

use App\Services\EntityService;

class McpEntityService
{
    /** @var array<string, array<int, string>> */
    private const SEARCH_FIELDS = [
        'ShortLink' => ['slug', 'title', 'destination_url'],
        'Campaign' => ['name', 'description'],
        'CustomDomain' => ['domain'],
    ];

    public function __construct(private EntityService $entities) {}

    public function list(
        string $entity,
        ?string $search = null,
        ?string $sortBy = null,
        string $sortOrder = 'desc',
        int $page = 1,
        int $perPage = 50,
    ): array {
        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return ['data' => [], 'meta' => $this->emptyMeta($page, $perPage)];
        }

        $records = $this->entities->fetchAll($table);
        $records = $this->filterSearch($records, $entity, $search);
        $records = $this->entities->sortRecords($records, $this->toSortBy($sortBy, $sortOrder));

        return $this->paginate($records, $page, $perPage);
    }

    public function find(string $entity, string $id): ?array
    {
        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return null;
        }

        return $this->entities->find($table, $id);
    }

    public function create(string $entity, array $body, ?string $actorUserId): ?array
    {
        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return null;
        }

        return $this->entities->create($table, $entity, $body, $actorUserId);
    }

    public function update(string $entity, string $id, array $body, ?string $actorUserId): ?array
    {
        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return null;
        }

        return $this->entities->update($table, $entity, $id, $body, $actorUserId);
    }

    public function delete(string $entity, string $id, ?string $actorUserId): ?array
    {
        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return null;
        }

        return $this->entities->delete($table, $entity, $id, $actorUserId);
    }

    /** @param  array<int, array<string, mixed>>  $records */
    private function filterSearch(array $records, string $entity, ?string $search): array
    {
        $search = trim((string) $search);
        if ($search === '') {
            return $records;
        }

        $needle = strtolower($search);
        $fields = self::SEARCH_FIELDS[$entity] ?? ['id'];

        return array_values(array_filter($records, function (array $row) use ($fields, $needle) {
            foreach ($fields as $field) {
                $value = strtolower((string) ($row[$field] ?? ''));
                if ($value !== '' && str_contains($value, $needle)) {
                    return true;
                }
            }

            return str_contains(strtolower((string) ($row['id'] ?? '')), $needle);
        }));
    }

    private function toSortBy(?string $sortBy, string $sortOrder): string
    {
        $field = trim((string) $sortBy);
        if ($field === '') {
            $field = 'created_date';
        }

        return strtolower($sortOrder) === 'asc' ? $field : "-{$field}";
    }

    /** @param  array<int, array<string, mixed>>  $records @return array{data: array<int, array<string, mixed>>, meta: array<string, int>} */
    private function paginate(array $records, int $page, int $perPage): array
    {
        $total = count($records);
        $lastPage = max(1, (int) ceil($total / max(1, $perPage)));
        $page = max(1, min($page, $lastPage));
        $offset = ($page - 1) * $perPage;

        return [
            'data' => array_slice($records, $offset, $perPage),
            'meta' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
            ],
        ];
    }

    /** @return array<string, int> */
    private function emptyMeta(int $page, int $perPage): array
    {
        return [
            'current_page' => max(1, $page),
            'last_page' => 1,
            'per_page' => $perPage,
            'total' => 0,
        ];
    }
}
