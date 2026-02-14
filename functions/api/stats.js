/**
 * API: Statistics
 */

const CF_PROXY_IP = '104.16.132.229';

export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  return new Response(JSON.stringify({
    totalQueries: 0,
    last24h: 0,
    cacheSize: 0,
    rulesCount: 1,
    byResult: { proxy: 0 },
    topDomains: [],
    config: {
      upstreamDns: '76.76.2.45',
      upstreamDnsBackup: '76.76.10.45',
      serverIp: CF_PROXY_IP,
      proxyAllDomains: true,
    },
    mode: 'all-domains-proxied',
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
