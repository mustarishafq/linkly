<?php

namespace Tests\Feature;

use App\Services\JwtService;
use App\Services\SettingsService;
use App\Support\SqlDate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class McpApiTest extends TestCase
{
    use RefreshDatabase;

    private string $apiKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    protected function setUp(): void
    {
        parent::setUp();

        config(['mcp.api_key' => $this->apiKey]);
        app(SettingsService::class)->seedDefaults();
    }

    public function test_catalog_requires_authentication(): void
    {
        $response = $this->getJson('/api/mcp/v1/catalog');

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Invalid or missing credentials.',
            ]);
    }

    public function test_catalog_returns_endpoint_definitions_with_api_key(): void
    {
        $response = $this->getJson('/api/mcp/v1/catalog', [
            'X-API-Key' => $this->apiKey,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    ['method', 'path', 'description', 'auth'],
                ],
                'meta',
            ]);

        $paths = collect($response->json('data'))->pluck('path')->all();
        $this->assertContains('/api/mcp/v1/catalog', $paths);
        $this->assertContains('/api/mcp/v1/links', $paths);
    }

    public function test_links_list_returns_paginated_envelope(): void
    {
        $this->seedShortLink(['slug' => 'launch', 'title' => 'Launch', 'destination_url' => 'https://example.com']);

        $response = $this->getJson('/api/mcp/v1/links?search=launch', [
            'X-API-Key' => $this->apiKey,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.slug', 'launch');
    }

    public function test_link_create_validates_input(): void
    {
        $response = $this->postJson('/api/mcp/v1/links', [], [
            'X-API-Key' => $this->apiKey,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'The given data was invalid.',
            ]);
    }

    public function test_link_create_and_show(): void
    {
        $create = $this->postJson('/api/mcp/v1/links', [
            'slug' => 'new-link',
            'destination_url' => 'https://example.com/page',
            'title' => 'Example',
        ], [
            'X-API-Key' => $this->apiKey,
        ]);

        $create->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.slug', 'new-link');

        $id = (string) $create->json('data.id');

        $show = $this->getJson("/api/mcp/v1/links/{$id}", [
            'X-API-Key' => $this->apiKey,
        ]);

        $show->assertOk()->assertJsonPath('data.title', 'Example');
    }

    public function test_bearer_user_can_read_links(): void
    {
        $this->seedShortLink(['slug' => 'read-me', 'destination_url' => 'https://example.com']);
        $token = $this->issueUserToken('user');

        $response = $this->getJson('/api/mcp/v1/links', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk()->assertJsonPath('success', true);
    }

    public function test_bearer_user_cannot_list_users_without_admin(): void
    {
        $token = $this->issueUserToken('user');

        $response = $this->getJson('/api/mcp/v1/users', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Admin access required.');
    }

    public function test_admin_bearer_can_list_users(): void
    {
        $token = $this->issueUserToken('admin');

        $response = $this->getJson('/api/mcp/v1/users', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk()->assertJsonPath('success', true);
    }

    public function test_settings_api_redacts_mcp_api_key(): void
    {
        app(SettingsService::class)->updateMcpApiConfig([
            'api_key' => $this->apiKey,
            'rate_limit' => 120,
        ]);

        $adminToken = $this->issueUserToken('admin');

        $response = $this->getJson('/api/settings', [
            'Authorization' => 'Bearer '.$adminToken,
        ]);

        $response->assertOk()
            ->assertJsonPath('mcp_api.api_key_set', true)
            ->assertJsonPath('mcp_api.rate_limit', 120)
            ->assertJsonMissing(['api_key' => $this->apiKey]);
    }

    /** @param  array<string, mixed>  $payload */
    private function seedShortLink(array $payload): void
    {
        DB::table('entity_shortlink')->insert([
            'payload' => json_encode($payload),
            'created_date' => SqlDate::now(),
            'updated_date' => SqlDate::now(),
        ]);
    }

    private function issueUserToken(string $role): string
    {
        $now = SqlDate::now();
        $id = DB::table('users')->insertGetId([
            'email' => $role.'@mcp.test',
            'full_name' => ucfirst($role).' User',
            'password_hash' => Hash::make('password'),
            'role' => $role,
            'is_approved' => true,
            'created_date' => $now,
            'updated_date' => $now,
        ]);

        return app(JwtService::class)->issueToken([
            'id' => $id,
            'email' => $role.'@mcp.test',
            'role' => $role,
        ]);
    }
}
