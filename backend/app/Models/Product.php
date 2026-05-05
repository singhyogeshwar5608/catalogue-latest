<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    /**
     * Columns used in public listings and detail API — keeps queries off SELECT * and responses smaller.
     *
     * @var list<string>
     */
    public const LIST_COLUMNS = [
        'id',
        'store_id',
        'title',
        'price',
        'original_price',
        'category',
        'image',
        'images',
        'description',
        'rating',
        'total_reviews',
        'is_active',
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
        'created_at',
        'updated_at',
    ];

    protected $fillable = [
        'store_id',
        'title',
        'price',
        'original_price',
        'category',
        'image',
        'images',
        'description',
        'rating',
        'total_reviews',
        'is_active',
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
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'original_price' => 'decimal:2',
        'images' => 'array',
        'rating' => 'decimal:1',
        'total_reviews' => 'integer',
        'is_active' => 'boolean',
        'unit_quantity' => 'decimal:2',
        'wholesale_enabled' => 'boolean',
        'wholesale_price' => 'decimal:2',
        'wholesale_min_qty' => 'integer',
        'min_order_quantity' => 'integer',
        'discount_enabled' => 'boolean',
        'discount_price' => 'decimal:2',
        'discount_schedule_enabled' => 'boolean',
        'discount_starts_at' => 'datetime',
        'discount_ends_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
