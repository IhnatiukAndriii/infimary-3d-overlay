import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';




const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) => {
  const message = args.join(' ').toLowerCase();
  if (
    message.includes('runtime.lasterror') ||
    message.includes('message channel closed') ||
    message.includes('listener indicated') ||
    message.includes('extension context') ||
    message.includes('message port closed')
  ) {
    return; 
  }
  originalError.apply(console, args);
};

console.warn = (...args: any[]) => {
  const message = args.join(' ').toLowerCase();
  if (
    message.includes('runtime.lasterror') ||
    message.includes('message channel') ||
    message.includes('extension')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};


window.addEventListener('error', (event) => {
  const message = (event.message || '').toLowerCase();
  if (
    message.includes('runtime.lasterror') ||
    message.includes('message channel') ||
    message.includes('listener indicated') ||
    message.includes('extension')
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  }
}, true);


window.addEventListener('unhandledrejection', (event) => {
  const message = String(event.reason?.message || event.reason || '').toLowerCase();
  if (
    message.includes('runtime.lasterror') ||
    message.includes('message channel') ||
    message.includes('listener indicated') ||
    message.includes('extension') ||
    message.includes('message port')
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  }
}, true);


const originalPlay = HTMLVideoElement.prototype.play;
HTMLVideoElement.prototype.play = function() {
  const playPromise = originalPlay.call(this);
  if (playPromise && playPromise.catch) {
    return playPromise.catch(() => Promise.resolve());
  }
  return playPromise;
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(<App />);

// Register service worker for offline support
serviceWorkerRegistration.register({
  onSuccess: () => console.log('PWA installed successfully!'),
  onUpdate: (registration) => {
    console.log('New version available! Refresh to update.');
    // Optionally auto-update
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }
});

reportWebVitals();
