import { LucideIcon, ChevronRight } from 'lucide-react';

type CardColor = 'blue' | 'green' | 'purple' | 'orange' | 'amber' | 'cyan' | 'red' | 'indigo' | 'emerald';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: CardColor;
  isFirst?: boolean;
}

export default function DashboardCard({ title, value, icon: Icon, trend, color = 'blue', isFirst = false }: DashboardCardProps) {
  const colorClasses: Record<CardColor, string> = {
    blue: 'bg-gray-900 text-white',
    green: 'bg-gray-900 text-white',
    purple: 'bg-gray-900 text-white',
    orange: 'bg-gray-900 text-white',
    amber: 'bg-gray-900 text-white',
    cyan: 'bg-gray-900 text-white',
    red: 'bg-gray-900 text-white',
    indigo: 'bg-gray-900 text-white',
    emerald: 'bg-gray-900 text-white',
  };

  const bgClasses: Record<CardColor, string> = {
    blue: 'bg-white',
    green: 'bg-white',
    purple: 'bg-white',
    orange: 'bg-white',
    amber: 'bg-white',
    cyan: 'bg-white',
    red: 'bg-white',
    indigo: 'bg-white',
    emerald: 'bg-white',
  };

  return (
    <div className={`${isFirst ? colorClasses[color] : bgClasses[color]} rounded-xl p-4 flex items-center justify-between hover:shadow-lg transition cursor-pointer border ${isFirst ? 'border-gray-800' : 'border-gray-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`${isFirst ? 'opacity-50' : ''}`}>
          <Icon className={`w-4 h-4 ${isFirst ? 'text-white' : 'text-gray-400'}`} />
        </div>
        <div>
          <p className={`text-2xl font-bold mb-0.5 ${isFirst ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          <p className={`text-xs ${isFirst ? 'text-gray-300' : 'text-gray-500'}`}>{title}</p>
        </div>
      </div>
      <ChevronRight className={`w-5 h-5 ${isFirst ? 'text-white' : 'text-gray-400'}`} />
    </div>
  );
}
