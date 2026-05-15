interface Props {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-2xl bg-accent/10" />
        <div className="absolute inset-2 border-2 border-accent/25 border-t-accent rounded-xl animate-spin" />
      </div>
      <p className="text-text-secondary text-sm font-medium">{message}</p>
    </div>
  );
}
