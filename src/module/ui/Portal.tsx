import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const ModuleConfig = createContext<{ zIndexBase: number }>({ zIndexBase: 1000 });

let host: HTMLDivElement | null = null;

/** Drawer & modal render ra container riêng của module (không bị z-index/overflow của app mẹ cắt). */
export function Portal({ children }: { children: ReactNode }) {
  const { zIndexBase } = useContext(ModuleConfig);
  if (!host) {
    host = document.createElement('div');
    host.className = 'ctsv-module';
    host.dataset.tmPortal = '';
    document.body.appendChild(host);
  }
  host.style.setProperty('--tm-z', String(zIndexBase));
  return createPortal(children, host);
}
