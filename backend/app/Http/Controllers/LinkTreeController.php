<?php

namespace App\Http\Controllers;

use App\Services\EntityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LinkTreeController extends Controller
{
    private const ENTITY = 'LinkTree';

    private const RESERVED_SLUGS = [
        'login',
        'register',
        'forgot-password',
        'sso',
        'links',
        'campaigns',
        'analytics',
        'history',
        'ab-testing',
        'redirects',
        'domains',
        'users',
        'audit-logs',
        'settings',
        'linktrees',
        't',
    ];

    private const BACKGROUND_PRESETS = [
        'slate',
        'ocean',
        'forest',
        'sunset',
        'midnight',
        'sand',
        'bloom',
        'aurora',
        'paper',
        'ember',
    ];

    private const BUTTON_STYLES = [
        'solid',
        'outline',
        'soft',
        'glass',
    ];

    private const BUTTON_RADII = [
        'rounded',
        'pill',
        'square',
    ];

    private const FONT_STYLES = [
        'sans',
        'display',
        'mono',
    ];

    private const AVATAR_SHAPES = [
        'circle',
        'rounded',
    ];

    private const BACKGROUND_FITS = [
        'cover',
        'contain',
        'fill',
    ];

    private const BACKGROUND_POSITIONS = [
        'top-left',
        'top',
        'top-right',
        'left',
        'center',
        'right',
        'bottom-left',
        'bottom',
        'bottom-right',
    ];

    private const LINK_TYPES = [
        'link',
        'video',
        'music',
        'image',
        'header',
        'text',
        'email',
        'phone',
        'divider',
    ];

    private const SOCIAL_PLATFORMS = [
        'instagram',
        'x',
        'tiktok',
        'youtube',
        'linkedin',
        'facebook',
        'github',
        'website',
    ];

    private const STATUSES = [
        'draft',
        'published',
        'paused',
    ];

    public function __construct(private EntityService $entities) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $table = $this->tableOrFail();
        if ($table instanceof JsonResponse) {
            return $table;
        }

        $sortBy = $request->query('sortBy', '-created_date');
        $limit = (int) $request->query('limit', 200);

        $all = $this->entities->fetchAll($table);
        $scoped = array_values(array_filter($all, fn ($row) => $this->canAccess($user, $row)));
        $rows = $this->entities->applyLimit($this->entities->sortRecords($scoped, $sortBy), $limit);

        return response()->json($rows);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $table = $this->tableOrFail();
        if ($table instanceof JsonResponse) {
            return $table;
        }

        $record = $this->entities->find($table, $id);
        if (! $record) {
            return $this->error('not_found', 'Link tree not found', 404);
        }

        if (! $this->canAccess($user, $record)) {
            return $this->error('forbidden', 'You cannot access this link tree', 403);
        }

        return response()->json($record);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $table = $this->tableOrFail();
        if ($table instanceof JsonResponse) {
            return $table;
        }

        $payload = $this->normalizePayload($request->all(), true);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $payload['owner_user_id'] = (int) $user->id;

        $slugError = $this->validateSlug($table, $payload['slug']);
        if ($slugError) {
            return $slugError;
        }

        $record = $this->entities->create($table, self::ENTITY, $payload, (string) $user->id);

        return response()->json($record, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $table = $this->tableOrFail();
        if ($table instanceof JsonResponse) {
            return $table;
        }

        $existing = $this->entities->find($table, $id);
        if (! $existing) {
            return $this->error('not_found', 'Link tree not found', 404);
        }

        if (! $this->canAccess($user, $existing)) {
            return $this->error('forbidden', 'You cannot update this link tree', 403);
        }

        $incoming = $request->all();
        unset($incoming['owner_user_id'], $incoming['id'], $incoming['created_date'], $incoming['updated_date']);

        $payload = $this->normalizePayload([
            ...$existing,
            ...$incoming,
        ], false);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $payload['owner_user_id'] = (int) ($existing['owner_user_id'] ?? $user->id);

        if (($payload['slug'] ?? '') !== ($existing['slug'] ?? '')) {
            $slugError = $this->validateSlug($table, $payload['slug'], $id);
            if ($slugError) {
                return $slugError;
            }
        }

        $updated = $this->entities->update($table, self::ENTITY, $id, $payload, (string) $user->id);

        return response()->json($updated);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->attributes->get('auth_user');
        $table = $this->tableOrFail();
        if ($table instanceof JsonResponse) {
            return $table;
        }

        $existing = $this->entities->find($table, $id);
        if (! $existing) {
            return $this->error('not_found', 'Link tree not found', 404);
        }

        if (! $this->canAccess($user, $existing)) {
            return $this->error('forbidden', 'You cannot delete this link tree', 403);
        }

        $deleted = $this->entities->delete($table, self::ENTITY, $id, (string) $user->id);

        return response()->json($deleted);
    }

    public function publicShow(string $slug): JsonResponse
    {
        $table = $this->tableOrFail();
        if ($table instanceof JsonResponse) {
            return $table;
        }

        $normalized = $this->normalizeSlug($slug);
        if ($normalized === '') {
            return $this->error('not_found', 'Link tree not found', 404);
        }

        $all = $this->entities->fetchAll($table);
        $match = null;
        foreach ($all as $row) {
            if ($this->normalizeSlug((string) ($row['slug'] ?? '')) === $normalized) {
                $match = $row;
                break;
            }
        }

        if (! $match || ($match['status'] ?? '') !== 'published') {
            return $this->error('not_found', 'Link tree not found', 404);
        }

        $links = is_array($match['links'] ?? null) ? $match['links'] : [];
        $enabledLinks = array_values(array_filter($links, fn ($link) => ! empty($link['enabled'])));
        usort($enabledLinks, fn ($a, $b) => ((int) ($a['sort_order'] ?? 0)) <=> ((int) ($b['sort_order'] ?? 0)));

        $socials = is_array($match['socials'] ?? null) ? $match['socials'] : [];

        return response()->json([
            'id' => $match['id'],
            'slug' => $match['slug'],
            'title' => $match['title'] ?? '',
            'bio' => $match['bio'] ?? '',
            'avatar_url' => $match['avatar_url'] ?? null,
            'theme' => $match['theme'] ?? $this->defaultTheme(),
            'socials' => $socials,
            'total_views' => (int) ($match['total_views'] ?? 0),
            'total_clicks' => (int) ($match['total_clicks'] ?? 0),
            'links' => array_map(fn ($link) => [
                'id' => $link['id'] ?? null,
                'type' => $link['type'] ?? 'link',
                'title' => $link['title'] ?? '',
                'url' => $link['url'] ?? '',
                'description' => $link['description'] ?? '',
                'image_url' => $link['image_url'] ?? '',
                'enabled' => true,
                'clicks' => (int) ($link['clicks'] ?? 0),
                'sort_order' => (int) ($link['sort_order'] ?? 0),
            ], $enabledLinks),
        ]);
    }

    public function trackPublicEvent(Request $request, string $slug): JsonResponse
    {
        $event = (string) $request->input('event', '');
        if (! in_array($event, ['page_view', 'block_click'], true)) {
            return $this->error('invalid_event', 'Event must be page_view or block_click', 422);
        }

        $table = $this->tableOrFail();
        if ($table instanceof JsonResponse) {
            return $table;
        }

        $match = $this->findPublishedBySlug($table, $slug);
        if (! $match) {
            return $this->error('not_found', 'Link tree not found', 404);
        }

        $isTest = filter_var($request->input('is_test', false), FILTER_VALIDATE_BOOL);
        $blockId = trim((string) $request->input('block_id', ''));
        $blockTitle = trim((string) $request->input('block_title', ''));
        $blockType = trim((string) $request->input('block_type', ''));

        if ($event === 'block_click') {
            if ($blockId === '') {
                return $this->error('invalid_block', 'block_id is required for block_click', 422);
            }
            $links = is_array($match['links'] ?? null) ? $match['links'] : [];
            $found = false;
            foreach ($links as $link) {
                if ((string) ($link['id'] ?? '') === $blockId && ! empty($link['enabled'])) {
                    $found = true;
                    if ($blockTitle === '') {
                        $blockTitle = (string) ($link['title'] ?? '');
                    }
                    if ($blockType === '') {
                        $blockType = (string) ($link['type'] ?? 'link');
                    }
                    break;
                }
            }
            if (! $found) {
                // Still allow social / unknown targets by title only for social row later
                if ($blockType !== 'social') {
                    return $this->error('invalid_block', 'Block not found on this tree', 404);
                }
            }
        }

        $clickTable = $this->entities->tableFor('ClickLog');
        if (! $clickTable) {
            return $this->error('not_configured', 'ClickLog entity is not configured', 500);
        }

        $clickPayload = [
            'link_id' => null,
            'link_tree_id' => (int) $match['id'],
            'slug' => (string) ($match['slug'] ?? ''),
            'event' => $event,
            'block_id' => $blockId !== '' ? $blockId : null,
            'block_title' => $blockTitle !== '' ? mb_substr($blockTitle, 0, 120) : null,
            'block_type' => $blockType !== '' ? mb_substr($blockType, 0, 40) : null,
            'timestamp' => (string) ($request->input('timestamp') ?: now()->toIso8601String()),
            'user_agent' => mb_substr((string) $request->input('user_agent', ''), 0, 500),
            'browser' => mb_substr((string) $request->input('browser', ''), 0, 60),
            'browser_version' => mb_substr((string) $request->input('browser_version', ''), 0, 40),
            'device_type' => $this->normalizeDeviceType((string) $request->input('device_type', '')),
            'platform' => mb_substr((string) $request->input('platform', ''), 0, 40),
            'referrer' => mb_substr((string) $request->input('referrer', ''), 0, 500) ?: null,
            'referrer_source' => $this->normalizeReferrerSource((string) $request->input('referrer_source', '')),
            'is_unique' => ! $isTest,
            'is_test' => $isTest,
            'is_converted' => false,
        ];

        $this->entities->create($clickTable, 'ClickLog', $clickPayload, null);

        if (! $isTest) {
            $patch = [];
            if ($event === 'page_view') {
                $patch['total_views'] = ((int) ($match['total_views'] ?? 0)) + 1;
            }
            if ($event === 'block_click') {
                $patch['total_clicks'] = ((int) ($match['total_clicks'] ?? 0)) + 1;
                $links = is_array($match['links'] ?? null) ? $match['links'] : [];
                foreach ($links as $index => $link) {
                    if ((string) ($link['id'] ?? '') === $blockId) {
                        $links[$index]['clicks'] = ((int) ($link['clicks'] ?? 0)) + 1;
                    }
                }
                $patch['links'] = $links;
            }
            if ($patch !== []) {
                $this->entities->update($table, self::ENTITY, (string) $match['id'], $patch, null);
            }
        }

        return response()->json([
            'ok' => true,
            'event' => $event,
            'link_tree_id' => (int) $match['id'],
        ]);
    }

    private function findPublishedBySlug(string $table, string $slug): ?array
    {
        $normalized = $this->normalizeSlug($slug);
        if ($normalized === '') {
            return null;
        }

        foreach ($this->entities->fetchAll($table) as $row) {
            if ($this->normalizeSlug((string) ($row['slug'] ?? '')) === $normalized) {
                if (($row['status'] ?? '') !== 'published') {
                    return null;
                }

                return $row;
            }
        }

        return null;
    }

    private function normalizeDeviceType(string $value): string
    {
        return in_array($value, ['Desktop', 'Mobile', 'Tablet'], true) ? $value : 'Desktop';
    }

    private function normalizeReferrerSource(string $value): string
    {
        $allowed = ['Facebook', 'Instagram', 'WhatsApp', 'Twitter', 'Google', 'Direct', 'Email', 'Other'];

        return in_array($value, $allowed, true) ? $value : 'Other';
    }

    private function tableOrFail(): string|JsonResponse
    {
        $table = $this->entities->tableFor(self::ENTITY);
        if (! $table) {
            return $this->error('not_configured', 'LinkTree entity is not configured', 500);
        }

        return $table;
    }

    private function canAccess(object $user, array $record): bool
    {
        if (($user->role ?? '') === 'admin') {
            return true;
        }

        return (string) ($record['owner_user_id'] ?? '') === (string) $user->id;
    }

    private function validateSlug(string $table, string $slug, ?string $excludeId = null): ?JsonResponse
    {
        if ($slug === '' || ! preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
            return $this->error('invalid_slug', 'Slug must be lowercase letters, numbers, and hyphens', 422);
        }

        if (in_array($slug, self::RESERVED_SLUGS, true) || strlen($slug) > 64) {
            return $this->error('reserved_slug', 'This slug is reserved or too long', 422);
        }

        foreach ($this->entities->fetchAll($table) as $row) {
            if ($excludeId !== null && (string) $row['id'] === (string) $excludeId) {
                continue;
            }
            if ($this->normalizeSlug((string) ($row['slug'] ?? '')) === $slug) {
                return $this->error('slug_taken', 'This slug is already in use', 422);
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>|JsonResponse
     */
    private function normalizePayload(array $input, bool $isCreate): array|JsonResponse
    {
        $title = trim((string) ($input['title'] ?? ''));
        if ($title === '') {
            return $this->error('invalid_title', 'Title is required', 422);
        }

        $slugSource = $input['slug'] ?? null;
        if ($slugSource === null || trim((string) $slugSource) === '') {
            $slugSource = $title;
        }
        $slug = $this->normalizeSlug((string) $slugSource);
        if ($slug === '') {
            return $this->error('invalid_slug', 'Slug is required', 422);
        }

        $status = (string) ($input['status'] ?? ($isCreate ? 'draft' : 'draft'));
        if (! in_array($status, self::STATUSES, true)) {
            return $this->error('invalid_status', 'Invalid status', 422);
        }

        $themeInput = is_array($input['theme'] ?? null) ? $input['theme'] : [];
        $theme = $this->normalizeTheme($themeInput);
        if ($theme instanceof JsonResponse) {
            return $theme;
        }

        $linksInput = is_array($input['links'] ?? null) ? $input['links'] : [];
        $links = $this->normalizeLinks($linksInput);
        if ($links instanceof JsonResponse) {
            return $links;
        }

        $socialsInput = is_array($input['socials'] ?? null) ? $input['socials'] : [];
        $socials = $this->normalizeSocials($socialsInput);
        if ($socials instanceof JsonResponse) {
            return $socials;
        }

        $avatarUrl = $input['avatar_url'] ?? null;
        if ($avatarUrl !== null && $avatarUrl !== '') {
            $avatarUrl = trim((string) $avatarUrl);
            if (strlen($avatarUrl) > 2048) {
                return $this->error('invalid_avatar', 'Avatar URL is too long', 422);
            }
        } else {
            $avatarUrl = null;
        }

        $bio = trim((string) ($input['bio'] ?? ''));
        if (strlen($bio) > 500) {
            return $this->error('invalid_bio', 'Bio must be 500 characters or fewer', 422);
        }

        return [
            'title' => mb_substr($title, 0, 120),
            'slug' => $slug,
            'bio' => $bio,
            'avatar_url' => $avatarUrl,
            'status' => $status,
            'theme' => $theme,
            'socials' => $socials,
            'links' => $links,
        ];
    }

    /**
     * @param  array<string, mixed>  $theme
     * @return array<string, mixed>|JsonResponse
     */
    private function normalizeTheme(array $theme): array|JsonResponse
    {
        $preset = (string) ($theme['background_preset'] ?? 'slate');
        if (! in_array($preset, self::BACKGROUND_PRESETS, true)) {
            return $this->error('invalid_theme', 'Invalid background preset', 422);
        }

        $buttonStyle = (string) ($theme['button_style'] ?? 'solid');
        if (! in_array($buttonStyle, self::BUTTON_STYLES, true)) {
            return $this->error('invalid_theme', 'Invalid button style', 422);
        }

        $buttonRadius = (string) ($theme['button_radius'] ?? 'rounded');
        if (! in_array($buttonRadius, self::BUTTON_RADII, true)) {
            return $this->error('invalid_theme', 'Invalid button radius', 422);
        }

        $fontStyle = (string) ($theme['font_style'] ?? 'sans');
        if (! in_array($fontStyle, self::FONT_STYLES, true)) {
            return $this->error('invalid_theme', 'Invalid font style', 422);
        }

        $avatarShape = (string) ($theme['avatar_shape'] ?? 'circle');
        if (! in_array($avatarShape, self::AVATAR_SHAPES, true)) {
            return $this->error('invalid_theme', 'Invalid avatar shape', 422);
        }

        $accent = strtolower(trim((string) ($theme['accent_color'] ?? '#0f766e')));
        if (! preg_match('/^#[0-9a-f]{6}$/', $accent)) {
            return $this->error('invalid_theme', 'Accent color must be a hex value like #0f766e', 422);
        }

        $backgroundImage = trim((string) ($theme['background_image_url'] ?? ''));
        if ($backgroundImage !== '' && ! $this->isHttpUrl($backgroundImage)) {
            return $this->error('invalid_theme', 'Background image must be a valid http(s) URL', 422);
        }

        $backgroundFit = (string) ($theme['background_fit'] ?? 'cover');
        if (! in_array($backgroundFit, self::BACKGROUND_FITS, true)) {
            return $this->error('invalid_theme', 'Invalid background image fit', 422);
        }

        $backgroundPosition = (string) ($theme['background_position'] ?? 'center');
        if (! in_array($backgroundPosition, self::BACKGROUND_POSITIONS, true)) {
            return $this->error('invalid_theme', 'Invalid background image position', 422);
        }

        $backgroundZoom = (int) ($theme['background_zoom'] ?? 100);
        if ($backgroundZoom < 100 || $backgroundZoom > 200) {
            return $this->error('invalid_theme', 'Background zoom must be between 100 and 200', 422);
        }

        $overlayOpacity = (int) ($theme['overlay_opacity'] ?? 45);
        if ($overlayOpacity < 0 || $overlayOpacity > 100) {
            return $this->error('invalid_theme', 'Overlay opacity must be between 0 and 100', 422);
        }

        $showBranding = array_key_exists('show_branding', $theme)
            ? (bool) $theme['show_branding']
            : true;

        return [
            'background_preset' => $preset,
            'background_image_url' => $backgroundImage,
            'background_fit' => $backgroundFit,
            'background_position' => $backgroundPosition,
            'background_zoom' => $backgroundZoom,
            'overlay_opacity' => $overlayOpacity,
            'button_style' => $buttonStyle,
            'button_radius' => $buttonRadius,
            'font_style' => $fontStyle,
            'avatar_shape' => $avatarShape,
            'accent_color' => $accent,
            'show_branding' => $showBranding,
        ];
    }

    /**
     * @param  array<int, mixed>  $links
     * @return array<int, array<string, mixed>>|JsonResponse
     */
    private function normalizeLinks(array $links): array|JsonResponse
    {
        $normalized = [];
        $index = 0;

        foreach ($links as $link) {
            if (! is_array($link)) {
                continue;
            }

            $type = (string) ($link['type'] ?? 'link');
            if (! in_array($type, self::LINK_TYPES, true)) {
                return $this->error('invalid_link', 'Invalid block type', 422);
            }

            $title = trim((string) ($link['title'] ?? ''));
            $url = trim((string) ($link['url'] ?? ''));
            $description = trim((string) ($link['description'] ?? ''));
            $imageUrl = trim((string) ($link['image_url'] ?? ''));

            if ($type === 'divider') {
                $normalized[] = $this->linkRecord($link, $type, '', '', '', '', $index);
                $index++;

                continue;
            }

            if ($type === 'header' || $type === 'text') {
                if ($title === '') {
                    continue;
                }
                $normalized[] = $this->linkRecord($link, $type, $title, '', $description, '', $index);
                $index++;

                continue;
            }

            if ($type === 'image') {
                $src = $imageUrl !== '' ? $imageUrl : $url;
                if ($src === '') {
                    continue;
                }
                if (! $this->isHttpUrl($src)) {
                    return $this->error('invalid_link', 'Image URL must be a valid http(s) URL', 422);
                }
                if ($url !== '' && ! $this->isHttpUrl($url) && $url !== $src) {
                    return $this->error('invalid_link', 'Image link URL must be valid http(s)', 422);
                }
                $normalized[] = $this->linkRecord(
                    $link,
                    $type,
                    $title,
                    $url !== '' && $url !== $src ? $url : '',
                    $description,
                    $src,
                    $index
                );
                $index++;

                continue;
            }

            if ($type === 'email') {
                if ($title === '' && $url === '') {
                    continue;
                }
                if ($title === '' || $url === '') {
                    return $this->error('invalid_link', 'Email blocks need a label and email address', 422);
                }
                $email = preg_replace('/^mailto:/i', '', $url) ?? $url;
                if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    return $this->error('invalid_link', 'Invalid email address', 422);
                }
                $normalized[] = $this->linkRecord($link, $type, $title, $email, '', '', $index);
                $index++;

                continue;
            }

            if ($type === 'phone') {
                if ($title === '' && $url === '') {
                    continue;
                }
                if ($title === '' || $url === '') {
                    return $this->error('invalid_link', 'Phone blocks need a label and phone number', 422);
                }
                $phone = preg_replace('/^tel:/i', '', $url) ?? $url;
                if (strlen(preg_replace('/[^\d+]/', '', $phone) ?? '') < 3) {
                    return $this->error('invalid_link', 'Invalid phone number', 422);
                }
                $normalized[] = $this->linkRecord($link, $type, $title, $phone, '', '', $index);
                $index++;

                continue;
            }

            // link | video | music
            if ($title === '' && $url === '') {
                continue;
            }
            if ($type === 'link' && $title === '') {
                return $this->error('invalid_link', 'Each link needs a title', 422);
            }
            if ($url === '' || ! $this->isHttpUrl($url)) {
                return $this->error('invalid_link', 'Each block needs a valid http(s) URL', 422);
            }
            if ($type === 'video' && ! $this->isVideoUrl($url)) {
                return $this->error('invalid_link', 'Video URL must be YouTube or Vimeo', 422);
            }

            $normalized[] = $this->linkRecord(
                $link,
                $type,
                $title !== '' ? $title : ($type === 'video' ? 'Video' : ($type === 'music' ? 'Music' : 'Link')),
                $url,
                $description,
                '',
                $index
            );
            $index++;
        }

        return $normalized;
    }

    /**
     * @param  array<int, mixed>  $socials
     * @return array<int, array<string, string>>|JsonResponse
     */
    private function normalizeSocials(array $socials): array|JsonResponse
    {
        $normalized = [];

        foreach ($socials as $social) {
            if (! is_array($social)) {
                continue;
            }
            $platform = (string) ($social['platform'] ?? '');
            $url = $this->normalizeHttpUrl(trim((string) ($social['url'] ?? '')));
            if ($platform === '' || $url === '') {
                continue;
            }
            if (! in_array($platform, self::SOCIAL_PLATFORMS, true)) {
                return $this->error('invalid_social', 'Invalid social platform', 422);
            }
            if (! $this->isHttpUrl($url)) {
                return $this->error('invalid_social', 'Social URLs must be valid http(s)', 422);
            }
            $normalized[] = [
                'platform' => $platform,
                'url' => mb_substr($url, 0, 2048),
            ];
        }

        return $normalized;
    }

    private function normalizeHttpUrl(string $url): string
    {
        if ($url === '') {
            return '';
        }

        if (! preg_match('/^[a-z][a-z0-9+.-]*:/i', $url)) {
            $url = 'https://'.ltrim($url, '/');
        }

        return $url;
    }

    /**
     * @param  array<string, mixed>  $link
     */
    private function linkRecord(
        array $link,
        string $type,
        string $title,
        string $url,
        string $description,
        string $imageUrl,
        int $index
    ): array {
        $id = trim((string) ($link['id'] ?? ''));
        if ($id === '') {
            $id = (string) Str::uuid();
        }

        return [
            'id' => $id,
            'type' => $type,
            'title' => mb_substr($title, 0, $type === 'text' ? 1000 : 120),
            'url' => mb_substr($url, 0, 2048),
            'description' => mb_substr($description, 0, 300),
            'image_url' => mb_substr($imageUrl, 0, 2048),
            'enabled' => array_key_exists('enabled', $link) ? (bool) $link['enabled'] : true,
            'clicks' => max(0, (int) ($link['clicks'] ?? 0)),
            'sort_order' => $index,
        ];
    }

    private function isHttpUrl(string $url): bool
    {
        if (! filter_var($url, FILTER_VALIDATE_URL)) {
            return false;
        }

        return (bool) preg_match('/^https?:\/\//i', $url);
    }

    private function isVideoUrl(string $url): bool
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        $host = preg_replace('/^www\./', '', $host) ?? $host;

        return in_array($host, [
            'youtube.com',
            'm.youtube.com',
            'youtu.be',
            'youtube-nocookie.com',
            'vimeo.com',
            'player.vimeo.com',
        ], true);
    }

    private function defaultTheme(): array
    {
        return [
            'background_preset' => 'slate',
            'background_image_url' => '',
            'background_fit' => 'cover',
            'background_position' => 'center',
            'background_zoom' => 100,
            'overlay_opacity' => 45,
            'button_style' => 'solid',
            'button_radius' => 'rounded',
            'font_style' => 'sans',
            'avatar_shape' => 'circle',
            'accent_color' => '#0f766e',
            'show_branding' => true,
        ];
    }

    private function normalizeSlug(string $value): string
    {
        return Str::slug(strtolower(trim($value)));
    }
}
