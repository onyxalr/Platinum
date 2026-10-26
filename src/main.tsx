import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import '@fontsource-variable/golos-text';
import '@fontsource-variable/onest';
import '@fontsource-variable/rubik';
import '@fontsource-variable/montserrat';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/cormorant-garamond';
import '@fontsource-variable/lora';
import '@fontsource-variable/unbounded';
import './styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

createRoot(container).render(<App />);

const dismissBoot = () => {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.classList.add('boot-hide');
  window.setTimeout(() => boot.remove(), 320);
};

requestAnimationFrame(() => requestAnimationFrame(dismissBoot));
