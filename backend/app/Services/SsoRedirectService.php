<?php

namespace App\Services;

class SsoRedirectService
{
    private const DEFAULT_REDIRECT = '/';

    public function parseAllowedOrigins(string $frontendUrl): array
    {
        return collect(explode(',', $frontendUrl))
            ->map(fn ($url) => trim($url))
            ->filter()
            ->map(function ($url) {
                $parsed = parse_url($url);

                if (! $parsed || empty($parsed['scheme']) || empty($parsed['host'])) {
                    return null;
                }

                $port = isset($parsed['port']) ? ':'.$parsed['port'] : '';

                return $parsed['scheme'].'://'.$parsed['host'].$port;
            })
            ->filter()
            ->values()
            ->all();
    }

    public function sanitizeRedirectTo(?string $value, array $allowedOrigins = []): string
    {
        $raw = trim((string) $value);
        if ($raw === '') {
            return self::DEFAULT_REDIRECT;
        }

        if (str_starts_with($raw, '/') && ! str_starts_with($raw, '//')) {
            return $this->sanitizeRedirectPath($raw);
        }

        $parsed = parse_url($raw);
        if ($parsed && ! empty($parsed['scheme']) && ! empty($parsed['host'])) {
            $port = isset($parsed['port']) ? ':'.$parsed['port'] : '';
            $origin = $parsed['scheme'].'://'.$parsed['host'].$port;

            if (in_array($origin, $allowedOrigins, true)) {
                $path = ($parsed['path'] ?? '/').(isset($parsed['query']) ? '?'.$parsed['query'] : '').(isset($parsed['fragment']) ? '#'.$parsed['fragment'] : '');

                return $path !== '' ? $path : self::DEFAULT_REDIRECT;
            }
        }

        return self::DEFAULT_REDIRECT;
    }

    public function sanitizeReturnTo(?string $value, array $allowedOrigins = [], ?string $nexusOrigin = null): ?string
    {
        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }

        $returnToOrigins = $allowedOrigins;
        $nexusOriginNormalized = $this->normalizeOrigin($nexusOrigin);
        if ($nexusOriginNormalized !== null && ! in_array($nexusOriginNormalized, $returnToOrigins, true)) {
            $returnToOrigins[] = $nexusOriginNormalized;
        }

        if (str_starts_with($raw, '/') && ! str_starts_with($raw, '//')) {
            $path = $this->sanitizeRedirectPath($raw);

            // Relative return_to targets Nexus Brain, not this app.
            return $nexusOriginNormalized !== null ? $path : null;
        }

        $parsed = parse_url($raw);
        if ($parsed && ! empty($parsed['scheme']) && ! empty($parsed['host'])) {
            $port = isset($parsed['port']) ? ':'.$parsed['port'] : '';
            $origin = $parsed['scheme'].'://'.$parsed['host'].$port;

            if (in_array($origin, $returnToOrigins, true)) {
                return $raw;
            }
        }

        return null;
    }

    private function normalizeOrigin(?string $url): ?string
    {
        $raw = trim((string) $url);
        if ($raw === '') {
            return null;
        }

        $parsed = parse_url($raw);
        if (! $parsed || empty($parsed['scheme']) || empty($parsed['host'])) {
            return null;
        }

        $port = isset($parsed['port']) ? ':'.$parsed['port'] : '';

        return $parsed['scheme'].'://'.$parsed['host'].$port;
    }

    private function sanitizeRedirectPath(string $path): string
    {
        $raw = trim($path);
        if ($raw === '' || ! str_starts_with($raw, '/') || str_starts_with($raw, '//')) {
            return self::DEFAULT_REDIRECT;
        }

        $lower = strtolower($raw);
        if (str_starts_with($lower, '/\\') || str_contains($lower, 'javascript:') || str_contains($lower, 'data:')) {
            return self::DEFAULT_REDIRECT;
        }

        return $raw;
    }
}
