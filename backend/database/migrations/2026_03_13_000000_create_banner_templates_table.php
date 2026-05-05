<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('banner_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('category_id')->constrained('categories')->onDelete('cascade');
            $table->enum('device', ['mobile', 'desktop']);
            
            // Background
            $table->string('bg_image')->nullable();
            $table->string('bg_color')->default('#1a1a2e');
            
            // Text content
            $table->string('title')->nullable();
            $table->string('subtitle')->nullable();
            
            // CTA Button
            $table->boolean('show_cta_button')->default(true);
            $table->string('cta_text')->default('Shop Now');
            $table->string('cta_bg_color')->default('#ffffff');
            $table->string('cta_text_color')->default('#111111');
            $table->integer('cta_border_radius')->default(20);
            
            // Frames (JSON array of frame objects)
            $table->json('frames')->nullable();
            
            // Status
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            // Indexes
            $table->index(['category_id', 'device', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banner_templates');
    }
};
