import { Zap } from 'lucide-react';

export default function BoostBadge() {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-semibold rounded-full shadow-md">
      <Zap className="w-3 h-3 fill-white" />
      <span>SPONSORED</span>
    </div>
  );
}
