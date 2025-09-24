import React from 'react';
import { Badge } from '@/components/ui/badge';

interface ReportFiltersProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({ selectedPeriod, onPeriodChange }) => {
  const periods = [
    { key: '30d', label: '30 dias' },
    { key: '3m', label: '3 meses' },
    { key: '6m', label: '6 meses' },
    { key: '1y', label: '1 ano' },
    { key: 'all', label: 'Todos os períodos' }
  ];

  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-sm font-corporate font-medium text-muted-foreground">Período:</span>
      {periods.map((period) => (
        <Badge
          key={period.key}
          variant={selectedPeriod === period.key ? "default" : "outline"}
          className="cursor-pointer transition-hover hover:scale-105 font-corporate"
          onClick={() => onPeriodChange(period.key)}
        >
          {period.label}
        </Badge>
      ))}
    </div>
  );
};

export default ReportFilters;