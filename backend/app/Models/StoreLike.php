<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreLike extends Model
{
    protected $fillable = [
        'store_id',
        'actor_key',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
