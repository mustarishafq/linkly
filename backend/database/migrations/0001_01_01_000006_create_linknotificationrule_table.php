<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tableName = 'entity_linknotificationrule';

        if (Schema::hasTable($tableName)) {
            return;
        }

        Schema::create($tableName, function (Blueprint $table) {
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
        Schema::dropIfExists('entity_linknotificationrule');
    }
};
