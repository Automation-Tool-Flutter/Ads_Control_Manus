'use client';

import { useId, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import type { AdAccount } from '@/lib/types';

export function ChatAccountSheet({ accounts, selectedId, days, lockedId, onApply, onClose, open }: {
  accounts: AdAccount[];
  selectedId: string;
  days: number;
  lockedId?: string;
  open: boolean;
  onApply: (accountId: string, days: number) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [choice, setChoice] = useState(lockedId || selectedId);
  const [period, setPeriod] = useState(days);
  const titleId = useId();
  const filtered = accounts.filter(account => (!lockedId || account.id === lockedId) &&
    `${account.name} ${account.id} ${account.currency}`.toLowerCase().includes(search.trim().toLowerCase()));
  const valid = accounts.some(account => account.id === choice && (!lockedId || account.id === lockedId));

  return <Modal open={open} label="Chat account and period" onClose={onClose}>
    <div className="meta-ai-account-sheet">
      <header className="meta-ai-sheet-heading">
        <div><h2 id={titleId}>{lockedId ? 'Chat settings' : 'Choose ad account'}</h2><p>{lockedId ? 'Following the account on this page.' : 'Choose the data you want to talk about.'}</p></div>
        <button type="button" onClick={onClose} className="meta-ai-icon-button" aria-label="Close account picker">×</button>
      </header>
      <fieldset className="meta-ai-sheet-period"><legend>Analysis period</legend><div>
        {[7, 14, 30].map(value => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}>{value} days</button>)}
      </div></fieldset>
      {!lockedId && <label className="meta-ai-account-search"><span className="sr-only">Search ad accounts</span>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg>
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or ID" />
      </label>}
      <div className="meta-ai-account-list" role="group" aria-labelledby={titleId}>
        {filtered.map(account => <button key={account.id} type="button" aria-pressed={choice === account.id} onClick={() => setChoice(account.id)} className="meta-ai-account-row">
          <span className="meta-ai-account-avatar" aria-hidden="true">{account.name?.trim().charAt(0).toUpperCase() || 'A'}</span>
          <span className="meta-ai-account-copy"><strong>{account.name || account.id}</strong><small>{account.currency} · {account.id.replace(/^act_/, '')}</small></span>
          <span className="meta-ai-account-check" aria-hidden="true">{choice === account.id ? '✓' : ''}</span>
        </button>)}
        {!filtered.length && <div className="meta-ai-account-empty"><p>{search ? 'No matching accounts.' : 'No accounts available.'}</p>{search && <button type="button" onClick={() => setSearch('')}>Clear search</button>}</div>}
      </div>
      <footer className="meta-ai-sheet-footer"><button type="button" className="meta-ai-start-button" disabled={!valid} onClick={() => { if (valid) onApply(choice, period); }}>{selectedId ? 'Use these settings' : 'Start chatting'}<span aria-hidden="true">→</span></button></footer>
    </div>
  </Modal>;
}
