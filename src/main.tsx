// --- Fil: src/main.tsx ---
// @# 2025-11-17 22:55 - Rettet til korrekt startpunkt med BrowserRouter
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { StateProvider } from './StateContext.tsx';
import { AppProviders } from './contexts/AppProviders';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <StateProvider>
          <App />
        </StateProvider>
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>,
);