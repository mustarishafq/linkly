<?php

namespace App\Services;

class DomainVerificationService
{
    public function normalizeHostname(?string $value): string
    {
        $raw = strtolower(trim((string) $value));
        if ($raw === '') {
            return '';
        }

        $withScheme = preg_match('/^https?:\/\//i', $raw) ? $raw : "https://{$raw}";

        $host = parse_url($withScheme, PHP_URL_HOST);

        return $host ? strtolower($host) : rtrim($raw, '/');
    }

    public function verifyTxt(string $hostname, string $verificationValue): array
    {
        $prefix = config('linkly.domain_verify_prefix', '_linkly');
        $targets = ["{$prefix}.{$hostname}", $hostname];
        $lastError = null;

        foreach ($targets as $target) {
            try {
                $records = dns_get_record($target, DNS_TXT);
                $flattened = collect($records ?: [])
                    ->flatMap(fn ($entry) => $entry['txt'] ?? [])
                    ->map(fn ($txt) => is_array($txt) ? implode('', $txt) : (string) $txt)
                    ->filter()
                    ->values()
                    ->all();

                $matched = collect($flattened)->contains(fn ($txt) => trim($txt) === $verificationValue);

                if ($matched) {
                    return [
                        'verified' => true,
                        'checked_host' => $target,
                        'records' => $flattened,
                    ];
                }
            } catch (\Throwable $error) {
                $lastError = $error;
            }
        }

        return [
            'verified' => false,
            'checked_host' => "{$prefix}.{$hostname}",
            'error' => $lastError?->getMessage() ?? 'TXT record not found',
        ];
    }
}
