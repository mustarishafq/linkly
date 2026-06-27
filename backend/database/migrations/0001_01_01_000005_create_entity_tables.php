<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (config('linkly.entities', []) as $entityName) {
            $tableName = 'entity_'.strtolower($entityName);

            if (Schema::hasTable($tableName)) {
                continue;
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
    }

    public function down(): void
    {
        foreach (config('linkly.entities', []) as $entityName) {
            Schema::dropIfExists('entity_'.strtolower($entityName));
        }
    }
};
