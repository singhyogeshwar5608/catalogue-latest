<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StorePurchaseInquiry extends Model
{
    protected $fillable = [
        'store_id',
        'product_id',
        'quantity',
        'amount_paise',
        'currency',
        'purchase_option',
        'razorpay_order_id',
        'razorpay_payment_id',
        'status',
        'buyer',
        'paid_at',
    ];

    protected $casts = [
        'buyer' => 'array',
        'paid_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
