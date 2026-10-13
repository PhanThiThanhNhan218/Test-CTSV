import type { ReactNode, SelectHTMLAttributes } from 'react';
import { Icon } from './Icon';

/** Select gọn, không viền khi nghỉ — dùng cho các trường thuộc tính trong drawer/toolbar. */
export function InlineSelect({
  children,
  className = '',
  bordered = false,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode; bordered?: boolean }) {
  return (
    <span className={`tm-relative tm-inline-flex tm-items-center ${className}`}>
      <select
        {...rest}
        className={`tm-h-7 tm-w-full tm-cursor-pointer tm-appearance-none tm-rounded tm-pl-2 tm-pr-6 tm-text-sm disabled:tm-cursor-default ${
          bordered ? 'tm-border tm-border-line tm-bg-surface' : 'hover:tm-bg-muted disabled:hover:tm-bg-transparent'
        }`}
      >
        {children}
      </select>
      {!rest.disabled && <Icon name="chevron" size={12} className="tm-pointer-events-none tm-absolute tm-right-1.5 tm-text-fg-3" />}
    </span>
  );
}
