import { useEffect, type ReactNode } from 'react';
import { Portal } from './Portal';
import { Icon } from './Icon';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose(): void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({ title, subtitle, onClose, children, footer, width = 440 }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), onClose());
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <Portal>
      <div className="tm-fixed tm-inset-0 tm-z-modal tm-flex tm-items-start tm-justify-center tm-pt-[12vh]">
        <div className="tm-anim-fade tm-absolute tm-inset-0 tm-bg-fg/20" onClick={onClose} />
        <div
          role="dialog"
          aria-modal
          className="tm-anim-pop tm-relative tm-flex tm-max-h-[76vh] tm-flex-col tm-rounded-lg tm-border tm-border-line tm-bg-surface tm-shadow-xl"
          style={{ width }}
        >
          <div className="tm-flex tm-items-start tm-gap-2 tm-border-b tm-border-line tm-px-4 tm-py-3">
            <div className="tm-min-w-0 tm-flex-1">
              <div className="tm-text-base tm-font-semibold">{title}</div>
              {subtitle && <div className="tm-mt-0.5 tm-truncate tm-text-xs tm-text-fg-3">{subtitle}</div>}
            </div>
            <button onClick={onClose} className="tm-rounded tm-p-1 tm-text-fg-3 hover:tm-bg-muted hover:tm-text-fg" aria-label="Đóng">
              <Icon name="x" />
            </button>
          </div>
          <div className="tm-scroll tm-min-h-0 tm-flex-1 tm-overflow-y-auto">{children}</div>
          {footer && (
            <div className="tm-flex tm-items-center tm-justify-end tm-gap-2 tm-border-t tm-border-line tm-bg-subtle tm-px-4 tm-py-2.5 tm-rounded-b-lg">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
