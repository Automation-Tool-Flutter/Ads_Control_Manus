interface Props {
  message?: string;
  placement?: 'screen' | 'panel';
}

export function LoadingState({ message = 'Loading…', placement = 'screen' }: Props) {
  return (
    <div role="status" aria-live="polite" aria-label={message} className={`loading-state loading-state-${placement}`}>
      <div className="loading-state-center">
        <span className="loading-state-spinner" aria-hidden="true" />
      </div>
    </div>
  );
}
