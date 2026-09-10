export function AdsIcon({ name = 'grid', className = 'h-5 w-5' }: { name?: string; className?: string }) {
  const paths: Record<string, string> = {
    close: 'M6 6l12 12M18 6 6 18',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    ai: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',
    chart: 'M4 4v16h17M8 15l4-5 4 2 5-7',
    campaign: 'm3 10 15-6v16L3 14v-4ZM6 15l2 6h3l-2-5M21 9v6',
    budget: 'M3 6h18v14H3zM3 6V4h15M15 11h6v5h-6z',
    audience: 'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M18 3a4 4 0 0 1 0 8M22 21v-3a4 4 0 0 0-3-4',
    plan: 'M8 5h13M8 12h13M8 19h13M3 4v2M3 11v2M3 18v2',
    alert: 'm12 3 10 18H2L12 3ZM12 9v5M12 17v1',
    learning: 'm2 9 10-6 10 6-10 6L2 9ZM6 12v6l6 3 6-3v-6',
    content: 'M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6M15 8h2',
    page: 'M5 21V3M5 4c5-3 9 3 15 0v10c-6 3-10-3-15 0',
    settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
    search: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM15 15l6 6',
    menu: 'M4 6h16M4 12h16M4 18h16',
  };
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] ?? paths.grid} /></svg>;
}
