<?php

return [
    'default_per_page' => 50,
    'max_per_page' => 200,
    'api_key' => env('MCP_API_KEY', ''),
    'api_keys' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('MCP_API_KEYS', ''))
    ))),
    'rate_limit' => max(1, (int) env('MCP_RATE_LIMIT', 60)),
];
