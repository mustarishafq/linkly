<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            return;
        }

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('full_name');
            $table->string('password_hash');
            $table->enum('role', ['admin', 'user'])->default('user');
            $table->boolean('is_approved')->default(false);
            $table->string('reset_token', 128)->nullable();
            $table->dateTime('reset_token_expires', 3)->nullable();
            $table->string('nexus_sso_id', 128)->nullable()->unique();
            $table->dateTime('created_date', 3);
            $table->dateTime('updated_date', 3);

            $table->index('email');
            $table->index('is_approved');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
