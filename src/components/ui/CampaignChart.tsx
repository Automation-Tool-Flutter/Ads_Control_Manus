'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { InsightsData, DatePreset, DateRange } from '@/lib/types';
import { formatNumber, formatSpend, presetToRange } from '@/lib/utils';

type Metric = 'impressions' | 'clicks' | 'spend';

const TABS: { key: Metric; label: string; color: string; gradientId: string }[] = [
  { key: 'impressions', label: 'Impressions', color: '#6366f1', gradientId: 'gradImpressions' },
  { key: 'clicks', label: 'Clicks', color: '#10b981', gradientId: 'gradClicks' },
  { key: 'spend', label: 'Spend', color: '#f59e0b', gradientId: 'gradSpend' },
];

function formatAxisDate(dateStr: string): string {
  if (!dateStr) return '';
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

interface Props {
  data: InsightsData[];
  currency: string;
  loading: boolean;
  dateFilter: DatePreset | DateRange;
}

export function CampaignChart({ data, currency, loading, dateFilter }: Props) {
  const [activeMetric, setActiveMetric] = useState<Metric>('impressions');

  if (loading) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl p-4">
        <div className="flex gap-2 mb-4">
          {TABS.map(t => (
            <div key={t.key} className="h-7 w-20 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-[220px] bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  const dataByDate = Object.fromEntries(
    data.map(d => [d.date_start ?? '', d])
  );

  // Build full date range from dateFilter, fill missing days with 0
  const range = typeof dateFilter === 'string' ? presetToRange(dateFilter) : dateFilter;
  const allDates: string[] = [];
  const cursor = new Date(range.since);
  const end = new Date(range.until);
  while (cursor <= end) {
    allDates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  const chartData = allDates.map(date => ({
    date,
    value: parseFloat(dataByDate[date]?.[activeMetric] ?? '0') || 0,
  }));

  const hasData = chartData.some(d => d.value > 0);

  const tickFormatter = activeMetric === 'spend'
    ? (v: number) => formatSpend(v, currency)
    : (v: number) => formatNumber(v);

  const tooltipFormatter = (value: unknown) => {
    const num = typeof value === 'number' ? value : Number(value);
    return [activeMetric === 'spend' ? formatSpend(num, currency) : formatNumber(num), TABS.find(t => t.key === activeMetric)?.label ?? activeMetric];
  };

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-4">
      <div className="flex gap-2 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveMetric(tab.key)}
            style={activeMetric === tab.key ? { backgroundColor: tab.color, color: '#fff' } : {}}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeMetric === tab.key
                ? ''
                : 'bg-white/5 text-text-secondary hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">
          No data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {TABS.map(tab => (
                <linearGradient key={tab.gradientId} id={tab.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tab.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={tab.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
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
              formatter={tooltipFormatter}
            />
            {(() => {
                const tab = TABS.find(t => t.key === activeMetric)!;
                return (
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={tab.color}
                    fill={`url(#${tab.gradientId})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                );
              })()}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
