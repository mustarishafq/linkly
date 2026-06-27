<?php

namespace App\Http\Controllers;

use App\Services\InAppNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private InAppNotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $limit = (int) $request->query('limit', 50);

        return response()->json($this->notifications->listForUser($user->id, $limit));
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->attributes->get('auth_user');

        return response()->json([
            'count' => $this->notifications->unreadCountForUser($user->id),
        ]);
    }

    public function poll(Request $request): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $since = $request->query('since');

        return response()->json([
            'notifications' => $this->notifications->listUnreadSince(
                $user->id,
                is_string($since) && $since !== '' ? $since : null
            ),
            'unread_count' => $this->notifications->unreadCountForUser($user->id),
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $ok = $this->notifications->markRead($user->id, $id);

        if (! $ok) {
            return $this->error('not_found', 'Notification not found', 404);
        }

        return response()->json(['ok' => true]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $updated = $this->notifications->markAllRead($user->id);

        return response()->json(['ok' => true, 'updated' => $updated]);
    }
}
