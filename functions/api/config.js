/**
 * API: Configuration
 */

const CF_PROXY_IP = '104.16.132.229';

export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  return new Response(JSON.stringify({
    config: {
      upstreamDns: '76.76.2.45',
      upstreamDnsBackup: '76.76.10.45',
      upstreamDnsIpv6: '2606:1a40::45',
      upstreamDnsIpv6Backup: '2606:1a40:1::45',
      cacheEnabled: true,
      cacheTtl: 60,
      blockAdsEnabled: false,
      logQueries: false,
      proxyAllDomains: true,
      serverIp: CF_PROXY_IP,
    },
    mode: 'all-domains-proxied',
    platform: 'cloudflare-pages',
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
