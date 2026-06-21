'use client';

interface MetricCardProps {
  title: string;
  value: number;
  unit?: string;
  gradient: 'purple' | 'teal' | 'gold';
}

const iconMap: Record<MetricCardProps['gradient'], string> = {
  purple: '📋',
  teal: '🔧',
  gold: '⏱',
};

export default function MetricCard({
  title,
  value,
  unit = '시간',
  gradient,
}: MetricCardProps) {
  return (
    <div className={`metric-card metric-card-${gradient}`}>
      <div className="metric-card-inner-wrap">
        <div className="metric-card-inner">
          <div className="metric-card-icon" aria-hidden="true">{iconMap[gradient]}</div>
          <div className="metric-card-content">
            <div className="metric-card-title">{title}</div>
            <div className="metric-card-value">
              {value.toFixed(1)}
              <span className="metric-card-unit">{unit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
