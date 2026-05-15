import type { ReactNode } from 'react';

export interface InfoItem {
  label: string;
  value: ReactNode;
  span?: 'full' | 'half';
}

interface Props {
  items: InfoItem[];
  title?: string;
}

export function DetailInfoGrid({ items, title }: Props) {
  return (
    <div>
      {title && (
        <h2 className="text-base font-semibold text-text-primary mb-3">{title}</h2>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <div
            key={i}
            className={item.span === 'full' ? 'col-span-2 sm:col-span-3' : ''}
          >
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1">{item.label}</p>
            <div className="text-text-primary text-sm font-medium">{item.value ?? '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
