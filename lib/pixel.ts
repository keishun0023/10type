export const PIXEL_ID = '875620858900566';

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

// ペイウォール到達計測用の別ピクセル。到達時に初期化し、このピクセルにだけイベントを送る
export const PAYWALL_PIXEL_ID = '537934028825464';
let paywallPixelInitialized = false;

export function fbqPaywallReached() {
  if (typeof window === 'undefined' || !window.fbq) return;
  if (!paywallPixelInitialized) {
    window.fbq('init', PAYWALL_PIXEL_ID);
    paywallPixelInitialized = true;
  }
  window.fbq('trackSingle', PAYWALL_PIXEL_ID, 'PageView');
  window.fbq('trackSingle', PAYWALL_PIXEL_ID, 'ViewContent', { content_name: 'paywall' });
}
