<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_notifications')) {
            return;
        }

        Schema::create('user_notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('type', 64);
            $table->string('title');
            $table->text('body');
            $table->unsignedBigInteger('link_id')->nullable();
            $table->unsignedBigInteger('rule_id')->nullable();
            $table->boolean('is_read')->default(false);
            $table->json('metadata')->nullable();
            $table->dateTime('created_date', 3);

            $table->index(['user_id', 'is_read']);
            $table->index(['user_id', 'created_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_notifications');
    }
};
