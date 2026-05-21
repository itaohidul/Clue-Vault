import './polyfills';
import {StrictMode, Component, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');
console.log("App startup: checking for root element", rootElement);

if (!rootElement) {
  console.error("CRITICAL: Root element #root not found! Check index.html");
  document.body.innerHTML = '<div style="color:red;padding:20px">Error: Root element not found.</div>';
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    console.log("App startup: successfully initiated render");
  } catch (err) {
    console.error("App startup: React render failed", err);
    rootElement.innerHTML = `<div style="color:red;padding:20px">React Render Failed: ${String(err)}</div>`;
  }
}
