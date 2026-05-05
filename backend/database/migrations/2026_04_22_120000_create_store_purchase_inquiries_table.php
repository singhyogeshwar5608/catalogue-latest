<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_purchase_inquiries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->unsignedInteger('amount_paise');
            $table->string('currency', 3)->default('INR');
            $table->string('purchase_option', 32);
            $table->string('razorpay_order_id', 64)->unique();
            $table->string('razorpay_payment_id', 64)->nullable();
            $table->string('status', 24)->default('pending'); // pending | paid
            $table->json('buyer');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_purchase_inquiries');
    }
};
