<?php

namespace App\Services;

use App\Support\SqlDate;
use Illuminate\Support\Facades\DB;

class TeamService
{
    /**
     * User ids this person may see: themselves plus every teammate.
     *
     * @return list<int>
     */
    public function visibleUserIds(int $userId): array
    {
        $teamIds = DB::table('team_members')
            ->where('user_id', $userId)
            ->pluck('team_id');

        if ($teamIds->isEmpty()) {
            return [$userId];
        }

        $ids = DB::table('team_members')
            ->whereIn('team_id', $teamIds)
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if (! in_array($userId, $ids, true)) {
            $ids[] = $userId;
        }

        return $ids;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listForUser(int $userId): array
    {
        $teams = DB::table('team_members as mine')
            ->join('teams', 'teams.id', '=', 'mine.team_id')
            ->where('mine.user_id', $userId)
            ->orderBy('teams.name')
            ->get([
                'teams.id',
                'teams.name',
                'teams.created_by_user_id',
                'teams.created_date',
                'teams.updated_date',
                'mine.role as my_role',
            ]);

        if ($teams->isEmpty()) {
            return [];
        }

        $counts = DB::table('team_members')
            ->select('team_id', DB::raw('count(*) as member_count'))
            ->whereIn('team_id', $teams->pluck('id'))
            ->groupBy('team_id')
            ->pluck('member_count', 'team_id');

        return $teams->map(fn ($team) => $this->summary($team, (int) ($counts[$team->id] ?? 0)))->all();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findForMember(int $teamId, int $userId): ?array
    {
        $team = $this->teamRowForMember($teamId, $userId);
        if (! $team) {
            return null;
        }

        return $this->detail($team);
    }

    /**
     * Approved users who can be added to a team, excluding the signed-in user.
     *
     * @return list<array{id: int, email: string, full_name: string}>
     */
    public function memberOptions(int $userId): array
    {
        return DB::table('users')
            ->select('id', 'email', 'full_name')
            ->where('is_approved', true)
            ->where('id', '!=', $userId)
            ->orderBy('full_name')
            ->get()
            ->map(fn ($user) => [
                'id' => (int) $user->id,
                'email' => $user->email,
                'full_name' => $user->full_name,
            ])
            ->all();
    }

    /**
     * @param  list<int>  $memberIds
     * @return array<string, mixed>
     */
    public function create(int $userId, string $name, array $memberIds = []): array
    {
        $memberIds = $this->approvedMemberIds($userId, $memberIds);

        return DB::transaction(function () use ($userId, $name, $memberIds) {
            $now = SqlDate::now();
            $id = (int) DB::table('teams')->insertGetId([
                'name' => $name,
                'created_by_user_id' => $userId,
                'created_date' => $now,
                'updated_date' => $now,
            ]);

            $rows = [[
                'team_id' => $id,
                'user_id' => $userId,
                'role' => 'owner',
                'created_date' => $now,
            ]];

            foreach ($memberIds as $memberId) {
                $rows[] = [
                    'team_id' => $id,
                    'user_id' => $memberId,
                    'role' => 'member',
                    'created_date' => $now,
                ];
            }

            DB::table('team_members')->insert($rows);

            return $this->detail($this->teamRowForMember($id, $userId));
        });
    }

    /**
     * @param  list<int>  $memberIds
     * @return list<int>
     */
    public function approvedMemberIds(int $actorId, array $memberIds): array
    {
        $ids = array_values(array_unique(array_filter(
            array_map(fn ($id) => (int) $id, $memberIds),
            fn (int $id) => $id > 0 && $id !== $actorId
        )));

        if ($ids === []) {
            return [];
        }

        $approved = DB::table('users')
            ->where('is_approved', true)
            ->whereIn('id', $ids)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($approved) !== count($ids)) {
            throw new \InvalidArgumentException('One or more selected users are not available');
        }

        return $approved;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function rename(int $teamId, int $userId, string $name): ?array
    {
        $team = $this->teamRowForMember($teamId, $userId);
        if (! $team || $team->my_role !== 'owner') {
            return null;
        }

        DB::table('teams')->where('id', $teamId)->update([
            'name' => $name,
            'updated_date' => SqlDate::now(),
        ]);

        return $this->detail($this->teamRowForMember($teamId, $userId));
    }

    public function delete(int $teamId, int $userId): bool
    {
        $team = $this->teamRowForMember($teamId, $userId);
        if (! $team || $team->my_role !== 'owner') {
            return false;
        }

        DB::transaction(function () use ($teamId) {
            DB::table('team_members')->where('team_id', $teamId)->delete();
            DB::table('teams')->where('id', $teamId)->delete();
        });

        return true;
    }

    /**
     * @return array{ok: true, team: array<string, mixed>}|array{ok: false, status: int, code: string, message: string}
     */
    public function addMember(int $teamId, int $actorId, string $email): array
    {
        $team = $this->teamRowForMember($teamId, $actorId);
        if (! $team) {
            return $this->fail(404, 'not_found', 'Team not found');
        }

        if ($team->my_role !== 'owner') {
            return $this->fail(403, 'forbidden', 'Only the team owner can add members');
        }

        $user = DB::table('users')
            ->select('id', 'email', 'full_name', 'is_approved')
            ->whereRaw('LOWER(email) = ?', [strtolower($email)])
            ->first();

        if (! $user || ! $user->is_approved) {
            return $this->fail(422, 'invalid_member', 'No approved user with that email');
        }

        $exists = DB::table('team_members')
            ->where('team_id', $teamId)
            ->where('user_id', $user->id)
            ->exists();

        if ($exists) {
            return $this->fail(422, 'already_member', 'This person is already on the team');
        }

        DB::table('team_members')->insert([
            'team_id' => $teamId,
            'user_id' => $user->id,
            'role' => 'member',
            'created_date' => SqlDate::now(),
        ]);

        DB::table('teams')->where('id', $teamId)->update([
            'updated_date' => SqlDate::now(),
        ]);

        return [
            'ok' => true,
            'team' => $this->detail($this->teamRowForMember($teamId, $actorId)),
            'added_user_id' => (int) $user->id,
        ];
    }

    /**
     * @return array{ok: true}|array{ok: false, status: int, code: string, message: string}
     */
    public function removeMember(int $teamId, int $actorId, int $memberId): array
    {
        $team = $this->teamRowForMember($teamId, $actorId);
        if (! $team) {
            return $this->fail(404, 'not_found', 'Team not found');
        }

        $target = DB::table('team_members')
            ->where('team_id', $teamId)
            ->where('user_id', $memberId)
            ->first();

        if (! $target) {
            return $this->fail(404, 'not_found', 'Member not found');
        }

        if ($target->role === 'owner') {
            return $this->fail(422, 'invalid_member', 'The team owner cannot be removed');
        }

        $isSelf = $actorId === $memberId;
        if (! $isSelf && $team->my_role !== 'owner') {
            return $this->fail(403, 'forbidden', 'Only the team owner can remove members');
        }

        DB::table('team_members')
            ->where('team_id', $teamId)
            ->where('user_id', $memberId)
            ->delete();

        DB::table('teams')->where('id', $teamId)->update([
            'updated_date' => SqlDate::now(),
        ]);

        return ['ok' => true];
    }

    public function isOwner(int $teamId, int $userId): bool
    {
        $team = $this->teamRowForMember($teamId, $userId);

        return $team !== null && $team->my_role === 'owner';
    }

    public function isMember(int $teamId, int $userId): bool
    {
        return $this->teamRowForMember($teamId, $userId) !== null;
    }

    private function teamRowForMember(int $teamId, int $userId): ?object
    {
        return DB::table('team_members as mine')
            ->join('teams', 'teams.id', '=', 'mine.team_id')
            ->where('teams.id', $teamId)
            ->where('mine.user_id', $userId)
            ->first([
                'teams.id',
                'teams.name',
                'teams.created_by_user_id',
                'teams.created_date',
                'teams.updated_date',
                'mine.role as my_role',
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(object $team, int $memberCount): array
    {
        return [
            'id' => (int) $team->id,
            'name' => $team->name,
            'my_role' => $team->my_role,
            'member_count' => $memberCount,
            'created_by_user_id' => (int) $team->created_by_user_id,
            'created_date' => SqlDate::toIso8601($team->created_date),
            'updated_date' => SqlDate::toIso8601($team->updated_date),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detail(object $team): array
    {
        $members = DB::table('team_members')
            ->join('users', 'users.id', '=', 'team_members.user_id')
            ->where('team_members.team_id', $team->id)
            ->orderByRaw("case when team_members.role = 'owner' then 0 else 1 end")
            ->orderBy('users.full_name')
            ->get([
                'users.id',
                'users.email',
                'users.full_name',
                'team_members.role',
            ]);

        $summary = $this->summary($team, $members->count());
        $summary['members'] = $members->map(fn ($member) => [
            'id' => (int) $member->id,
            'email' => $member->email,
            'full_name' => $member->full_name,
            'role' => $member->role,
        ])->all();

        return $summary;
    }

    /**
     * @return array{ok: false, status: int, code: string, message: string}
     */
    private function fail(int $status, string $code, string $message): array
    {
        return [
            'ok' => false,
            'status' => $status,
            'code' => $code,
            'message' => $message,
        ];
    }
}
