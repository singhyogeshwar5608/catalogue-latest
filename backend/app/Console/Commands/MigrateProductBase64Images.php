<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Support\ProductImageStorage;
use Illuminate\Console\Command;

/**
 * One-time (or occasional) migration: move data:image/* blobs from products.image / products.images into files.
 */
class MigrateProductBase64Images extends Command
{
    protected $signature = 'products:migrate-base64-images {--chunk=100 : Rows per batch}';

    protected $description = 'Write legacy base64 product images to storage/app/public/products and replace DB values with paths';

    public function handle(): int
    {
        $chunk = max(1, (int) $this->option('chunk'));
        $updated = 0;

        Product::query()->orderBy('id')->chunkById($chunk, function ($products) use (&$updated) {
            foreach ($products as $product) {
                /** @var \App\Models\Product $product */
                $dirty = false;

                $img = $product->getAttribute('image');
                if (is_string($img) && str_starts_with($img, 'data:image')) {
                    $path = ProductImageStorage::persistIncomingImage($img, null);
                    if ($path !== null) {
                        $product->setAttribute('image', $path);
                        $dirty = true;
                    }
                }

                $arr = $product->getAttribute('images');
                if (is_array($arr) && $arr !== []) {
                    $next = [];
                    foreach ($arr as $entry) {
                        if (is_string($entry) && str_starts_with($entry, 'data:image')) {
                            $p = ProductImageStorage::persistIncomingImage($entry, null);
                            if ($p !== null) {
                                $next[] = $p;
                            }
                        } elseif (is_string($entry) && $entry !== '') {
                            $next[] = $entry;
                        }
                    }
                    if ($next !== $arr) {
                        $product->setAttribute('images', $next);
                        $dirty = true;
                    }
                }

                if ($dirty) {
                    $product->saveQuietly();
                    $updated++;
                }
            }
        });

        $this->info("Updated {$updated} product row(s).");

        return self::SUCCESS;
    }
}
