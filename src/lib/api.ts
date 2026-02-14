import { PROXY_IP } from './config';

// Helper to make API calls to Cloudflare Pages Functions
export async function dnsProxyFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  // Cloudflare Pages Functions are at /api/ and /dns-query/
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `/api/${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}${separator}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
  
  return response.json();
}

// Get proxy status - Cloudflare Pages always connected
export async function getProxyStatus(): Promise<{
  dns: {
    connected: boolean;
    url: string;
    serverIp?: string;
    version?: string;
    uptime?: number;
    error?: string;
  };
  traffic: {
    connected: boolean;
    url: string;
    totalConnections?: number;
    activeConnections?: number;
    httpRequests?: number;
    httpsTunnels?: number;
    bytesReceived?: number;
    bytesSent?: number;
    errors?: number;
    error?: string;
  };
}> {
  try {
    const response = await fetch('/health');
    const data = await response.json();
    
    return {
      dns: {
        connected: true,
        url: typeof window !== 'undefined' ? window.location.origin : '',
        serverIp: PROXY_IP,
        version: data.version,
        uptime: 0,
        error: '',
      },
      traffic: {
        connected: true,
        url: typeof window !== 'undefined' ? window.location.origin : '',
        totalConnections: 0,
        activeConnections: 0,
        httpRequests: 0,
        httpsTunnels: 0,
        bytesReceived: 0,
        bytesSent: 0,
        errors: 0,
        error: '',
      },
    };
  } catch (error) {
    return {
      dns: {
        connected: false,
        url: '',
        error: error instanceof Error ? error.message : 'Connection failed',
      },
      traffic: {
        connected: false,
        url: '',
        error: 'Not accessible',
      },
    };
  }
}
