<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('boost_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('days');
            $table->unsignedInteger('price');
            $table->unsignedTinyInteger('priority_weight')->default(1);
            $table->string('badge_label')->default('Boost Pro');
            $table->string('badge_color')->default('#fde68a');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('boost_plans');
    }
};
