interface Props {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: Props) {
  return (
    <main className={`w-full px-3 py-3 sm:px-5 sm:py-5 xl:px-7 ${className}`}>
      {children}
    </main>
  );
}
