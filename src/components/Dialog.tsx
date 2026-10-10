import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx } from './ui';

/**
 * Accessible modal built on the native <dialog>: focus trap, Esc to close, backdrop click to close.
 * On phones it slides up as a bottom sheet; from 640px up it is a centred card.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  size = 'sm',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const width = { sm: 'sm:w-[28rem]', md: 'sm:w-[36rem]', lg: 'sm:w-[52rem]' }[size];

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cx(
        'rise-in m-auto max-h-[92dvh] w-full max-w-none overflow-hidden border border-line-strong bg-surface p-0 text-fg shadow-card backdrop:bg-black/55 backdrop:backdrop-blur-sm',
        'max-sm:mb-0 max-sm:rounded-b-none max-sm:rounded-t-[1.75rem] sm:max-w-[92vw] sm:rounded-[1.75rem]',
        width,
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="space-y-4 overflow-y-auto p-5 pb-3 sm:p-6 sm:pb-3">
            <h2 id={titleId} className="font-display text-lg font-semibold tracking-[-0.015em]">
              {title}
            </h2>
            {children}
          </div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
