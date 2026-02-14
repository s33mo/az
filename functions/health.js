/**
 * Health Check Endpoint
 */

const CF_PROXY_IP = '104.16.132.229';

export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  return new Response(JSON.stringify({
    status: 'ok',
    service: 'smart-dns-proxy',
    version: '3.0.0',
    platform: 'cloudflare-pages',
    mode: 'all-domains-proxied',
    proxyIP: CF_PROXY_IP,
    features: [
      'DNS-over-HTTPS (DoH)',
      'ALL domains proxied',
      'No second server needed',
      'Cloudflare global network',
    ],
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
