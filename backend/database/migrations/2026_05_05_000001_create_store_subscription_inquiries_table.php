<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_subscription_inquiries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('store_subscription_id')->nullable()->constrained('store_subscriptions')->nullOnDelete();
            $table->foreignId('subscription_plan_id')->constrained('subscription_plans')->cascadeOnDelete();
            $table->unsignedInteger('amount_paise')->default(0);
            $table->string('currency', 3)->default('INR');
            $table->string('razorpay_order_id', 64)->nullable()->index();
            $table->string('razorpay_payment_id', 64)->nullable()->index();
            $table->string('status', 24)->default('created'); // created | paid | activated
            $table->json('addons');
            $table->json('store_owner');
            $table->json('store_snapshot')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_subscription_inquiries');
    }
};

