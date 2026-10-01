<?php

namespace App\Http\Controllers;

use App\Services\EntityAccessService;
use App\Services\EntityService;
use App\Services\LinkNotificationService;
use App\Services\LinkWebhookService;
use App\Services\QrDesignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EntityController extends Controller
{
    public function __construct(
        private EntityService $entities,
        private EntityAccessService $access,
        private LinkNotificationService $linkNotifications,
        private LinkWebhookService $linkWebhooks,
        private QrDesignService $qrDesigns,
    ) {}

    public function list(Request $request, string $entity): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        if (! $user) {
            return $this->error('auth_required', 'Authentication required', 401);
        }

        $sortBy = $request->input('sortBy', '-created_date');
        $limit = $request->input('limit', 200);

        if ($entity === 'QRDesign') {
            $rows = $this->access->visibleRows($user, $entity, $this->qrDesigns->fetchAll());

            return response()->json(
                $this->qrDesigns->applyLimit($this->qrDesigns->sortRecords($rows, (string) $sortBy), (int) $limit)
            );
        }

        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return response()->json(['message' => 'Unknown entity'], 404);
        }

        $rows = $this->access->visibleRows($user, $entity, $this->entities->fetchAll($table));

        return response()->json(
            $this->entities->applyLimit($this->entities->sortRecords($rows, $sortBy), $limit)
        );
    }

    public function filter(Request $request, string $entity): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $where = $request->input('where', []);
        if (! is_array($where)) {
            $where = [];
        }

        $sortBy = $request->input('sortBy', '-created_date');
        $limit = $request->input('limit', 200);
        $publicLookup = $this->access->isPublicSlugLookup($entity, $where)
            || (! $user && $this->access->isPublicChildLookup($entity, $where));

        if (! $user && ! $publicLookup) {
            return $this->error('auth_required', 'Authentication required', 401);
        }

        if ($entity === 'QRDesign') {
            $rows = array_values(array_filter(
                $this->qrDesigns->fetchAll(),
                fn (array $row) => $this->qrDesigns->matchesWhere($row, $where)
            ));
            if (! $publicLookup) {
                $rows = $this->access->visibleRows($user, $entity, $rows);
            }

            return response()->json(
                $this->qrDesigns->applyLimit($this->qrDesigns->sortRecords($rows, (string) $sortBy), (int) $limit)
            );
        }

        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return response()->json(['message' => 'Unknown entity'], 404);
        }

        $rows = array_values(array_filter(
            $this->entities->fetchAll($table),
            fn (array $row) => $this->entities->matchesWhere($row, $where)
        ));

        if (! $publicLookup) {
            $rows = $this->access->visibleRows($user, $entity, $rows);
        }

        return response()->json(
            $this->entities->applyLimit($this->entities->sortRecords($rows, $sortBy), $limit)
        );
    }

    public function show(Request $request, string $entity, string $id): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        if (! $user) {
            return $this->error('auth_required', 'Authentication required', 401);
        }

        if ($entity === 'QRDesign') {
            $record = $this->qrDesigns->find((int) $id);
            if (! $record || ! $this->access->canRead($user, $entity, $record)) {
                return $this->error('not_found', 'Record not found', 404);
            }

            return response()->json($record);
        }

        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return response()->json(['message' => 'Unknown entity'], 404);
        }

        $record = $this->entities->find($table, $id);
        if (! $record || ! $this->access->canRead($user, $entity, $record)) {
            return $this->error('not_found', 'Record not found', 404);
        }

        return response()->json($record);
    }

    public function store(Request $request, string $entity): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $body = $request->all();

        if ($denied = $this->denyUnlessCanCreate($user, $entity, $body)) {
            return $denied;
        }

        if ($user) {
            $body = $this->access->prepareCreateBody($entity, $body, $user);
        }

        if ($entity === 'QRDesign') {
            try {
                $record = $this->qrDesigns->create($body, $user?->id);
            } catch (\InvalidArgumentException $error) {
                return $this->error('invalid_qr_design', $error->getMessage(), 400);
            }

            return response()->json($record);
        }

        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return response()->json(['message' => 'Unknown entity'], 404);
        }

        $record = $this->entities->create($table, $entity, $body, $user?->id);

        if ($entity === 'ClickLog' && ! empty($record['link_id']) && empty($record['is_test'])) {
            $this->linkNotifications->evaluateForLink((int) $record['link_id']);
        }

        if ($entity === 'ShortLink') {
            $this->linkWebhooks->linkCreated($record, $user?->id);
        }

        return response()->json($record);
    }

    public function bulkStore(Request $request, string $entity): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $items = $request->input('items', []);
        if (! is_array($items)) {
            $items = [];
        }

        foreach ($items as $item) {
            if (! is_array($item)) {
                return $this->error('invalid_input', 'Each item must be an object', 400);
            }

            if ($denied = $this->denyUnlessCanCreate($user, $entity, $item)) {
                return $denied;
            }
        }

        if ($user) {
            $items = array_map(
                fn (array $item) => $this->access->prepareCreateBody($entity, $item, $user),
                $items
            );
        }

        if ($entity === 'QRDesign') {
            try {
                $created = $this->qrDesigns->bulkCreate($items, $user?->id);
            } catch (\InvalidArgumentException $error) {
                return $this->error('invalid_qr_design', $error->getMessage(), 400);
            }

            return response()->json($created);
        }

        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return response()->json(['message' => 'Unknown entity'], 404);
        }

        $created = $this->entities->bulkCreate($table, $entity, $items, $user?->id);

        return response()->json($created);
    }

    public function update(Request $request, string $entity, string $id): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $body = $this->access->prepareUpdateBody($entity, $request->all(), $user);

        if ($entity === 'QRDesign') {
            $existing = $this->qrDesigns->find((int) $id);
            if (! $existing) {
                return response()->json(null);
            }

            if ($denied = $this->denyUnlessCanUpdate($user, $entity, $existing, $body)) {
                return $denied;
            }

            try {
                $updated = $this->qrDesigns->update((int) $id, $body, $user?->id);
            } catch (\InvalidArgumentException $error) {
                return $this->error('invalid_qr_design', $error->getMessage(), 400);
            }

            return response()->json($updated);
        }

        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return response()->json(['message' => 'Unknown entity'], 404);
        }

        $existing = $this->entities->find($table, $id);
        if (! $existing) {
            return response()->json(null);
        }

        if ($denied = $this->denyUnlessCanUpdate($user, $entity, $existing, $body)) {
            return $denied;
        }

        $updated = $this->entities->update($table, $entity, $id, $body, $user?->id);

        if ($entity === 'ShortLink' && $updated) {
            $this->linkWebhooks->linkUpdated($updated, $user?->id);
        }

        return response()->json($updated);
    }

    public function destroy(Request $request, string $entity, string $id): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        if (! $user) {
            return $this->error('auth_required', 'Authentication required', 401);
        }

        if ($entity === 'QRDesign') {
            $existing = $this->qrDesigns->find((int) $id);
            if (! $existing) {
                return response()->json(null);
            }

            if (! $this->access->canRead($user, $entity, $existing)) {
                return $this->error('forbidden', 'You cannot delete this record', 403);
            }

            return response()->json($this->qrDesigns->delete((int) $id, $user->id));
        }

        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return response()->json(['message' => 'Unknown entity'], 404);
        }

        $existing = $this->entities->find($table, $id);
        if (! $existing) {
            return response()->json(null);
        }

        if (! $this->access->canRead($user, $entity, $existing)) {
            return $this->error('forbidden', 'You cannot delete this record', 403);
        }

        $deleted = $this->entities->delete($table, $entity, $id, $user->id);

        if ($entity === 'ShortLink') {
            $this->linkWebhooks->linkDeleted($existing, $user->id);
        }

        return response()->json($deleted);
    }

    /**
     * @param  array<string, mixed>  $body
     */
    private function denyUnlessCanCreate(?object $user, string $entity, array $body): ?JsonResponse
    {
        if ($entity === 'ClickLog') {
            return null;
        }

        if (! $user) {
            return $this->error('auth_required', 'Authentication required', 401);
        }

        if ($this->access->isAdmin($user) || in_array($entity, EntityAccessService::OWNED_ENTITIES, true)) {
            return null;
        }

        if (in_array($entity, EntityAccessService::LINK_CHILD_ENTITIES, true)) {
            if ($this->access->ownsParent($user, 'ShortLink', $body['link_id'] ?? null)) {
                return null;
            }

            return $this->error('forbidden', 'You cannot add records to this link', 403);
        }

        return $this->error('forbidden', 'You cannot create this record', 403);
    }

    /**
     * @param  array<string, mixed>  $existing
     * @param  array<string, mixed>  $body
     */
    private function denyUnlessCanUpdate(?object $user, string $entity, array $existing, array $body): ?JsonResponse
    {
        if (! $user && $this->access->isPublicCounterUpdate($entity, $body)) {
            return null;
        }

        if (! $user) {
            return $this->error('auth_required', 'Authentication required', 401);
        }

        if (! $this->access->canRead($user, $entity, $existing)) {
            return $this->error('forbidden', 'You cannot update this record', 403);
        }

        return null;
    }
}
