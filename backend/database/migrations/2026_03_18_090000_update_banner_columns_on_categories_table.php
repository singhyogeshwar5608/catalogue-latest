<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->json('banner_images')->nullable()->change();
            $table->string('banner_title')->nullable()->change();
            $table->string('banner_subtitle')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->text('banner_images')->nullable()->change();
            $table->string('banner_title')->nullable(false)->default('')->change();
            $table->string('banner_subtitle')->nullable(false)->default('')->change();
        });
    }
};
