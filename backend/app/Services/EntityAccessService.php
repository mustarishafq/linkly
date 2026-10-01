<?php

namespace App\Services;

/**
 * Role "user" may read and change only records they own.
 * Admins can access every record. Public redirect traffic stays anonymous
 * and is limited to slug lookup plus click counters.
 */
class EntityAccessService
{
    public const OWNER_FIELD = 'owner_user_id';

    /** @var list<string> */
    public const OWNED_ENTITIES = ['ShortLink', 'Campaign', 'CustomDomain', 'LinkTree'];

    /** @var list<string> */
    public const LINK_CHILD_ENTITIES = ['ABVariant', 'RedirectRule', 'LinkNotificationRule', 'QRDesign'];

    /** @var array<string, array<string, true>> */
    private array $ownedIds = [];

    public function __construct(private EntityService $entities) {}

    public function isAdmin(?object $user): bool
    {
        return ($user->role ?? '') === 'admin';
    }

    public function prepareCreateBody(string $entity, array $body, object $user): array
    {
        if (! in_array($entity, self::OWNED_ENTITIES, true)) {
            return $body;
        }

        if ($this->isAdmin($user) && $this->presentOwner($body[self::OWNER_FIELD] ?? null)) {
            $body[self::OWNER_FIELD] = (int) $body[self::OWNER_FIELD];

            return $body;
        }

        $body[self::OWNER_FIELD] = (int) $user->id;

        return $body;
    }

    public function prepareUpdateBody(string $entity, array $body, ?object $user): array
    {
        if (in_array($entity, self::OWNED_ENTITIES, true) && ! $this->isAdmin($user)) {
            unset($body[self::OWNER_FIELD]);
        }

        return $body;
    }

    public function canRead(?object $user, string $entity, array $row): bool
    {
        if ($this->isAdmin($user)) {
            return true;
        }

        if (! $user) {
            return false;
        }

        if (in_array($entity, self::OWNED_ENTITIES, true)) {
            return $this->sameId($row[self::OWNER_FIELD] ?? null, $user->id);
        }

        if ($entity === 'ClickLog') {
            if ($this->ownsParent($user, 'ShortLink', $row['link_id'] ?? null)) {
                return true;
            }

            return $this->ownsParent($user, 'LinkTree', $row['link_tree_id'] ?? null);
        }

        if (in_array($entity, self::LINK_CHILD_ENTITIES, true)) {
            return $this->ownsParent($user, 'ShortLink', $row['link_id'] ?? null);
        }

        return false;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    public function visibleRows(?object $user, string $entity, array $rows): array
    {
        if ($this->isAdmin($user)) {
            return array_values($rows);
        }

        if (! $user) {
            return [];
        }

        return array_values(array_filter(
            $rows,
            fn (array $row) => $this->canRead($user, $entity, $row)
        ));
    }

    public function ownsParent(?object $user, string $parentEntity, mixed $parentId): bool
    {
        if (! $user || ! $this->presentOwner($parentId)) {
            return false;
        }

        $ids = $this->ownedParentIds($user, $parentEntity);

        return isset($ids[(string) $parentId]);
    }

    /**
     * Public short-link resolution. Knowing the slug is the public URL.
     *
     * @param  array<string, mixed>  $where
     */
    public function isPublicSlugLookup(string $entity, array $where): bool
    {
        if ($entity !== 'ShortLink' || array_keys($where) !== ['slug']) {
            return false;
        }

        return trim((string) ($where['slug'] ?? '')) !== '';
    }

    /**
     * Anonymous redirect page loads rules and A/B variants for one link.
     *
     * @param  array<string, mixed>  $where
     */
    public function isPublicChildLookup(string $entity, array $where): bool
    {
        if (! in_array($entity, ['RedirectRule', 'ABVariant'], true)) {
            return false;
        }

        if (array_keys($where) !== ['link_id']) {
            return false;
        }

        return trim((string) ($where['link_id'] ?? '')) !== '';
    }

    /**
     * Anonymous visitors may only bump click counters or expire a link.
     *
     * @param  array<string, mixed>  $body
     */
    public function isPublicCounterUpdate(string $entity, array $body): bool
    {
        $keys = array_keys($body);

        if ($entity === 'ShortLink') {
            $allowed = ['status', 'total_clicks', 'unique_clicks'];
            if ($keys === [] || array_diff($keys, $allowed) !== []) {
                return false;
            }

            if (array_key_exists('status', $body) && $body['status'] !== 'expired') {
                return false;
            }

            return true;
        }

        if ($entity === 'ABVariant') {
            return $keys === ['clicks'];
        }

        return false;
    }

    /**
     * @return array<string, true>
     */
    private function ownedParentIds(object $user, string $entity): array
    {
        $cacheKey = $entity.':'.$user->id;
        if (isset($this->ownedIds[$cacheKey])) {
            return $this->ownedIds[$cacheKey];
        }

        $table = $this->entities->tableFor($entity);
        $ids = [];

        if ($table) {
            foreach ($this->entities->fetchAll($table) as $row) {
                if ($this->sameId($row[self::OWNER_FIELD] ?? null, $user->id)) {
                    $ids[(string) $row['id']] = true;
                }
            }
        }

        return $this->ownedIds[$cacheKey] = $ids;
    }

    private function sameId(mixed $left, mixed $right): bool
    {
        if (! $this->presentOwner($left) || ! $this->presentOwner($right)) {
            return false;
        }

        return (string) $left === (string) $right;
    }

    private function presentOwner(mixed $value): bool
    {
        return $value !== null && $value !== '';
    }
}
