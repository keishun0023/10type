export const PIXEL_ID = '875620858900566';
export const PAYWALL_PIXEL_ID = '537934028825464';

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

// 両ピクセルに同じ標準イベントを送る
export function fbqEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('trackSingle', PIXEL_ID, event, params);
  window.fbq('trackSingle', PAYWALL_PIXEL_ID, event, params);
}

export function fbqCustomEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', event, params);
  }
}

// ペイウォール到達：PAYWALLピクセルにのみViewContentを送る
export function fbqPaywallReached() {
  if (typeof window === 'undefined' || !window.fbq) return;
  // PageViewは過去データと混ざるため使わず、標準イベントViewContentをペイウォール到達として発火する
  window.fbq('trackSingle', PAYWALL_PIXEL_ID, 'ViewContent', { content_name: 'paywall' });
}
