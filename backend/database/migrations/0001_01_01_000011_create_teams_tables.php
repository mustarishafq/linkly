<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('teams')) {
            Schema::create('teams', function (Blueprint $table) {
                $table->id();
                $table->string('name', 80);
                $table->unsignedBigInteger('created_by_user_id');
                $table->dateTime('created_date', 3);
                $table->dateTime('updated_date', 3);

                $table->index('created_by_user_id');
                $table->foreign('created_by_user_id')->references('id')->on('users');
            });
        }

        if (! Schema::hasTable('team_members')) {
            Schema::create('team_members', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('team_id');
                $table->unsignedBigInteger('user_id');
                $table->string('role', 20);
                $table->dateTime('created_date', 3);

                $table->unique(['team_id', 'user_id']);
                $table->index('user_id');
                $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('team_members');
        Schema::dropIfExists('teams');
    }
};
