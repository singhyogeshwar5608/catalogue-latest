<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private function isSqliteConnection(): bool
    {
        return DB::getDriverName() === 'sqlite';
    }

    public function up(): void
    {
        if ($this->isSqliteConnection()) {
            return;
        }

        DB::statement('ALTER TABLE stores MODIFY logo LONGTEXT NULL');
        DB::statement('ALTER TABLE stores MODIFY banner LONGTEXT NULL');
        DB::statement('ALTER TABLE stores MODIFY description LONGTEXT NULL');

        DB::statement('ALTER TABLE products MODIFY image LONGTEXT NULL');
        DB::statement('ALTER TABLE services MODIFY image LONGTEXT NULL');
    }

    public function down(): void
    {
        if ($this->isSqliteConnection()) {
            return;
        }

        DB::statement('ALTER TABLE stores MODIFY logo TEXT NULL');
        DB::statement('ALTER TABLE stores MODIFY banner TEXT NULL');
        DB::statement('ALTER TABLE stores MODIFY description TEXT NULL');

        DB::statement('ALTER TABLE products MODIFY image TEXT NULL');
        DB::statement('ALTER TABLE services MODIFY image TEXT NULL');
    }
};
