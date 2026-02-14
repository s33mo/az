/**
 * API: DNS Rules
 */

export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  return new Response(JSON.stringify({
    rules: [
      {
        id: 'all-domains',
        domain: '*',
        targetType: 'proxy',
        customIp: '104.16.132.229',
        enabled: true,
        priority: 1000,
        category: 'all',
      }
    ],
    total: 1,
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
