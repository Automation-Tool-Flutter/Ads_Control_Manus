'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdAccounts } from '@/hooks/useAdAccounts';
import { LoadingState } from '@/components/ui/LoadingState';
import type { AdAccount } from '@/lib/types';
import { AdsIcon } from './AdsIcon';

export function MenuAccountPicker({ label, onSelect, onCancel }: {
  label: string; onSelect: (account: AdAccount) => void; onCancel: () => void;
}) {
  const { state: auth } = useAuth();
  const { state, retry } = useAdAccounts(auth.token);
  const [search, setSearch] = useState('');
  const accounts = state.status === 'success' ? state.data.filter(account => `${account.name} ${account.id} ${account.currency}`.toLowerCase().includes(search.trim().toLowerCase())) : [];
  return <>
    <div className="mobile-tools-heading"><h2>Choose account</h2><button type="button" className="mobile-tools-close" onClick={onCancel} aria-label="Return to menu" autoFocus><AdsIcon name="close" /></button></div>
    <div className="mobile-menu-search-area"><p className="mobile-tools-hint">Continue to {label}</p><div className="mobile-tools-search"><AdsIcon name="search" /><input type="search" aria-label="Search ad accounts" placeholder="Search name or ID…" value={search} onChange={event => setSearch(event.target.value)} /></div></div>
    <div className="mobile-tools-scroll">
      {!auth.token ? <p role="alert">Sign in to choose an ad account.</p> : state.status === 'idle' || state.status === 'loading' ? <LoadingState placement="panel" message="Loading accounts…" /> : state.status === 'error' ? <div role="alert" className="mobile-tools-empty"><p>{state.error}</p><button type="button" onClick={retry}>Try again</button></div> : <>
        <div className="mobile-menu-list">{accounts.map(account => <button type="button" key={account.id} className="mobile-menu-row" onClick={() => onSelect(account)}><span className="mobile-tool-icon"><AdsIcon name="campaign" /></span><span className="mobile-menu-label"><strong>{account.name}</strong><small>{account.id} · {account.currency}</small></span><span aria-hidden="true">›</span></button>)}</div>
        {!accounts.length && <div className="mobile-tools-empty"><p>{state.data.length ? 'No matching accounts.' : 'No ad accounts are available for this connection.'}</p>{search && <button type="button" onClick={() => setSearch('')}>Clear search</button>}</div>}
      </>}
    </div>
    <div className="mobile-menu-edit-actions"><button type="button" onClick={onCancel}>Cancel</button></div>
  </>;
}
