<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('organization_qr_defaults')) {
            Schema::create('organization_qr_defaults', function (Blueprint $table) {
                $table->id();
                $table->string('name', 120);
                $table->char('fg_color', 7);
                $table->char('bg_color', 7);
                $table->char('eye_color', 7);
                $table->string('style', 16)->default('square');
                $table->unsignedSmallInteger('size')->default(300);
                $table->unsignedTinyInteger('logo_size')->default(20);
                $table->string('logo_url', 2048)->default('');
                $table->dateTime('updated_date', 3);
            });
        }

        if (! Schema::hasTable('qr_designs')) {
            Schema::create('qr_designs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('link_id');
                $table->string('name', 120);
                $table->char('fg_color', 7);
                $table->char('bg_color', 7);
                $table->char('eye_color', 7);
                $table->string('style', 16)->default('square');
                $table->unsignedSmallInteger('size')->default(300);
                $table->unsignedTinyInteger('logo_size')->default(20);
                $table->string('logo_url', 2048)->default('');
                $table->string('source', 16)->default('custom');
                $table->boolean('is_active')->default(false);
                $table->dateTime('created_date', 3);
                $table->dateTime('updated_date', 3);

                $table->index('link_id');
                $table->index(['link_id', 'is_active']);
            });
        }

        $this->migrateOrganizationDefault();
        $this->migrateLinkDesigns();
    }

    public function down(): void
    {
        Schema::dropIfExists('qr_designs');
        Schema::dropIfExists('organization_qr_defaults');
    }

    private function migrateOrganizationDefault(): void
    {
        if (DB::table('organization_qr_defaults')->exists()) {
            return;
        }

        $defaults = [
            'name' => 'Organization Default',
            'fg_color' => '#000000',
            'bg_color' => '#ffffff',
            'eye_color' => '#000000',
            'style' => 'square',
            'size' => 300,
            'logo_size' => 20,
            'logo_url' => '',
        ];

        $row = DB::table('settings')->where('key', 'qr_default')->first();
        if ($row) {
            $value = is_string($row->value) ? json_decode($row->value, true) : (array) $row->value;
            if (is_array($value)) {
                $defaults = array_merge($defaults, array_intersect_key($value, $defaults));
            }
        }

        DB::table('organization_qr_defaults')->insert([
            'id' => 1,
            ...$defaults,
            'updated_date' => now(),
        ]);
    }

    private function migrateLinkDesigns(): void
    {
        if (! Schema::hasTable('entity_qrdesign')) {
            return;
        }

        if (DB::table('qr_designs')->exists()) {
            return;
        }

        $rows = DB::table('entity_qrdesign')->orderBy('id')->get();

        foreach ($rows as $row) {
            $payload = is_string($row->payload) ? json_decode($row->payload, true) : (array) $row->payload;
            if (! is_array($payload) || empty($payload['link_id'])) {
                continue;
            }

            DB::table('qr_designs')->insert([
                'id' => $row->id,
                'link_id' => (int) $payload['link_id'],
                'name' => (string) ($payload['name'] ?? 'QR Design'),
                'fg_color' => $this->normalizeColor($payload['fg_color'] ?? null, '#000000'),
                'bg_color' => $this->normalizeColor($payload['bg_color'] ?? null, '#ffffff'),
                'eye_color' => $this->normalizeColor($payload['eye_color'] ?? null, '#000000'),
                'style' => in_array($payload['style'] ?? '', ['square', 'rounded', 'dots'], true)
                    ? $payload['style']
                    : 'square',
                'size' => in_array((int) ($payload['size'] ?? 300), [200, 300, 400, 600, 800], true)
                    ? (int) $payload['size']
                    : 300,
                'logo_size' => max(10, min(40, (int) ($payload['logo_size'] ?? 20))),
                'logo_url' => (string) ($payload['logo_url'] ?? ''),
                'source' => ($payload['source'] ?? 'custom') === 'global' ? 'global' : 'custom',
                'is_active' => (bool) ($payload['is_active'] ?? false),
                'created_date' => $row->created_date,
                'updated_date' => $row->updated_date,
            ]);
        }
    }

    private function normalizeColor(mixed $value, string $fallback): string
    {
        $color = strtolower(trim((string) $value));

        return preg_match('/^#[0-9a-f]{6}$/', $color) ? $color : $fallback;
    }
};
