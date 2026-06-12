import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// GitHub Pages serves this app from a sub-path (see vite.config `base`).
// React Router needs the same basename so routes resolve correctly in prod.
const basename = import.meta.env.PROD ? '/SteigerDojoEsports' : '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
