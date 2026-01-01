
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

console.log("System: index.tsx execution started");

const rootElement = document.getElementById('root');

if (!rootElement) {
  const msg = "Critical: Could not find root element to mount to";
  console.error(msg);
  alert(msg);
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("System: React render initiated");
  } catch (e: any) {
    console.error("Mounting error:", e);
    const errorDisplay = document.getElementById('error-display');
    if (errorDisplay) {
      errorDisplay.style.display = 'block';
      errorDisplay.innerHTML += `<p style="color:red"><b>React Mount Error:</b> ${e.message}</p>`;
    }
  }
}
