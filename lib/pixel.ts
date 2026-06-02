export const PIXEL_ID = '1304764505193953';

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

export function fbqEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', event, params);
  }
}

export function fbqCustomEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', event, params);
  }
}
