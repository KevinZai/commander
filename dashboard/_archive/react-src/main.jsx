import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './styles/matrix-theme.css';
import './styles/charts.css';
import './styles/themes/claude.css';
import './styles/themes/oled.css';
import './styles/themes/matrix.css';
import { initTheme } from './styles/themes/theme-loader.js';

initTheme();

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
