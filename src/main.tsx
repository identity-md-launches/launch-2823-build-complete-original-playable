import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/silkscreen/400.css';
import App from './App';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
// Cache only the local static shell. Blockchain API responses are never cached here.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => { void navigator.serviceWorker.register(new URL('sw.js', document.baseURI), { scope: './' }).catch(() => { /* A gateway may disable service workers. API-offline practice still works in the open tab. */ }); });
}
