<?php

use App\Models\Store;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TRIAL_DAYS = 5;

    public function up(): void
    {
        if (! Schema::hasTable('stores')) {
            return;
        }

        if (! Schema::hasColumn('stores', 'trial_ends_at')) {
            Schema::table('stores', function (Blueprint $table) {
                $table->timestamp('trial_ends_at')->nullable()->after('updated_at');
            });
        }

        Store::query()
            ->whereNull('trial_ends_at')
            ->orderBy('id')
            ->chunkById(100, function ($stores) {
                foreach ($stores as $store) {
                    $created = $store->created_at ?? now();
                    $store->forceFill([
                        'trial_ends_at' => $created->copy()->addDays(self::TRIAL_DAYS),
                    ])->saveQuietly();
                }
            });
    }

    public function down(): void
    {
        if (Schema::hasTable('stores') && Schema::hasColumn('stores', 'trial_ends_at')) {
            Schema::table('stores', function (Blueprint $table) {
                $table->dropColumn('trial_ends_at');
            });
        }
    }
};
