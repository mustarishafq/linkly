<?php

namespace Tests\Feature;

use App\Services\JwtService;
use App\Support\SqlDate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TeamTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_a_team_and_add_a_member(): void
    {
        $owner = $this->createUser('owner@example.com', 'Owner');
        $member = $this->createUser('member@example.com', 'Member');

        $created = $this->withToken($owner['token'])->postJson('/api/teams', [
            'name' => 'Marketing',
        ]);
        $created->assertCreated();
        $created->assertJsonPath('name', 'Marketing');
        $created->assertJsonPath('my_role', 'owner');
        $created->assertJsonPath('member_count', 1);
        $teamId = $created->json('id');

        $added = $this->withToken($owner['token'])->postJson("/api/teams/{$teamId}/members", [
            'email' => 'member@example.com',
        ]);
        $added->assertOk();
        $added->assertJsonPath('member_count', 2);

        $seen = $this->withToken($member['token'])->getJson("/api/teams/{$teamId}");
        $seen->assertOk();
        $seen->assertJsonPath('my_role', 'member');
        $this->assertEqualsCanonicalizing(
            ['owner@example.com', 'member@example.com'],
            array_column($seen->json('members'), 'email')
        );

        $this->withToken($member['token'])
            ->postJson("/api/teams/{$teamId}/members", ['email' => 'owner@example.com'])
            ->assertForbidden();

        $this->withToken($member['token'])
            ->patchJson("/api/teams/{$teamId}", ['name' => 'Hijacked'])
            ->assertForbidden();

        $this->withToken($member['token'])
            ->deleteJson("/api/teams/{$teamId}")
            ->assertForbidden();
    }

    public function test_team_can_be_created_with_selected_members(): void
    {
        $owner = $this->createUser('owner@example.com', 'Owner');
        $member = $this->createUser('member@example.com', 'Member');
        $pending = $this->createUser('pending@example.com', 'Pending', false);

        $options = $this->withToken($owner['token'])->getJson('/api/teams/member-options');
        $options->assertOk();
        $this->assertSame(['member@example.com'], array_column($options->json(), 'email'));

        $this->withToken($owner['token'])->postJson('/api/teams', [
            'name' => 'Launch',
            'member_ids' => [$member['id'], $pending['id']],
        ])->assertStatus(422);

        $created = $this->withToken($owner['token'])->postJson('/api/teams', [
            'name' => 'Launch',
            'member_ids' => [$member['id'], $member['id']],
        ]);
        $created->assertCreated();
        $created->assertJsonPath('member_count', 2);
        $this->assertEqualsCanonicalizing(
            ['owner@example.com', 'member@example.com'],
            array_column($created->json('members'), 'email')
        );
    }

    public function test_teammates_can_view_each_others_records_but_not_change_them(): void
    {
        $owner = $this->createUser('owner@example.com', 'Owner');
        $teammate = $this->createUser('teammate@example.com', 'Teammate');
        $outsider = $this->createUser('outsider@example.com', 'Outsider');

        $teamId = $this->withToken($owner['token'])
            ->postJson('/api/teams', ['name' => 'Growth'])
            ->json('id');
        $this->withToken($owner['token'])
            ->postJson("/api/teams/{$teamId}/members", ['email' => 'teammate@example.com'])
            ->assertOk();

        $linkId = $this->seedEntity('entity_shortlink', [
            'slug' => 'shared',
            'title' => 'Shared link',
            'destination_url' => 'https://shared.example',
            'owner_user_id' => $owner['id'],
        ]);
        $this->seedEntity('entity_clicklog', [
            'link_id' => $linkId,
            'slug' => 'shared',
        ]);
        $this->seedEntity('entity_shortlink', [
            'slug' => 'private',
            'destination_url' => 'https://private.example',
            'owner_user_id' => $outsider['id'],
        ]);

        $list = $this->withToken($teammate['token'])->postJson('/api/entities/ShortLink/list', [
            'limit' => 50,
        ]);
        $list->assertOk();
        $this->assertSame(['shared'], array_column($list->json(), 'slug'));

        $this->withToken($teammate['token'])
            ->getJson('/api/entities/ShortLink/'.$linkId)
            ->assertOk()
            ->assertJsonPath('title', 'Shared link');

        $clicks = $this->withToken($teammate['token'])->postJson('/api/entities/ClickLog/list', [
            'limit' => 50,
        ]);
        $clicks->assertOk();
        $this->assertSame(['shared'], array_column($clicks->json(), 'slug'));

        $this->withToken($teammate['token'])
            ->patchJson('/api/entities/ShortLink/'.$linkId, [
                'destination_url' => 'https://hijack.example',
            ])
            ->assertForbidden();

        $this->withToken($teammate['token'])
            ->deleteJson('/api/entities/ShortLink/'.$linkId)
            ->assertForbidden();

        $this->withToken($outsider['token'])
            ->getJson('/api/entities/ShortLink/'.$linkId)
            ->assertNotFound();

        $directory = $this->withToken($teammate['token'])->getJson('/api/users/directory');
        $directory->assertOk();
        $this->assertEqualsCanonicalizing(
            ['owner@example.com', 'teammate@example.com'],
            array_column($directory->json(), 'email')
        );
    }

    public function test_separate_teams_do_not_share_records(): void
    {
        $hub = $this->createUser('hub@example.com', 'Hub');
        $alpha = $this->createUser('alpha@example.com', 'Alpha');
        $beta = $this->createUser('beta@example.com', 'Beta');

        $teamA = $this->withToken($hub['token'])->postJson('/api/teams', ['name' => 'Alpha'])->json('id');
        $teamB = $this->withToken($hub['token'])->postJson('/api/teams', ['name' => 'Beta'])->json('id');
        $this->withToken($hub['token'])->postJson("/api/teams/{$teamA}/members", ['email' => 'alpha@example.com'])->assertOk();
        $this->withToken($hub['token'])->postJson("/api/teams/{$teamB}/members", ['email' => 'beta@example.com'])->assertOk();

        $this->seedEntity('entity_shortlink', [
            'slug' => 'alpha-link',
            'destination_url' => 'https://alpha.example',
            'owner_user_id' => $alpha['id'],
        ]);

        $betaList = $this->withToken($beta['token'])->postJson('/api/entities/ShortLink/list', ['limit' => 20]);
        $betaList->assertOk();
        $this->assertSame([], array_column($betaList->json(), 'slug'));

        $hubList = $this->withToken($hub['token'])->postJson('/api/entities/ShortLink/list', ['limit' => 20]);
        $hubList->assertOk();
        $this->assertSame(['alpha-link'], array_column($hubList->json(), 'slug'));
    }

    public function test_member_can_leave_and_then_loses_access(): void
    {
        $owner = $this->createUser('owner@example.com', 'Owner');
        $member = $this->createUser('member@example.com', 'Member');
        $teamId = $this->withToken($owner['token'])->postJson('/api/teams', ['name' => 'Studio'])->json('id');
        $this->withToken($owner['token'])
            ->postJson("/api/teams/{$teamId}/members", ['email' => 'member@example.com'])
            ->assertOk();

        $linkId = $this->seedEntity('entity_shortlink', [
            'slug' => 'studio',
            'destination_url' => 'https://studio.example',
            'owner_user_id' => $owner['id'],
        ]);

        $this->withToken($member['token'])
            ->deleteJson("/api/teams/{$teamId}/members/{$member['id']}")
            ->assertOk();

        $this->withToken($member['token'])
            ->getJson('/api/entities/ShortLink/'.$linkId)
            ->assertNotFound();

        $this->withToken($member['token'])
            ->getJson("/api/teams/{$teamId}")
            ->assertNotFound();

        $this->withToken($owner['token'])
            ->deleteJson("/api/teams/{$teamId}/members/{$owner['id']}")
            ->assertStatus(422);
    }

    /**
     * @return array{id: int, token: string}
     */
    private function createUser(string $email, string $name, bool $approved = true): array
    {
        $now = SqlDate::now();
        $id = DB::table('users')->insertGetId([
            'email' => $email,
            'full_name' => $name,
            'password_hash' => Hash::make('password'),
            'role' => 'user',
            'is_approved' => $approved,
            'created_date' => $now,
            'updated_date' => $now,
        ]);

        $token = app(JwtService::class)->issueToken([
            'id' => $id,
            'email' => $email,
            'role' => 'user',
        ]);

        return ['id' => (int) $id, 'token' => $token];
    }

    /** @param  array<string, mixed>  $payload */
    private function seedEntity(string $table, array $payload): int
    {
        return (int) DB::table($table)->insertGetId([
            'payload' => json_encode($payload),
            'created_date' => SqlDate::now(),
            'updated_date' => SqlDate::now(),
        ]);
    }
}
