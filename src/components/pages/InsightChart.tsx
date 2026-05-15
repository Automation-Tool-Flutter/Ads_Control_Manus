'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { PageInsightMetric } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

export interface LineConfig {
  metricName: string;
  label: string;
  color: string;
  type?: 'line' | 'area';
  stacked?: boolean;
}

interface Props {
  title: string;
  metrics: PageInsightMetric[];
  lines: LineConfig[];
  valueFormatter?: (v: number) => string;
  loading?: boolean;
}

function formatAxisDate(endTime: string): string {
  const d = new Date(endTime);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function InsightChart({ title, metrics, lines, valueFormatter, loading }: Props) {
  const data = useMemo(() => {
    // Collect all unique dates across all requested metrics
    const dateSet = new Set<string>();
    for (const line of lines) {
      const metric = metrics.find(m => m.name === line.metricName);
      if (metric) metric.values.forEach(v => dateSet.add(v.end_time));
    }
    const dates = Array.from(dateSet).sort();

    return dates.map(date => {
      const row: Record<string, string | number> = { date };
      for (const line of lines) {
        const metric = metrics.find(m => m.name === line.metricName);
        const point = metric?.values.find(v => v.end_time === date);
        row[line.metricName] = typeof point?.value === 'number' ? point.value : 0;
      }
      return row;
    });
  }, [metrics, lines]);

  const hasData = useMemo(
    () => data.some(row => lines.some(l => (row[l.metricName] as number) > 0)),
    [data, lines],
  );

  const useArea = lines.some(l => l.type === 'area');

  const tickFormatter = valueFormatter
    ? (v: number) => valueFormatter(v)
    : (v: number) => formatNumber(v);

  if (loading) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl p-4 mb-4">
        <div className="h-4 bg-white/5 rounded w-40 mb-4 animate-pulse" />
        <div className="h-[220px] bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">{title}</p>
        <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">
          No data for this period
        </div>
      </div>
    );
  }

  const ChartComponent = useArea ? AreaChart : LineChart;

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-4 mb-4">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <ChartComponent data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted, #888)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={tickFormatter}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted, #888)' }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-bg-card, #1a1a1a)',
              border: '1px solid var(--color-border, #333)',
              borderRadius: '12px',
              fontSize: 12,
            }}
            labelFormatter={(label) => formatAxisDate(String(label))}
            formatter={(value, name) => {
              const cfg = lines.find(l => l.metricName === String(name));
              const num = typeof value === 'number' ? value : Number(value);
              const formatted = valueFormatter ? valueFormatter(num) : formatNumber(num);
              return [formatted, cfg?.label ?? String(name)];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value: string) => {
              const cfg = lines.find(l => l.metricName === value);
              return cfg?.label ?? value;
            }}
          />
          {lines.map(line =>
            useArea ? (
              <Area
                key={line.metricName}
                type="monotone"
                dataKey={line.metricName}
                name={line.metricName}
                stroke={line.color}
                fill={line.color}
                fillOpacity={0.15}
                stackId={line.stacked ? 'stack' : undefined}
                dot={false}
                strokeWidth={2}
              />
            ) : (
              <Line
                key={line.metricName}
                type="monotone"
                dataKey={line.metricName}
                name={line.metricName}
                stroke={line.color}
                dot={false}
                strokeWidth={2}
                activeDot={{ r: 4 }}
              />
            ),
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
