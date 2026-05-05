<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BannerTemplate extends Model
{
    use HasFactory;

    protected $table = 'banner_templates';

    protected $fillable = [
        'category_id',
        'name',
        'bg_image',
        'bg_color',
        'title',
        'subtitle',
        'device',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
