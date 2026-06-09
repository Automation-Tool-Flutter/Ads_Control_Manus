import type { OptimizeStep } from '@/lib/types/optimize';

const STEPS: { key: OptimizeStep; label: string }[] = [
  { key: 'collecting', label: 'Collecting Data' },
  { key: 'building', label: 'Building Context' },
  { key: 'analyzing', label: 'AI Analysis' },
];

const STEP_ORDER: OptimizeStep[] = ['collecting', 'building', 'analyzing'];

function getStepStatus(stepKey: OptimizeStep, currentStep: OptimizeStep): 'done' | 'active' | 'pending' {
  const stepIdx = STEP_ORDER.indexOf(stepKey);
  const currentIdx = STEP_ORDER.indexOf(currentStep);
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

interface Props {
  step: OptimizeStep;
}

export function StepProgress({ step }: Props) {
  if (step === 'idle' || step === 'done' || step === 'error') return null;

  return (
    <div className="rounded-lg border border-border bg-bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((s, i) => {
          const status = getStepStatus(s.key, step);
          return (
            <div key={s.key} className="flex-1 min-w-0 flex flex-col items-center gap-2">
              {/* Connector line (left side, not for first) */}
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      status === 'done' ? 'bg-accent' : 'bg-border'
                    }`}
                  />
                )}

                {/* Circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    status === 'done'
                      ? 'bg-accent text-white'
                    : status === 'active'
                      ? 'border-2 border-accent bg-accent/12 text-accent'
                      : 'border-2 border-border bg-bg-card text-text-muted'
                  }`}
                >
                  {status === 'done' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : status === 'active' ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : (
                    <span className="text-xs font-medium">{i + 1}</span>
                  )}
                </div>

                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      status === 'done' ? 'bg-accent' : 'bg-border'
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <p
                className={`text-xs text-center font-medium w-full transition-colors ${
                  status === 'active'
                    ? 'text-accent'
                    : status === 'done'
                    ? 'text-text-secondary'
                    : 'text-text-muted'
                }`}
              >
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
