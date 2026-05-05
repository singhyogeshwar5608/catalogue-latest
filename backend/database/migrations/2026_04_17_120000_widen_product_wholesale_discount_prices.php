<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Wholesale / discount were decimal(8,2) (~999,999.99 max). Larger values caused SQL errors (500) on save.
     * Align with primary price scale (decimal 10,2) with a little headroom.
     */
    public function up(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE products MODIFY wholesale_price DECIMAL(12,2) NULL');
            DB::statement('ALTER TABLE products MODIFY discount_price DECIMAL(12,2) NULL');

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE products ALTER COLUMN wholesale_price TYPE DECIMAL(12,2)');
            DB::statement('ALTER TABLE products ALTER COLUMN discount_price TYPE DECIMAL(12,2)');

            return;
        }

        // SQLite and others: column affinity is permissive; no ALTER needed for typical dev DBs.
    }

    public function down(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE products MODIFY wholesale_price DECIMAL(8,2) NULL');
            DB::statement('ALTER TABLE products MODIFY discount_price DECIMAL(8,2) NULL');

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE products ALTER COLUMN wholesale_price TYPE DECIMAL(8,2)');
            DB::statement('ALTER TABLE products ALTER COLUMN discount_price TYPE DECIMAL(8,2)');
        }
    }
};
