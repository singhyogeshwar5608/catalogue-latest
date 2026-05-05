<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreSeenHit extends Model
{
    protected $table = 'store_seen_hits';

    protected $fillable = [
        'store_id',
        'actor_key',
        'hit_count',
    ];

    protected function casts(): array
    {
        return [
            'hit_count' => 'integer',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
