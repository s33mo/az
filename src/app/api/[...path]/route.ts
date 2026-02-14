import { NextRequest, NextResponse } from 'next/server'

// Get DNS proxy URL from environment variable or use localhost
const DNS_PROXY_URL = process.env.DNS_PROXY_URL || 'http://localhost:3001'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathString = path.join('/')
  const searchParams = request.nextUrl.searchParams
  
  // Remove XTransformPort from search params since we're handling it
  searchParams.delete('XTransformPort')
  
  const queryString = searchParams.toString()
  // DNS proxy uses /api/ prefix for its API endpoints
  const url = `${DNS_PROXY_URL}/api/${pathString}${queryString ? '?' + queryString : ''}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('DNS proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to DNS proxy service' },
      { status: 503 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathString = path.join('/')
  const searchParams = request.nextUrl.searchParams
  
  searchParams.delete('XTransformPort')
  
  const queryString = searchParams.toString()
  const url = `${DNS_PROXY_URL}/api/${pathString}${queryString ? '?' + queryString : ''}`
  
  try {
    const body = await request.text()
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('DNS proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to DNS proxy service' },
      { status: 503 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathString = path.join('/')
  const searchParams = request.nextUrl.searchParams
  
  searchParams.delete('XTransformPort')
  
  const queryString = searchParams.toString()
  const url = `${DNS_PROXY_URL}/api/${pathString}${queryString ? '?' + queryString : ''}`
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('DNS proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to DNS proxy service' },
      { status: 503 }
    )
  }
}
