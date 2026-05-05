<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            if (! Schema::hasColumn('stores', 'seen_count')) {
                $table->unsignedInteger('seen_count')->default(0);
            }
        });

        if (! Schema::hasTable('store_seen_hits')) {
            Schema::create('store_seen_hits', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
                $table->string('actor_key', 191);
                $table->unsignedTinyInteger('hit_count')->default(0);
                $table->timestamps();
                $table->unique(['store_id', 'actor_key']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('store_seen_hits');

        Schema::table('stores', function (Blueprint $table) {
            if (Schema::hasColumn('stores', 'seen_count')) {
                $table->dropColumn('seen_count');
            }
        });
    }
};
