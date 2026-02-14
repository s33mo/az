/**
 * REST API: Resolve Domain
 * ALL domains return proxy IP
 */

const CF_PROXY_IP = '104.16.132.229';

async function resolveDNS(domain, type = 'A') {
  const resolvers = [
    `https://freedns.controld.com/p0?name=${domain}&type=${type}`,
    `https://dns.google/resolve?name=${domain}&type=${type}`,
  ];

  for (const url of resolvers) {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/dns-json' },
        signal: AbortSignal.timeout(3000),
      });
      const data = await response.json();
      if (data.Answer && data.Answer.length > 0) {
        return data.Answer.map(a => a.data);
      }
    } catch {
      continue;
    }
  }
  return [];
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const domain = url.searchParams.get('domain');
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  if (!domain) {
    return new Response(JSON.stringify({ error: 'Domain parameter required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }
  
  // Get real IP for reference
  const realIPs = await resolveDNS(domain);
  
  // ALL domains return proxy IP
  return new Response(JSON.stringify({
    domain,
    type: 'A',
    answers: [{ name: domain, type: 1, ttl: 60, data: CF_PROXY_IP }],
    resultType: 'proxy',
    realIp: realIPs[0] || 'unknown',
    proxied: true,
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
