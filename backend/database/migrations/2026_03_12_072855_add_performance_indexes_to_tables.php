<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->addIndex('stores', ['category_id'], 'idx_stores_category');
        $this->addIndex('stores', ['status'], 'idx_stores_status');
        $this->addIndex('stores', ['slug'], 'idx_stores_slug');
        $this->addIndex('stores', ['status', 'category_id'], 'idx_stores_status_category');

        $this->addIndex('products', ['store_id'], 'idx_products_store');
        $this->addIndex('products', ['status'], 'idx_products_status');
        $this->addIndex('products', ['store_id', 'status'], 'idx_products_store_status');

        $this->addIndex('services', ['store_id'], 'idx_services_store');

        $this->addIndex('reviews', ['store_id'], 'idx_reviews_store');
        $this->addIndex('reviews', ['product_id'], 'idx_reviews_product');

        $this->addIndex('store_subscriptions', ['store_id'], 'idx_subscriptions_store');
        $this->addIndex('store_subscriptions', ['status'], 'idx_subscriptions_status');

        $this->addIndex('store_boosts', ['store_id'], 'idx_boosts_store');
        $this->addIndex('store_boosts', ['status'], 'idx_boosts_status');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->dropIndex('stores', 'idx_stores_category');
        $this->dropIndex('stores', 'idx_stores_status');
        $this->dropIndex('stores', 'idx_stores_slug');
        $this->dropIndex('stores', 'idx_stores_status_category');

        $this->dropIndex('products', 'idx_products_store');
        $this->dropIndex('products', 'idx_products_status');
        $this->dropIndex('products', 'idx_products_store_status');

        $this->dropIndex('services', 'idx_services_store');

        $this->dropIndex('reviews', 'idx_reviews_store');
        $this->dropIndex('reviews', 'idx_reviews_product');

        $this->dropIndex('store_subscriptions', 'idx_subscriptions_store');
        $this->dropIndex('store_subscriptions', 'idx_subscriptions_status');

        $this->dropIndex('store_boosts', 'idx_boosts_store');
        $this->dropIndex('store_boosts', 'idx_boosts_status');
    }

    private function addIndex(string $table, array $columns, string $name): void
    {
        if (! $this->columnsExist($table, $columns) || $this->indexExists($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $table) use ($columns, $name) {
            $table->index($columns, $name);
        });
    }

    private function dropIndex(string $table, string $name): void
    {
        if (! $this->indexExists($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $table) use ($name) {
            $table->dropIndex($name);
        });
    }

    private function columnsExist(string $table, array $columns): bool
    {
        foreach ($columns as $column) {
            if (! Schema::hasColumn($table, $column)) {
                return false;
            }
        }

        return true;
    }

    private function indexExists(string $table, string $index): bool
    {
        $connection = Schema::getConnection();
        $driver = $connection->getDriverName();
        $tableName = $connection->getTablePrefix() . $table;

        if ($driver === 'sqlite') {
            $result = $connection->select("PRAGMA index_list('$tableName')");

            foreach ($result as $row) {
                if (($row->name ?? null) === $index) {
                    return true;
                }
            }

            return false;
        }

        $database = $connection->getDatabaseName();

        $result = DB::select(
            'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
            [$database, $tableName, $index]
        );

        return ! empty($result);
    }
};
