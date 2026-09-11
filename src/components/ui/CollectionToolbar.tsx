'use client';

import { useRef, useState, type ReactNode } from 'react';
import { AdsIcon } from '@/components/layout/AdsIcon';
import { Modal } from './Modal';

/** Search stays within reach; secondary filters use a phone-sized sheet. */
export function CollectionToolbar({ search, onSearch, label, placeholder = 'Search by name or ID…', count, filters, filterCount = 0, onReset }: {
  search: string; onSearch: (value: string) => void; label: string; placeholder?: string;
  count: string; filters?: ReactNode; filterCount?: number; onReset?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  return <section className="collection-toolbar" aria-label={label}>
    <div className="collection-search-row">
      <div className="collection-search">
        <AdsIcon name="search" />
        <input ref={input} type="search" aria-label={label} placeholder={placeholder} value={search}
          onChange={event => onSearch(event.target.value)} enterKeyHint="search" autoComplete="off"
          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
        {search && <button type="button" aria-label="Clear search" onClick={() => { onSearch(''); input.current?.focus(); }}><AdsIcon name="close" /></button>}
      </div>
      {filters && <button type="button" className="collection-filter-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <AdsIcon name="settings" /><span>Filters{filterCount > 0 ? ` (${filterCount})` : ''}</span>
      </button>}
    </div>
    {filters && <div className="collection-desktop-filters">{filters}</div>}
    <div className="collection-results"><p role="status">{count}</p>{onReset && (search || filterCount > 0) && <button type="button" onClick={onReset}>Reset</button>}</div>
    {filters && <Modal open={open} label="Filter results" onClose={() => setOpen(false)}>
      <div className="collection-filter-sheet">
        <div className="collection-sheet-heading"><h2>Filters</h2><button type="button" aria-label="Close filters" onClick={() => setOpen(false)}><AdsIcon name="close" /></button></div>
        <p className="collection-filter-note">Filters update the list immediately.</p>
        <div className="collection-filter-fields">{filters}</div>
        <div className="modal-actions collection-sheet-actions">
          {onReset && <button type="button" className="meta-action meta-action-secondary" onClick={onReset}>Reset all</button>}
          <button type="button" className="meta-action meta-action-primary" onClick={() => setOpen(false)}>Show results</button>
        </div>
      </div>
    </Modal>}
  </section>;
}
