<?php

namespace App\Http\Controllers;

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
        private LinkNotificationService $linkNotifications,
        private LinkWebhookService $linkWebhooks,
        private QrDesignService $qrDesigns,
    ) {}

    public function list(Request $request, string $entity): JsonResponse
    {
        if ($entity === 'QRDesign') {
            $sortBy = $request->input('sortBy', '-created_date');
            $limit = (int) $request->input('limit', 200);

            return response()->json($this->qrDesigns->filter([], $sortBy, $limit));
        }

        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return response()->json(['message' => 'Unknown entity'], 404);
        }

        $sortBy = $request->input('sortBy', '-created_date');
        $limit = $request->input('limit', 200);
        $all = $this->entities->fetchAll($table);
        $rows = $this->entities->applyLimit($this->entities->sortRecords($all, $sortBy), $limit);

        return response()->json($rows);
    }

    public function filter(Request $request, string $entity): JsonResponse
    {
        if ($entity === 'QRDesign') {
            $where = $request->input('where', []);
            $sortBy = $request->input('sortBy', '-created_date');
            $limit = (int) $request->input('limit', 200);

            return response()->json($this->qrDesigns->filter(is_array($where) ? $where : [], $sortBy, $limit));
        }

        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return response()->json(['message' => 'Unknown entity'], 404);
        }

        $where = $request->input('where', []);
        $sortBy = $request->input('sortBy', '-created_date');
        $limit = $request->input('limit', 200);

        $all = $this->entities->fetchAll($table);
        $filtered = array_values(array_filter($all, fn ($row) => $this->entities->matchesWhere($row, $where)));
        $rows = $this->entities->applyLimit($this->entities->sortRecords($filtered, $sortBy), $limit);

        return response()->json($rows);
    }

    public function show(string $entity, string $id): JsonResponse
    {
        if ($entity === 'QRDesign') {
            return response()->json($this->qrDesigns->find((int) $id));
        }

        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return response()->json(['message' => 'Unknown entity'], 404);
        }

        return response()->json($this->entities->find($table, $id));
    }

    public function store(Request $request, string $entity): JsonResponse
    {
        if ($entity === 'QRDesign') {
            $user = $request->attributes->get('auth_user');

            try {
                $record = $this->qrDesigns->create($request->all(), $user?->id);
            } catch (\InvalidArgumentException $error) {
                return $this->error('invalid_qr_design', $error->getMessage(), 400);
            }

            return response()->json($record);
        }

        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return response()->json(['message' => 'Unknown entity'], 404);
        }

        $user = $request->attributes->get('auth_user');
        $record = $this->entities->create($table, $entity, $request->all(), $user?->id);

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
        if ($entity === 'QRDesign') {
            $items = $request->input('items', []);
            if (! is_array($items)) {
                $items = [];
            }

            $user = $request->attributes->get('auth_user');

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

        $items = $request->input('items', []);
        if (! is_array($items)) {
            $items = [];
        }

        $user = $request->attributes->get('auth_user');
        $created = $this->entities->bulkCreate($table, $entity, $items, $user?->id);

        return response()->json($created);
    }

    public function update(Request $request, string $entity, string $id): JsonResponse
    {
        if ($entity === 'QRDesign') {
            $user = $request->attributes->get('auth_user');

            try {
                $updated = $this->qrDesigns->update((int) $id, $request->all(), $user?->id);
            } catch (\InvalidArgumentException $error) {
                return $this->error('invalid_qr_design', $error->getMessage(), 400);
            }

            return response()->json($updated);
        }

        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return response()->json(['message' => 'Unknown entity'], 404);
        }

        $user = $request->attributes->get('auth_user');
        $updated = $this->entities->update($table, $entity, $id, $request->all(), $user?->id);

        if ($entity === 'ShortLink' && $updated) {
            $this->linkWebhooks->linkUpdated($updated, $user?->id);
        }

        return response()->json($updated);
    }

    public function destroy(Request $request, string $entity, string $id): JsonResponse
    {
        if ($entity === 'QRDesign') {
            $user = $request->attributes->get('auth_user');
            $deleted = $this->qrDesigns->delete((int) $id, $user?->id);

            return response()->json($deleted);
        }

        $table = $this->entities->tableFor($entity);
        if (! $table) {
            return response()->json(['message' => 'Unknown entity'], 404);
        }

        $user = $request->attributes->get('auth_user');
        $existing = $entity === 'ShortLink' ? $this->entities->find($table, $id) : null;
        $deleted = $this->entities->delete($table, $entity, $id, $user?->id);

        if ($entity === 'ShortLink' && $existing) {
            $this->linkWebhooks->linkDeleted($existing, $user?->id);
        }

        return response()->json($deleted);
    }
}
