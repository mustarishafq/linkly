<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr>
        <td style="padding:20px 24px;background:{{ $brandPrimary }};color:#ffffff;font-size:20px;font-weight:700;">
            {{ $appName }}
        </td>
    </tr>
    <tr>
        <td style="padding:24px;">
            <h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">Reset your password</h2>
            <p style="margin:0 0 16px;line-height:1.5;color:#334155;">We received a request to reset your {{ $appName }} password. This link expires in 1 hour.</p>
            <p style="margin:24px 0;">
                <a href="{{ $resetUrl }}" style="display:inline-block;background:{{ $brandPrimary }};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Reset Password</a>
            </p>
            <p style="margin:0 0 8px;line-height:1.5;color:#475569;">If the button does not work, copy this URL:</p>
            <p style="margin:0;word-break:break-all;color:#0f766e;">{{ $resetUrl }}</p>
        </td>
    </tr>
</table>
</body>
</html>
