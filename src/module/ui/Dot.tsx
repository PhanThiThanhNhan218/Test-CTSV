const TONES = { danger: 'tm-bg-danger', warn: 'tm-bg-warn', success: 'tm-bg-success', muted: 'tm-bg-fg-3' } as const;

export function Dot({ tone, className = '' }: { tone: keyof typeof TONES; className?: string }) {
  return <span className={`tm-inline-block tm-h-1.5 tm-w-1.5 tm-shrink-0 tm-rounded-full ${TONES[tone]} ${className}`} />;
}
