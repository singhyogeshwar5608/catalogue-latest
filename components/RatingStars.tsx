'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

interface RatingStarsProps {
  rating?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export default function RatingStars({
  rating = 0,
  interactive = false,
  onChange,
  size = 'md',
  className = '',
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(rating);

  const sizeClasses = {
    '2xs': 'w-3 h-3',
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleClick = (value: number) => {
    if (interactive) {
      setSelectedRating(value);
      onChange?.(value);
    }
  };

  const raw = interactive ? hoverRating || selectedRating : Number(rating);
  const displayRating = Number.isFinite(raw) ? Math.min(5, Math.max(0, raw)) : 0;

  const gapClass = size === '2xs' || size === 'xs' ? 'gap-0.5' : 'gap-1';

  return (
    <div className={`flex shrink-0 items-center ${gapClass} ${className}`.trim()} aria-label={`Rating ${displayRating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`${sizeClasses[size]} shrink-0 ${
            value <= displayRating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200'
          } ${interactive ? 'cursor-pointer transition' : ''}`}
          onMouseEnter={() => interactive && setHoverRating(value)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          onClick={() => handleClick(value)}
        />
      ))}
    </div>
  );
}
