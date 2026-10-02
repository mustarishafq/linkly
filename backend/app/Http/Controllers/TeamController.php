<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\TeamService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function __construct(
        private TeamService $teams,
        private AuditLogService $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->attributes->get('auth_user');

        return response()->json($this->teams->listForUser((int) $user->id));
    }

    public function memberOptions(Request $request): JsonResponse
    {
        $user = $request->attributes->get('auth_user');

        return response()->json($this->teams->memberOptions((int) $user->id));
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $name = $this->normalizeName($request->input('name'));
        if ($name instanceof JsonResponse) {
            return $name;
        }

        $memberIds = $request->input('member_ids', []);
        if (! is_array($memberIds)) {
            return $this->error('invalid_input', 'Members must be a list of users', 422);
        }

        try {
            $team = $this->teams->create((int) $user->id, $name, $memberIds);
        } catch (\InvalidArgumentException $exception) {
            return $this->error('invalid_member', $exception->getMessage(), 422);
        }

        $this->audit->write([
            'actor_user_id' => $user->id,
            'action' => 'team_created',
            'details' => [
                'team_id' => $team['id'],
                'name' => $team['name'],
                'member_ids' => array_column($team['members'] ?? [], 'id'),
            ],
        ]);

        return response()->json($team, 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $team = $this->teams->findForMember($this->teamId($id), (int) $user->id);
        if (! $team) {
            return $this->error('not_found', 'Team not found', 404);
        }

        return response()->json($team);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $teamId = $this->teamId($id);
        if (! $this->teams->isMember($teamId, (int) $user->id)) {
            return $this->error('not_found', 'Team not found', 404);
        }

        if (! $this->teams->isOwner($teamId, (int) $user->id)) {
            return $this->error('forbidden', 'Only the team owner can rename the team', 403);
        }

        $name = $this->normalizeName($request->input('name'));
        if ($name instanceof JsonResponse) {
            return $name;
        }

        $team = $this->teams->rename($teamId, (int) $user->id, $name);
        if (! $team) {
            return $this->error('forbidden', 'Only the team owner can rename the team', 403);
        }

        $this->audit->write([
            'actor_user_id' => $user->id,
            'action' => 'team_renamed',
            'details' => [
                'team_id' => $team['id'],
                'name' => $team['name'],
            ],
        ]);

        return response()->json($team);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $teamId = $this->teamId($id);
        if (! $this->teams->isMember($teamId, (int) $user->id)) {
            return $this->error('not_found', 'Team not found', 404);
        }

        if (! $this->teams->delete($teamId, (int) $user->id)) {
            return $this->error('forbidden', 'Only the team owner can delete the team', 403);
        }

        $this->audit->write([
            'actor_user_id' => $user->id,
            'action' => 'team_deleted',
            'details' => ['team_id' => $teamId],
        ]);

        return response()->json(['deleted' => true]);
    }

    public function addMember(Request $request, string $id): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $email = strtolower(trim((string) $request->input('email', '')));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->error('invalid_input', 'A valid email is required', 422);
        }

        $result = $this->teams->addMember($this->teamId($id), (int) $user->id, $email);
        if (! $result['ok']) {
            return $this->error($result['code'], $result['message'], $result['status']);
        }

        $this->audit->write([
            'actor_user_id' => $user->id,
            'action' => 'team_member_added',
            'target_user_id' => $result['added_user_id'],
            'details' => [
                'team_id' => (int) $id,
                'email' => $email,
            ],
        ]);

        return response()->json($result['team']);
    }

    public function removeMember(Request $request, string $id, string $userId): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $memberId = (int) $userId;
        if ($memberId < 1) {
            return $this->error('invalid_input', 'Member is required', 422);
        }

        $result = $this->teams->removeMember($this->teamId($id), (int) $user->id, $memberId);
        if (! $result['ok']) {
            return $this->error($result['code'], $result['message'], $result['status']);
        }

        $this->audit->write([
            'actor_user_id' => $user->id,
            'action' => 'team_member_removed',
            'target_user_id' => $memberId,
            'details' => ['team_id' => (int) $id],
        ]);

        return response()->json(['removed' => true]);
    }

    private function teamId(string $id): int
    {
        return (int) $id;
    }

    private function normalizeName(mixed $name): string|JsonResponse
    {
        $name = trim((string) $name);
        if (mb_strlen($name) < 2 || mb_strlen($name) > 80) {
            return $this->error('invalid_input', 'Team name must be between 2 and 80 characters', 422);
        }

        return $name;
    }
}
