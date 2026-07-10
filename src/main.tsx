import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

// Register service worker only in production to avoid duplicate reloads during development
if (import.meta.env.PROD) {
  registerSW({
    immediate: false,
    onNeedRefresh() {
      // We could show a prompt here, but autoUpdate handles most cases
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
