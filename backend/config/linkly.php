<?php

return [
    'timezone' => env('APP_TIMEZONE', 'UTC'),
    'jwt_secret' => env('JWT_SECRET', 'change-me-in-production'),
    'admin_email' => env('ADMIN_EMAIL', 'admin@linkly.dev'),
    'admin_password' => env('ADMIN_PASSWORD', 'admin12345'),
    'app_base_url' => env('APP_BASE_URL', 'http://localhost:5173'),
    'frontend_url' => env('FRONTEND_URL', env('APP_BASE_URL', 'http://localhost:5173')),
    'brand_primary' => env('BRAND_PRIMARY', '#0f766e'),
    'domain_verify_prefix' => env('DOMAIN_VERIFY_PREFIX', '_linkly'),
    'dev_show_reset_token' => filter_var(env('DEV_SHOW_RESET_TOKEN', false), FILTER_VALIDATE_BOOL),
    'entities' => [
        'ABVariant',
        'Campaign',
        'ClickLog',
        'CustomDomain',
        'QRDesign',
        'LinkNotificationRule',
        'LinkTree',
        'RedirectRule',
        'ShortLink',
    ],
];

