
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const mountNode = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Root element not found");
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Failed to render React application:", error);
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: sans-serif;">
        <h2 style="color: #e11d48;">Terjadi Kesalahan Render</h2>
        <p>Gagal memuat aplikasi. Periksa koneksi internet atau konsol browser untuk detail teknis.</p>
      </div>
    `;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountNode);
} else {
  mountNode();
}
