interface Props {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: Props) {
  return (
    <main className={`workspace-page w-full px-3 py-5 sm:px-6 sm:py-7 xl:px-8 ${className}`}>
      {children}
    </main>
  );
}
