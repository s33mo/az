// Configuration for Smart DNS Proxy
// For Cloudflare Pages, the functions handle all API calls

// Get the API base URL (for Cloudflare Pages, it's the same origin)
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

// Admin password
export const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

// Proxy IP returned for all domains
export const PROXY_IP = '104.16.132.229';
