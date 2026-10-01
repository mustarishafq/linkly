<?php

namespace Tests\Feature;

use App\Services\JwtService;
use App\Support\SqlDate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EntityAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_lists_only_personal_links_and_clicks(): void
    {
        $owner = $this->createUser('owner@example.com', 'user');
        $other = $this->createUser('other@example.com', 'user');
        $admin = $this->createUser('admin@example.com', 'admin');

        $ownLink = $this->seedEntity('entity_shortlink', [
            'slug' => 'mine',
            'destination_url' => 'https://mine.example',
            'owner_user_id' => $owner['id'],
        ]);
        $otherLink = $this->seedEntity('entity_shortlink', [
            'slug' => 'theirs',
            'destination_url' => 'https://theirs.example',
            'owner_user_id' => $other['id'],
        ]);
        $this->seedEntity('entity_clicklog', [
            'link_id' => $ownLink,
            'slug' => 'mine',
        ]);
        $this->seedEntity('entity_clicklog', [
            'link_id' => $otherLink,
            'slug' => 'theirs',
        ]);

        $ownList = $this->withToken($owner['token'])->postJson('/api/entities/ShortLink/list', [
            'sortBy' => '-created_date',
            'limit' => 50,
        ]);
        $ownList->assertOk();
        $this->assertSame(['mine'], array_column($ownList->json(), 'slug'));

        $ownClicks = $this->withToken($owner['token'])->postJson('/api/entities/ClickLog/list', [
            'limit' => 50,
        ]);
        $ownClicks->assertOk();
        $this->assertSame(['mine'], array_column($ownClicks->json(), 'slug'));

        $adminList = $this->withToken($admin['token'])->postJson('/api/entities/ShortLink/list', [
            'limit' => 50,
        ]);
        $adminList->assertOk();
        $this->assertEqualsCanonicalizing(['mine', 'theirs'], array_column($adminList->json(), 'slug'));

        $this->withToken($owner['token'])
            ->getJson('/api/entities/ShortLink/'.$otherLink)
            ->assertNotFound();
    }

    public function test_anonymous_list_is_rejected_but_public_redirect_still_works(): void
    {
        $linkId = $this->seedEntity('entity_shortlink', [
            'slug' => 'public',
            'destination_url' => 'https://public.example',
            'owner_user_id' => 9,
            'total_clicks' => 1,
            'status' => 'active',
        ]);
        $this->seedEntity('entity_redirectrule', [
            'link_id' => $linkId,
            'rule_type' => 'device',
            'condition_value' => 'Mobile',
            'redirect_url' => 'https://mobile.example',
            'is_active' => true,
        ]);

        $this->postJson('/api/entities/ShortLink/list', ['limit' => 20])->assertUnauthorized();
        $this->postJson('/api/entities/ShortLink/filter', ['where' => []])->assertUnauthorized();

        $bySlug = $this->postJson('/api/entities/ShortLink/filter', [
            'where' => ['slug' => 'public'],
        ]);
        $bySlug->assertOk();
        $this->assertSame('https://public.example', $bySlug->json('0.destination_url'));

        $rules = $this->postJson('/api/entities/RedirectRule/filter', [
            'where' => ['link_id' => $linkId],
        ]);
        $rules->assertOk();
        $this->assertCount(1, $rules->json());

        $this->postJson('/api/entities/ClickLog', [
            'link_id' => $linkId,
            'slug' => 'public',
        ])->assertOk();

        $this->patchJson('/api/entities/ShortLink/'.$linkId, [
            'total_clicks' => 2,
        ])->assertOk();

        $this->patchJson('/api/entities/ShortLink/'.$linkId, [
            'destination_url' => 'https://hijack.example',
        ])->assertUnauthorized();
    }

    public function test_user_cannot_take_or_edit_another_users_link(): void
    {
        $owner = $this->createUser('owner@example.com', 'user');
        $other = $this->createUser('other@example.com', 'user');
        $linkId = $this->seedEntity('entity_shortlink', [
            'slug' => 'owned',
            'destination_url' => 'https://owned.example',
            'owner_user_id' => $owner['id'],
        ]);

        $this->withToken($other['token'])
            ->patchJson('/api/entities/ShortLink/'.$linkId, [
                'destination_url' => 'https://hijack.example',
            ])
            ->assertForbidden();

        $this->withToken($other['token'])
            ->deleteJson('/api/entities/ShortLink/'.$linkId)
            ->assertForbidden();

        $created = $this->withToken($other['token'])->postJson('/api/entities/ShortLink', [
            'slug' => 'new',
            'destination_url' => 'https://new.example',
            'owner_user_id' => $owner['id'],
        ]);
        $created->assertOk();
        $this->assertSame($other['id'], $created->json('owner_user_id'));
    }

    public function test_user_directory_returns_only_the_signed_in_user(): void
    {
        $user = $this->createUser('user@example.com', 'user');
        $admin = $this->createUser('admin@example.com', 'admin');

        $personal = $this->withToken($user['token'])->getJson('/api/users/directory');
        $personal->assertOk();
        $this->assertSame(['user@example.com'], array_column($personal->json(), 'email'));

        $everyone = $this->withToken($admin['token'])->getJson('/api/users/directory');
        $everyone->assertOk();
        $this->assertEqualsCanonicalizing(
            ['user@example.com', 'admin@example.com'],
            array_column($everyone->json(), 'email')
        );
    }

    public function test_mcp_user_token_cannot_read_other_links(): void
    {
        $owner = $this->createUser('owner@example.com', 'user');
        $other = $this->createUser('other@example.com', 'user');
        $this->seedEntity('entity_shortlink', [
            'slug' => 'mine',
            'title' => 'Mine',
            'destination_url' => 'https://mine.example',
            'owner_user_id' => $owner['id'],
        ]);
        $otherLink = $this->seedEntity('entity_shortlink', [
            'slug' => 'theirs',
            'title' => 'Theirs',
            'destination_url' => 'https://theirs.example',
            'owner_user_id' => $other['id'],
        ]);

        $list = $this->withToken($owner['token'])->getJson('/api/mcp/v1/links');
        $list->assertOk();
        $this->assertSame(['mine'], array_column($list->json('data'), 'slug'));

        $this->withToken($owner['token'])
            ->getJson('/api/mcp/v1/links/'.$otherLink)
            ->assertNotFound();
    }

    /**
     * @return array{id: int, token: string}
     */
    private function createUser(string $email, string $role): array
    {
        $now = SqlDate::now();
        $id = DB::table('users')->insertGetId([
            'email' => $email,
            'full_name' => $email,
            'password_hash' => Hash::make('password'),
            'role' => $role,
            'is_approved' => true,
            'created_date' => $now,
            'updated_date' => $now,
        ]);

        $token = app(JwtService::class)->issueToken([
            'id' => $id,
            'email' => $email,
            'role' => $role,
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
