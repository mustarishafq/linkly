<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DomainController;
use App\Http\Controllers\EntityController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\ImageProxyController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SsoController;
use App\Http\Controllers\UploadController;
use App\Http\Middleware\AdminRequired;
use App\Http\Middleware\JwtAuth;
use App\Http\Middleware\OptionalJwtAuth;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);
Route::get('/image-proxy', ImageProxyController::class);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::get('/me', [AuthController::class, 'me'])->middleware(JwtAuth::class);
});

Route::post('/sso/nexus/verify', [SsoController::class, 'verifyNexus']);

Route::middleware(JwtAuth::class)->group(function () {
    Route::get('/users/directory', [AuthController::class, 'userDirectory']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::get('/notifications/poll', [NotificationController::class, 'poll']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::get('/settings/qr-default', [SettingsController::class, 'qrDefault']);
    Route::get('/settings/general-defaults', [SettingsController::class, 'generalDefaults']);
    Route::post('/uploads/logo', [UploadController::class, 'logo']);
});

Route::middleware([JwtAuth::class, AdminRequired::class])->group(function () {
    Route::get('/settings', [SettingsController::class, 'show']);
    Route::patch('/settings', [SettingsController::class, 'update']);

    Route::get('/admin/users', [AdminController::class, 'users']);
    Route::patch('/admin/users/{id}/approval', [AdminController::class, 'updateApproval']);
    Route::patch('/admin/users/{id}/role', [AdminController::class, 'updateRole']);
    Route::get('/admin/audit-logs', [AdminController::class, 'auditLogs']);
});

Route::post('/domains/{id}/verify', [DomainController::class, 'verify'])->middleware(JwtAuth::class);

Route::prefix('entities/{entity}')->group(function () {
    Route::post('/list', [EntityController::class, 'list']);
    Route::post('/filter', [EntityController::class, 'filter']);
    Route::get('/{id}', [EntityController::class, 'show']);

    Route::middleware(OptionalJwtAuth::class)->group(function () {
        Route::post('/', [EntityController::class, 'store']);
        Route::post('/bulk', [EntityController::class, 'bulkStore']);
        Route::patch('/{id}', [EntityController::class, 'update']);
        Route::delete('/{id}', [EntityController::class, 'destroy']);
    });
});
