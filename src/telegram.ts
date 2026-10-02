import { useEffect, useRef } from 'react';

// Only the parts of https://core.telegram.org/bots/webapps that the app uses.
interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  BackButton: {
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
  HapticFeedback: {
    notificationOccurred(type: 'success' | 'error' | 'warning'): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

const webApp = window.Telegram?.WebApp;

/** False when the page is opened in a regular browser (e.g. during development). */
export const insideTelegram = Boolean(webApp?.initData);

export function initTelegram() {
  if (!insideTelegram) return;
  webApp!.ready();
  webApp!.expand();
}

export function haptic(type: 'success' | 'error') {
  if (insideTelegram) webApp!.HapticFeedback.notificationOccurred(type);
}

/** Shows Telegram's native back button while `onBack` is set. */
export function useTelegramBackButton(onBack: (() => void) | undefined) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const enabled = insideTelegram && Boolean(onBack);

  useEffect(() => {
    if (!enabled) return;
    const handler = () => onBackRef.current?.();
    webApp!.BackButton.onClick(handler);
    webApp!.BackButton.show();
    return () => {
      webApp!.BackButton.offClick(handler);
      webApp!.BackButton.hide();
    };
  }, [enabled]);
}
