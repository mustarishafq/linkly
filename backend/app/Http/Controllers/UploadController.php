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

    public function audio(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:30720', 'mimes:mp3,mpga,mpeg,m4a,aac,ogg,wav,webm,mp4,mov'],
        ], [
            'file.mimes' => 'Upload an MP3, M4A, AAC, OGG, WAV, WEBM, MP4, or MOV file.',
            'file.max' => 'Audio file must be 30 MB or smaller.',
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension() ?: 'mp3');
        $filename = Str::uuid()->toString().'.'.$extension;
        $path = $file->storeAs('audio', $filename, 'public');

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
