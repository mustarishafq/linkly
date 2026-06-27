<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;

class ImageProxyController extends Controller
{
    public function __invoke(Request $request): Response|JsonResponse
    {
        $rawUrl = trim((string) $request->query('url', ''));
        if ($rawUrl === '') {
            return $this->error('invalid_input', 'url query parameter is required', 400);
        }

        $parsed = parse_url($rawUrl);
        $scheme = strtolower((string) ($parsed['scheme'] ?? ''));

        if (! in_array($scheme, ['http', 'https'], true)) {
            return $this->error('invalid_url', 'Only http/https URLs are allowed', 400);
        }

        try {
            $upstream = Http::timeout(15)->get($rawUrl);
        } catch (\Throwable) {
            return $this->error('invalid_url', 'Invalid image URL', 400);
        }

        if (! $upstream->successful()) {
            return $this->error('upstream_error', "Image fetch failed: {$upstream->status()}", 502);
        }

        return response($upstream->body(), 200, [
            'Content-Type' => $upstream->header('Content-Type') ?: 'application/octet-stream',
            'Cache-Control' => 'public, max-age=3600',
            'Access-Control-Allow-Origin' => '*',
        ]);
    }
}
