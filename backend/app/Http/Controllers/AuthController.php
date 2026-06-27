<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\JwtService;
use App\Support\IdGenerator;
use App\Support\SqlDate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller
{
    public function __construct(
        private JwtService $jwt,
        private AuditLogService $audit,
    ) {}

    public function register(Request $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->input('email', '')));
        $fullName = trim((string) $request->input('full_name', ''));
        $password = (string) $request->input('password', '');

        if ($email === '' || $fullName === '' || strlen($password) < 6) {
            return $this->error('invalid_input', 'Name, email, and password (min 6 chars) are required', 400);
        }

        if (DB::table('users')->where('email', $email)->exists()) {
            return $this->error('email_exists', 'Email already registered', 409);
        }

        $now = SqlDate::now();

        $id = DB::table('users')->insertGetId([
            'email' => $email,
            'full_name' => $fullName,
            'password_hash' => Hash::make($password),
            'role' => 'user',
            'is_approved' => false,
            'created_date' => $now,
            'updated_date' => $now,
        ]);

        $this->audit->write([
            'action' => 'user_registered',
            'target_user_id' => $id,
            'details' => ['email' => $email, 'full_name' => $fullName],
        ]);

        return response()->json([
            'message' => 'Registration successful. Please wait for admin approval before login.',
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->input('email', '')));
        $password = (string) $request->input('password', '');

        if ($email === '' || $password === '') {
            return $this->error('invalid_input', 'Email and password are required', 400);
        }

        $user = DB::table('users')
            ->where('email', $email)
            ->first();

        if (! $user || ! password_verify($password, $user->password_hash)) {
            return $this->error('invalid_credentials', 'Invalid email or password', 401);
        }

        if (! $user->is_approved) {
            return $this->error('pending_approval', 'Account pending admin approval', 403);
        }

        $safeUser = $this->jwt->toSafeUser($user);
        $token = $this->jwt->issueToken($safeUser);

        $this->audit->write([
            'actor_user_id' => $user->id,
            'action' => 'user_login',
            'target_user_id' => $user->id,
            'details' => ['email' => $user->email, 'method' => 'password'],
        ]);

        return response()->json(['token' => $token, 'user' => $safeUser]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->input('email', '')));
        if ($email === '') {
            return $this->error('invalid_input', 'Email is required', 400);
        }

        $user = DB::table('users')->where('email', $email)->first();

        if ($user) {
            $resetToken = IdGenerator::make();
            $expires = now()->addHour();

            DB::table('users')->where('id', $user->id)->update([
                'reset_token' => $resetToken,
                'reset_token_expires' => SqlDate::now($expires),
            ]);

            $this->sendPasswordResetEmail($email, $resetToken);

            $this->audit->write([
                'action' => 'password_reset_requested',
                'target_user_id' => $user->id,
                'details' => ['email' => $email],
            ]);

            $payload = ['message' => 'If account exists, reset instructions were generated'];
            if (config('linkly.dev_show_reset_token')) {
                $payload['reset_token'] = $resetToken;
            }

            return response()->json($payload);
        }

        return response()->json(['message' => 'If account exists, reset instructions were generated']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $token = trim((string) $request->input('token', ''));
        $password = (string) $request->input('password', '');

        if ($token === '' || strlen($password) < 6) {
            return $this->error('invalid_input', 'Token and valid password are required', 400);
        }

        $user = DB::table('users')
            ->where('reset_token', $token)
            ->whereNotNull('reset_token_expires')
            ->where('reset_token_expires', '>', SqlDate::now())
            ->first();

        if (! $user) {
            return $this->error('invalid_token', 'Reset token is invalid or expired', 400);
        }

        DB::table('users')->where('id', $user->id)->update([
            'password_hash' => Hash::make($password),
            'reset_token' => null,
            'reset_token_expires' => null,
            'updated_date' => SqlDate::now(),
        ]);

        $this->audit->write([
            'action' => 'password_reset_completed',
            'target_user_id' => $user->id,
        ]);

        return response()->json(['message' => 'Password has been reset']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->attributes->get('auth_user');

        return response()->json($this->jwt->toSafeUser($user));
    }

    public function userDirectory(): JsonResponse
    {
        $users = DB::table('users')
            ->select('id', 'email', 'full_name', 'role')
            ->where('is_approved', true)
            ->orderBy('full_name')
            ->get()
            ->map(fn ($user) => [
                'id' => (int) $user->id,
                'email' => $user->email,
                'full_name' => $user->full_name,
                'role' => $user->role,
            ])
            ->all();

        return response()->json($users);
    }

    private function sendPasswordResetEmail(string $email, string $resetToken): void
    {
        $appBaseUrl = config('linkly.app_base_url');
        $appName = config('app.name');
        $brandPrimary = config('linkly.brand_primary');
        $resetUrl = "{$appBaseUrl}/forgot-password?token=".urlencode($resetToken);

        if (config('mail.default') === 'log' || ! config('mail.mailers.smtp.host')) {
            logger()->info("[reset-email] {$email} -> {$resetUrl}");

            return;
        }

        $html = view('emails.password-reset', [
            'appName' => $appName,
            'brandPrimary' => $brandPrimary,
            'resetUrl' => $resetUrl,
        ])->render();

        Mail::html($html, function ($message) use ($email, $appName, $resetUrl) {
            $message->to($email)
                ->subject("Reset your {$appName} password");
            $message->text("Use this link to reset your {$appName} password: {$resetUrl}");
        });
    }
}
