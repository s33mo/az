/**
 * DNS-over-HTTPS Endpoint for Cloudflare Pages Functions
 * ALL domains return proxy IP - traffic goes through Cloudflare
 */

// Cloudflare's anycast IP - all traffic routes through CF
const CF_PROXY_IP = '104.16.132.229';

// Resolve DNS using DoH
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
        const typeNum = type === 'A' ? 1 : type === 'AAAA' ? 28 : 1;
        return data.Answer
          .filter(a => a.type === typeNum)
          .map(a => a.data);
      }
    } catch {
      continue;
    }
  }
  return [];
}

// Parse DNS query
function parseDNSQuery(buffer) {
  if (buffer.length < 12) return null;
  
  const view = new DataView(buffer.buffer, buffer.byteOffset);
  const id = view.getUint16(0);
  
  let offset = 12;
  let name = '';
  
  while (offset < buffer.length) {
    const len = buffer[offset];
    if (len === 0) break;
    offset++;
    name += new TextDecoder().decode(buffer.slice(offset, offset + len)) + '.';
    offset += len;
  }
  
  name = name.slice(0, -1);
  const type = view.getUint16(offset + 1);
  
  return { id, name, type };
}

// Create DNS response
function createDNSResponse(query, answers) {
  const response = new Uint8Array(query.length + 1000);
  const view = new DataView(response.buffer);
  
  response[0] = query[0];
  response[1] = query[1];
  view.setUint16(2, 0x8180);
  view.setUint16(4, 1);
  view.setUint16(6, answers.length);
  view.setUint16(8, 0);
  view.setUint16(10, 0);
  
  let offset = 12;
  while (query[offset] !== 0 && offset < query.length) {
    response[offset] = query[offset];
    offset++;
  }
  while (offset < query.length && (query[offset] !== 0 || query[offset-1] === 0)) {
    response[offset] = query[offset];
    offset++;
  }
  
  for (const answer of answers) {
    view.setUint16(offset, 0xC00C);
    offset += 2;
    view.setUint16(offset, answer.type);
    view.setUint16(offset + 2, 1);
    view.setUint32(offset + 4, answer.ttl);
    offset += 8;
    
    if (answer.type === 1) {
      view.setUint16(offset, 4);
      offset += 2;
      const parts = answer.data.split('.').map(Number);
      for (let i = 0; i < 4; i++) {
        response[offset + i] = parts[i] || 0;
      }
      offset += 4;
    }
  }
  
  return response.slice(0, offset);
}

// Handle GET request
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const dnsParam = url.searchParams.get('dns');
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  if (!dnsParam) {
    return new Response(JSON.stringify({ error: 'DNS parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  
  try {
    const query = Uint8Array.from(atob(dnsParam.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const parsed = parseDNSQuery(query);
    
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'Invalid DNS query' }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    
    // ALL domains return proxy IP
    const response = createDNSResponse(query, [{
      name: parsed.name,
      type: 1,
      ttl: 60,
      data: CF_PROXY_IP,
    }]);
    
    return new Response(response, {
      headers: { 'Content-Type': 'application/dns-message', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'DNS processing error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

// Handle POST request
export async function onRequestPost(context) {
  const { request } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  try {
    const query = new Uint8Array(await request.arrayBuffer());
    const parsed = parseDNSQuery(query);
    
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'Invalid DNS query' }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    
    // ALL domains return proxy IP
    const response = createDNSResponse(query, [{
      name: parsed.name,
      type: 1,
      ttl: 60,
      data: CF_PROXY_IP,
    }]);
    
    return new Response(response, {
      headers: { 'Content-Type': 'application/dns-message', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'DNS processing error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
