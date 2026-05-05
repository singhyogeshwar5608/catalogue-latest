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
        Schema::table('products', function (Blueprint $table) {
            $table->string('unit_type')->nullable()->after('is_active');
            $table->string('unit_custom_label')->nullable()->after('unit_type');
            $table->decimal('unit_quantity', 8, 2)->nullable()->after('unit_custom_label');
            $table->boolean('wholesale_enabled')->default(false)->after('unit_quantity');
            $table->decimal('wholesale_price', 8, 2)->nullable()->after('wholesale_enabled');
            $table->integer('wholesale_min_qty')->nullable()->after('wholesale_price');
            $table->integer('min_order_quantity')->nullable()->after('wholesale_min_qty');
            $table->boolean('discount_enabled')->default(false)->after('min_order_quantity');
            $table->decimal('discount_price', 8, 2)->nullable()->after('discount_enabled');
            $table->boolean('discount_schedule_enabled')->default(false)->after('discount_price');
            $table->datetime('discount_starts_at')->nullable()->after('discount_schedule_enabled');
            $table->datetime('discount_ends_at')->nullable()->after('discount_starts_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'unit_type',
                'unit_custom_label',
                'unit_quantity',
                'wholesale_enabled',
                'wholesale_price',
                'wholesale_min_qty',
                'min_order_quantity',
                'discount_enabled',
                'discount_price',
                'discount_schedule_enabled',
                'discount_starts_at',
                'discount_ends_at',
            ]);
        });
    }
};
