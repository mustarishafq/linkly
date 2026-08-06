<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('entity_linktree')) {
            return;
        }

        Schema::create('entity_linktree', function (Blueprint $table) {
            $table->id();
            $table->json('payload');
            $table->dateTime('created_date', 3);
            $table->dateTime('updated_date', 3);

            $table->index('created_date');
            $table->index('updated_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_linktree');
    }
};
