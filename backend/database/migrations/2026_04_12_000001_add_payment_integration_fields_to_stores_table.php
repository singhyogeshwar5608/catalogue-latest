<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            if (! Schema::hasColumn('stores', 'payment_qr_path')) {
                $table->string('payment_qr_path', 512)->nullable();
            }
            if (! Schema::hasColumn('stores', 'razorpay_key_id')) {
                $table->string('razorpay_key_id', 255)->nullable();
            }
            if (! Schema::hasColumn('stores', 'razorpay_key_secret')) {
                $table->text('razorpay_key_secret')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            foreach (['payment_qr_path', 'razorpay_key_id', 'razorpay_key_secret'] as $col) {
                if (Schema::hasColumn('stores', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
