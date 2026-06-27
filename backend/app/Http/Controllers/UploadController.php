<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    public function logo(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:2048', 'mimes:jpeg,jpg,png,webp,gif,svg'],
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension() ?: 'png');
        $filename = Str::uuid()->toString().'.'.$extension;
        $path = $file->storeAs('logos', $filename, 'public');

        $relativeUrl = Storage::disk('public')->url($path);
        $fileUrl = str_starts_with($relativeUrl, 'http')
            ? $relativeUrl
            : rtrim((string) config('app.url'), '/').$relativeUrl;

        return response()->json([
            'file_url' => $fileUrl,
            'path' => $path,
        ]);
    }
}
