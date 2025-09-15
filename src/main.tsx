// --- Fil: src/main.tsx ---
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// @# 2025-09-14 20:29 - Importer StateProvider for at wrappe App'en
import { StateProvider } from './StateContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* @# 2025-09-14 20:29 - Wrapper App med StateProvider for global state */}
    <StateProvider>
      <App />
    </StateProvider>
  </React.StrictMode>,
);