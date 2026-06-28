<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

class McpResponse
{
    public static function success(mixed $data = null, array $meta = [], ?string $message = null, int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => $meta,
        ], $status);
    }

    public static function error(string $message, int $status = 400, array $errors = []): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $status);
    }

    /** @param  array<int, mixed>  $items */
    public static function paginated(array $items, int $page, int $perPage): JsonResponse
    {
        $total = count($items);
        $lastPage = max(1, (int) ceil($total / max(1, $perPage)));
        $page = max(1, min($page, $lastPage));
        $offset = ($page - 1) * $perPage;
        $data = array_slice($items, $offset, $perPage);

        return self::success($data, [
            'current_page' => $page,
            'last_page' => $lastPage,
            'per_page' => $perPage,
            'total' => $total,
        ]);
    }
}
