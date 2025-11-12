import { useEffect, useState, useCallback } from 'react';

/**
 * Custom hook to interact with Telegram Web App SDK
 * Provides easy access to Telegram functionality throughout the app
 */
export function useTelegram() {
  const [tg, setTg] = useState(null);
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if Telegram WebApp is available
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const telegram = window.Telegram.WebApp;

      // Initialize Telegram WebApp
      telegram.ready();
      telegram.expand(); // Expand to full height

      // Enable closing confirmation
      telegram.enableClosingConfirmation();

      // Set header color to match branding
      telegram.setHeaderColor('#667eea');

      setTg(telegram);
      setUser(telegram.initDataUnsafe?.user || null);
      setIsReady(true);

      // Set up back button
      telegram.BackButton.onClick(() => {
        window.history.back();
      });
    }
  }, []);

  const showMainButton = useCallback((text, onClick) => {
    if (!tg) return;

    tg.MainButton.setText(text);
    tg.MainButton.show();
    tg.MainButton.onClick(onClick);
  }, [tg]);

  const hideMainButton = useCallback(() => {
    if (!tg) return;
    tg.MainButton.hide();
  }, [tg]);

  const showBackButton = useCallback(() => {
    if (!tg) return;
    tg.BackButton.show();
  }, [tg]);

  const hideBackButton = useCallback(() => {
    if (!tg) return;
    tg.BackButton.hide();
  }, [tg]);

  const showAlert = useCallback((message) => {
    if (!tg) return;
    tg.showAlert(message);
  }, [tg]);

  const showConfirm = useCallback((message, callback) => {
    if (!tg) return;
    tg.showConfirm(message, callback);
  }, [tg]);

  const hapticFeedback = useCallback((type = 'medium') => {
    if (!tg) return;

    // type can be: 'impact', 'notification', 'selection'
    if (type === 'impact') {
      tg.HapticFeedback.impactOccurred('medium');
    } else if (type === 'notification') {
      tg.HapticFeedback.notificationOccurred('success');
    } else if (type === 'selection') {
      tg.HapticFeedback.selectionChanged();
    }
  }, [tg]);

  const close = useCallback(() => {
    if (!tg) return;
    tg.close();
  }, [tg]);

  const openLink = useCallback((url) => {
    if (!tg) return;
    tg.openLink(url);
  }, [tg]);

  const openTelegramLink = useCallback((url) => {
    if (!tg) return;
    tg.openTelegramLink(url);
  }, [tg]);

  const requestWriteAccess = useCallback((callback) => {
    if (!tg) return;
    tg.requestWriteAccess(callback);
  }, [tg]);

  const requestContact = useCallback((callback) => {
    if (!tg) return;
    tg.requestContact(callback);
  }, [tg]);

  return {
    tg,
    user,
    isReady,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    showAlert,
    showConfirm,
    hapticFeedback,
    close,
    openLink,
    openTelegramLink,
    requestWriteAccess,
    requestContact,
    // Theme colors from Telegram
    themeParams: tg?.themeParams || {},
    // Platform info
    platform: tg?.platform || 'unknown',
    version: tg?.version || '0.0',
  };
}
