<?php

use App\Models\Category;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            if (! Schema::hasColumn('categories', 'slug')) {
                $table->string('slug')->nullable()->unique()->after('name');
            }
        });

        Category::query()->chunkById(100, function ($categories) {
            foreach ($categories as $category) {
                if (! $category->slug) {
                    $baseSlug = Str::slug($category->name);
                    $slug = $baseSlug;
                    $counter = 1;

                    while (Category::where('slug', $slug)->where('id', '!=', $category->id)->exists()) {
                        $slug = $baseSlug . '-' . $counter;
                        $counter++;
                    }

                    $category->slug = $slug ?: Str::random(8);
                    $category->save();
                }
            }
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->string('slug')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            if (Schema::hasColumn('categories', 'slug')) {
                $table->dropColumn('slug');
            }
        });
    }
};
