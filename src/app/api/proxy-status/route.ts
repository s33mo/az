import { NextResponse } from 'next/server'

// Get proxy URLs from environment variables
const DNS_PROXY_URL = process.env.DNS_PROXY_URL || 'http://localhost:3001'
const TRAFFIC_PROXY_URL = process.env.TRAFFIC_PROXY_URL || 'http://localhost:3002'

export async function GET() {
  const results = {
    dns: { connected: false, url: DNS_PROXY_URL, error: '' },
    traffic: { connected: false, url: TRAFFIC_PROXY_URL, error: '' },
  }

  // Check DNS proxy
  try {
    const dnsResponse = await fetch(`${DNS_PROXY_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    if (dnsResponse.ok) {
      const data = await dnsResponse.json()
      results.dns = {
        connected: true,
        url: DNS_PROXY_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
        serverIp: data.config?.serverIp,
        version: data.version,
        uptime: data.uptime,
        error: '',
      }
    }
  } catch (error) {
    results.dns.error = error instanceof Error ? error.message : 'Connection failed'
  }

  // Check traffic proxy
  try {
    const trafficResponse = await fetch(`${TRAFFIC_PROXY_URL}/stats`, {
      signal: AbortSignal.timeout(5000),
    })
    if (trafficResponse.ok) {
      const data = await trafficResponse.json()
      results.traffic = {
        connected: true,
        url: TRAFFIC_PROXY_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
        ...data,
        error: '',
      }
    }
  } catch (error) {
    results.traffic.error = error instanceof Error ? error.message : 'Connection failed'
  }

  return NextResponse.json(results)
}
