<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('banner_templates', function (Blueprint $table) {
            // Change bg_image from string to longText to support base64 encoded images
            $table->longText('bg_image')->nullable()->change();
            
            // Ensure frames is longText (for large JSON arrays)
            $table->longText('frames')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('banner_templates', function (Blueprint $table) {
            // Revert back to string
            $table->string('bg_image')->nullable()->change();
            $table->json('frames')->nullable()->change();
        });
    }
};
