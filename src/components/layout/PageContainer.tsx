interface Props {
  children: React.ReactNode;
  className?: string;
  ready?: boolean;
}

export function PageContainer({ children, className = "", ready }: Props) {
  return (
    <main data-view-ready={ready} className={`workspace-page w-full px-3 py-5 sm:px-6 sm:py-7 xl:px-8 ${className}`}>
      {children}
    </main>
  );
}
