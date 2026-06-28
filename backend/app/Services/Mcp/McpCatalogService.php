<?php

namespace App\Services\Mcp;

class McpCatalogService
{
    private const AUTH_BOTH = ['X-API-Key', 'Bearer'];

    private const COMMON_ERRORS = [
        ['status' => 401, 'message' => 'Invalid or missing credentials.'],
        ['status' => 429, 'message' => 'Too many requests. Please try again later.'],
    ];

    /** @return array<int, array<string, mixed>> */
    public function entries(): array
    {
        $maxPerPage = (int) config('mcp.max_per_page', 200);
        $defaultPerPage = (int) config('mcp.default_per_page', 50);

        return [
            $this->catalogEntry(),
            $this->listEntry(
                'links',
                'List or search short links with filtering, sorting, and pagination.',
                [
                    ['name' => 'search', 'in' => 'query', 'type' => 'string', 'required' => false, 'description' => 'Search by slug, title, or destination URL'],
                    ['name' => 'sort_by', 'in' => 'query', 'type' => 'string', 'required' => false, 'description' => 'Sort field (default: created_date)'],
                    ['name' => 'sort_order', 'in' => 'query', 'type' => 'string', 'required' => false, 'description' => 'asc or desc (default: desc)'],
                    ['name' => 'page', 'in' => 'query', 'type' => 'integer', 'required' => false],
                    ['name' => 'per_page', 'in' => 'query', 'type' => 'integer', 'required' => false, 'rules' => "min:1|max:{$maxPerPage}"],
                ],
                "GET /api/mcp/v1/links?search=summer&page=1&per_page={$defaultPerPage}",
                [
                    'success' => true,
                    'data' => [['id' => 1, 'slug' => 'summer-sale', 'title' => 'Summer Sale', 'destination_url' => 'https://example.com']],
                    'meta' => ['current_page' => 1, 'last_page' => 1, 'per_page' => $defaultPerPage, 'total' => 1],
                ]
            ),
            $this->showEntry('links', '{id}', 'Fetch a single short link by ID.'),
            $this->createEntry(
                'links',
                'Create a new short link.',
                ['slug', 'destination_url', 'title', 'status', 'campaign_id', 'domain_id'],
                ['slug' => 'launch', 'destination_url' => 'https://example.com', 'title' => 'Launch']
            ),
            $this->updateEntry('links', '{id}', 'Update an existing short link.'),
            $this->deleteEntry('links', '{id}', 'Delete a short link.'),
            $this->listEntry(
                'campaigns',
                'List or search link campaigns with pagination.',
                [
                    ['name' => 'search', 'in' => 'query', 'type' => 'string', 'required' => false, 'description' => 'Search by name or description'],
                    ['name' => 'page', 'in' => 'query', 'type' => 'integer', 'required' => false],
                    ['name' => 'per_page', 'in' => 'query', 'type' => 'integer', 'required' => false, 'rules' => "min:1|max:{$maxPerPage}"],
                ],
                "GET /api/mcp/v1/campaigns?page=1&per_page={$defaultPerPage}",
                [
                    'success' => true,
                    'data' => [['id' => 1, 'name' => 'Q2 Launch', 'status' => 'active']],
                    'meta' => ['current_page' => 1, 'last_page' => 1, 'per_page' => $defaultPerPage, 'total' => 1],
                ]
            ),
            $this->showEntry('campaigns', '{id}', 'Fetch a single campaign by ID.'),
            $this->listEntry(
                'domains',
                'List or search custom domains configured for short links.',
                [
                    ['name' => 'search', 'in' => 'query', 'type' => 'string', 'required' => false, 'description' => 'Search by domain name'],
                    ['name' => 'page', 'in' => 'query', 'type' => 'integer', 'required' => false],
                    ['name' => 'per_page', 'in' => 'query', 'type' => 'integer', 'required' => false, 'rules' => "min:1|max:{$maxPerPage}"],
                ],
                "GET /api/mcp/v1/domains?page=1&per_page={$defaultPerPage}",
                [
                    'success' => true,
                    'data' => [['id' => 1, 'domain' => 'go.example.com', 'status' => 'verified']],
                    'meta' => ['current_page' => 1, 'last_page' => 1, 'per_page' => $defaultPerPage, 'total' => 1],
                ]
            ),
            $this->showEntry('domains', '{id}', 'Fetch a single custom domain by ID.'),
            $this->listEntry(
                'users',
                'List application users (admin Bearer or API key required).',
                [
                    ['name' => 'search', 'in' => 'query', 'type' => 'string', 'required' => false, 'description' => 'Search by email, name, or Nexus SSO ID'],
                    ['name' => 'page', 'in' => 'query', 'type' => 'integer', 'required' => false],
                    ['name' => 'per_page', 'in' => 'query', 'type' => 'integer', 'required' => false, 'rules' => "min:1|max:{$maxPerPage}"],
                ],
                "GET /api/mcp/v1/users?page=1&per_page={$defaultPerPage}",
                [
                    'success' => true,
                    'data' => [['id' => 1, 'email' => 'admin@linkly.dev', 'role' => 'admin']],
                    'meta' => ['current_page' => 1, 'last_page' => 1, 'per_page' => $defaultPerPage, 'total' => 1],
                ],
                [['status' => 403, 'message' => 'Admin access required.']]
            ),
            $this->listEntry(
                'audit-logs',
                'List audit log entries for compliance and troubleshooting (admin only).',
                [
                    ['name' => 'search', 'in' => 'query', 'type' => 'string', 'required' => false, 'description' => 'Search action, user, or entity details'],
                    ['name' => 'action', 'in' => 'query', 'type' => 'string', 'required' => false, 'description' => 'Filter by action name'],
                    ['name' => 'page', 'in' => 'query', 'type' => 'integer', 'required' => false],
                    ['name' => 'per_page', 'in' => 'query', 'type' => 'integer', 'required' => false, 'rules' => "min:1|max:{$maxPerPage}"],
                ],
                'GET /api/mcp/v1/audit-logs?action=link_created&page=1',
                [
                    'success' => true,
                    'data' => [['id' => 1, 'action' => 'link_created', 'actor_user_id' => '1']],
                    'meta' => ['current_page' => 1, 'last_page' => 1, 'per_page' => $defaultPerPage, 'total' => 1],
                ],
                [['status' => 403, 'message' => 'Admin access required.']]
            ),
            [
                'method' => 'POST',
                'path' => '/api/sso/nexus/verify',
                'description' => 'Exchange a Nexus Brain SSO token for a Linkly session (used by Brain tile login).',
                'auth' => [],
                'params' => [
                    ['name' => 'token', 'in' => 'body', 'type' => 'string', 'required' => true, 'description' => 'Nexus JWT from Brain'],
                    ['name' => 'redirect_to', 'in' => 'body', 'type' => 'string', 'required' => false],
                    ['name' => 'return_to', 'in' => 'body', 'type' => 'string', 'required' => false],
                ],
                'request_example' => 'POST /api/sso/nexus/verify {"token":"<nexus-jwt>"}',
                'response_example' => [
                    'token' => '<linkly-jwt>',
                    'user' => ['id' => 1, 'email' => 'user@example.com'],
                ],
                'error_examples' => [
                    ['status' => 401, 'message' => 'Invalid token'],
                    ['status' => 422, 'message' => 'SSO is not configured.'],
                ],
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function catalogEntry(): array
    {
        return [
            'method' => 'GET',
            'path' => '/api/mcp/v1/catalog',
            'description' => 'Discover all MCP API endpoints available in this Linkly installation.',
            'auth' => self::AUTH_BOTH,
            'params' => [],
            'request_example' => 'GET /api/mcp/v1/catalog',
            'response_example' => [
                'success' => true,
                'data' => [['method' => 'GET', 'path' => '/api/mcp/v1/links', 'description' => 'List or search short links…']],
                'meta' => [],
            ],
            'error_examples' => self::COMMON_ERRORS,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $params
     * @param  array<int, array<string, mixed>>|null  $extraErrors
     * @return array<string, mixed>
     */
    private function listEntry(
        string $resource,
        string $description,
        array $params,
        string $requestExample,
        array $responseExample,
        ?array $extraErrors = null,
    ): array {
        return [
            'method' => 'GET',
            'path' => "/api/mcp/v1/{$resource}",
            'description' => $description,
            'auth' => self::AUTH_BOTH,
            'params' => $params,
            'request_example' => $requestExample,
            'response_example' => $responseExample,
            'error_examples' => array_merge(self::COMMON_ERRORS, $extraErrors ?? [
                ['status' => 422, 'message' => 'The given data was invalid.'],
            ]),
        ];
    }

    /** @return array<string, mixed> */
    private function showEntry(string $resource, string $idParam, string $description): array
    {
        return [
            'method' => 'GET',
            'path' => "/api/mcp/v1/{$resource}/{$idParam}",
            'description' => $description,
            'auth' => self::AUTH_BOTH,
            'params' => [
                ['name' => 'id', 'in' => 'path', 'type' => 'integer', 'required' => true],
            ],
            'request_example' => "GET /api/mcp/v1/{$resource}/1",
            'response_example' => ['success' => true, 'data' => ['id' => 1], 'meta' => []],
            'error_examples' => array_merge(self::COMMON_ERRORS, [
                ['status' => 404, 'message' => 'Resource not found.'],
            ]),
        ];
    }

    /**
     * @param  array<int, string>  $bodyFields
     * @param  array<string, mixed>  $bodyExample
     * @return array<string, mixed>
     */
    private function createEntry(string $resource, string $description, array $bodyFields, array $bodyExample): array
    {
        return [
            'method' => 'POST',
            'path' => "/api/mcp/v1/{$resource}",
            'description' => $description,
            'auth' => self::AUTH_BOTH,
            'params' => array_map(
                fn (string $field) => ['name' => $field, 'in' => 'body', 'type' => 'string', 'required' => $field === 'slug' || $field === 'destination_url'],
                $bodyFields
            ),
            'request_example' => 'POST /api/mcp/v1/'.$resource.' '.json_encode($bodyExample),
            'response_example' => ['success' => true, 'data' => ['id' => 1, ...$bodyExample], 'meta' => []],
            'error_examples' => array_merge(self::COMMON_ERRORS, [
                ['status' => 422, 'message' => 'The given data was invalid.'],
            ]),
        ];
    }

    /** @return array<string, mixed> */
    private function updateEntry(string $resource, string $idParam, string $description): array
    {
        return [
            'method' => 'PATCH',
            'path' => "/api/mcp/v1/{$resource}/{$idParam}",
            'description' => $description,
            'auth' => self::AUTH_BOTH,
            'params' => [
                ['name' => 'id', 'in' => 'path', 'type' => 'integer', 'required' => true],
            ],
            'request_example' => 'PATCH /api/mcp/v1/'.$resource.'/1 {"title":"Updated"}',
            'response_example' => ['success' => true, 'data' => ['id' => 1, 'title' => 'Updated'], 'meta' => []],
            'error_examples' => array_merge(self::COMMON_ERRORS, [
                ['status' => 404, 'message' => 'Resource not found.'],
                ['status' => 422, 'message' => 'The given data was invalid.'],
            ]),
        ];
    }

    /** @return array<string, mixed> */
    private function deleteEntry(string $resource, string $idParam, string $description): array
    {
        return [
            'method' => 'DELETE',
            'path' => "/api/mcp/v1/{$resource}/{$idParam}",
            'description' => $description,
            'auth' => self::AUTH_BOTH,
            'params' => [
                ['name' => 'id', 'in' => 'path', 'type' => 'integer', 'required' => true],
            ],
            'request_example' => 'DELETE /api/mcp/v1/'.$resource.'/1',
            'response_example' => ['success' => true, 'data' => ['id' => 1], 'meta' => []],
            'error_examples' => array_merge(self::COMMON_ERRORS, [
                ['status' => 404, 'message' => 'Resource not found.'],
            ]),
        ];
    }
}
