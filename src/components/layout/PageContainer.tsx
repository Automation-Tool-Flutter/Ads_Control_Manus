interface Props {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: Props) {
  return (
    <main className={`max-w-[1400px] mx-auto w-full px-3 sm:px-6 lg:px-10 py-4 sm:py-10 ${className}`}>
      {children}
    </main>
  );
}
