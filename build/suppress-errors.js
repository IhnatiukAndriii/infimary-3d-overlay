// Цей скрипт завантажується ПЕРЕД React для придушення помилок розширень

(function() {
  'use strict';

  // 1. Перехоплюємо console.error
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
      return; // Не показуємо
    }
    originalError.apply(console, args);
  };

  // 2. Перехоплюємо console.warn
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

  // 3. Глобальні error handlers
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
