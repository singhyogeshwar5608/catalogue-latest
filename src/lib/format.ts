export const formatStoreName = (value: string | undefined | null) => {
  if (!value || typeof value !== 'string') return 'Unknown Store';
  
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return value;

  return normalized
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part) => {
          if (!part) return part;
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('-')
    )
    .join(' ');
};
