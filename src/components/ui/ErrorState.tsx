interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-14 h-14 rounded-full bg-status-red/10 flex items-center justify-center">
        <svg className="w-7 h-7 text-status-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-text-primary font-medium mb-1">Something went wrong</p>
        <p className="text-text-secondary text-sm max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-lg text-sm font-medium transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
