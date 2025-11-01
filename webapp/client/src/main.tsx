import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { useAuth } from './stores/authStore'

function Boot() {
  const { hydrate } = useAuth();

  useEffect(() => {
    // พยายามโหลด user จาก token ที่เก็บไว้ (ถ้ามี)
    hydrate();
  }, [hydrate]);

  return <App />;
}

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Boot />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; color: red;">
        <h2>Failed to load application</h2>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <button onclick="location.reload()" style="background: #dc2626; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">Reload</button>
      </div>
    `;
  }
}
