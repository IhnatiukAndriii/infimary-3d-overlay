

(function() {
  'use strict';

  
  const originalError = console.error;
  console.error = function(...args) {
    const message = args.map(a => String(a)).join(' ');
    if (
      message.includes('runtime.lastError') ||
      message.includes('Unchecked runtime') ||
      message.includes('message channel closed') ||
      message.includes('listener indicated') ||
      message.includes('Extension context') ||
      message.includes('message port closed')
    ) {
      return; 
    }
    originalError.apply(console, args);
  };

  
  const originalWarn = console.warn;
  console.warn = function(...args) {
    const message = args.map(a => String(a)).join(' ');
    if (
      message.includes('runtime') ||
      message.includes('extension') ||
      message.includes('message channel')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };

  
  window.addEventListener('error', function(e) {
    const msg = e.message || '';
    if (
      msg.includes('runtime.lastError') ||
      msg.includes('message channel') ||
      msg.includes('listener indicated') ||
      msg.includes('Extension')
    ) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  window.addEventListener('unhandledrejection', function(e) {
    const msg = String(e.reason?.message || e.reason || '');
    if (
      msg.includes('runtime.lastError') ||
      msg.includes('message channel') ||
      msg.includes('listener indicated') ||
      msg.includes('Extension')
    ) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  console.log('✓ Error suppression active');
})();
