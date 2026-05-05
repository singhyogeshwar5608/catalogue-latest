// Returns SVG string for pattern overlay
export function getBannerPattern(pattern: string, color: string = 'rgba(255,255,255,0.15)'): string {
  switch(pattern) {
    case 'waves':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 800 200" preserveAspectRatio="none">
        <path d="M0,100 C150,20 350,180 500,100 C650,20 750,80 800,60 L800,200 L0,200 Z" fill="${color}"/>
        <path d="M0,140 C200,60 400,160 600,80 C700,40 780,100 800,90 L800,200 L0,200 Z" fill="${color}" opacity="0.6"/>
        <path d="M0,60 C100,120 300,40 500,120 C650,180 750,60 800,100 L800,0 L0,0 Z" fill="${color}" opacity="0.4"/>
      </svg>`;
    
    case 'diagonal':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 800 200">
        <line x1="-100" y1="0" x2="300" y2="200" stroke="${color}" stroke-width="40"/>
        <line x1="100" y1="0" x2="500" y2="200" stroke="${color}" stroke-width="40"/>
        <line x1="300" y1="0" x2="700" y2="200" stroke="${color}" stroke-width="40"/>
        <line x1="500" y1="0" x2="900" y2="200" stroke="${color}" stroke-width="40"/>
        <line x1="700" y1="0" x2="1100" y2="200" stroke="${color}" stroke-width="40"/>
      </svg>`;
    
    case 'circles':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 800 200">
        <circle cx="100" cy="100" r="120" fill="none" stroke="${color}" stroke-width="30"/>
        <circle cx="400" cy="50" r="80" fill="none" stroke="${color}" stroke-width="25"/>
        <circle cx="650" cy="150" r="100" fill="none" stroke="${color}" stroke-width="20"/>
        <circle cx="780" cy="30" r="60" fill="none" stroke="${color}" stroke-width="15"/>
        <circle cx="0" cy="180" r="70" fill="none" stroke="${color}" stroke-width="20"/>
      </svg>`;
    
    default:
      return '';
  }
}

// Pick color combination based on store name (consistent)
export function pickStoreColor(
  storeName: string, 
  combinations: {color1: string, color2: string}[]
): {color1: string, color2: string} {
  if (!combinations || combinations.length === 0) {
    return { color1: '#2196F3', color2: '#0D47A1' };
  }
  let hash = 0;
  for (let i = 0; i < storeName.length; i++) {
    hash = storeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % combinations.length;
  return combinations[index];
}
