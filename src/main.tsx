import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { AppShell } from './shell/AppShell';

// Bản demo một file (mở trực tiếp/không có server) dùng hash router
const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <AppShell />
    </Router>
  </React.StrictMode>,
);
