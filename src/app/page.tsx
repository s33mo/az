'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { 
  Globe, Server, Activity, Shield, Settings, Plus, Trash2, RefreshCw, 
  Search, Clock, ArrowUpRight, AlertCircle, CheckCircle, XCircle,
  Zap, BarChart3, List, Lock, LogOut, Eye, EyeOff, Save
} from 'lucide-react'
import { dnsProxyFetch, getProxyStatus } from '@/lib/api'

// Types
interface DnsRule {
  id: string
  domain: string
  targetType: string
  customIp: string | null
  proxyServer: string | null
  enabled: boolean
  priority: number
  category: string | null
  description?: string
}

interface DnsLog {
  domain: string
  clientIp?: string
  queryType: string
  resultType: string
  resolvedIp?: string
  realIp?: string
  responseTime?: number
  ruleId?: string
  createdAt: string
}

interface DnsStats {
  totalQueries: number
  last24h: number
  cacheSize: number
  rulesCount: number
  byResult: Record<string, number>
  topDomains: Array<[string, number]>
  config?: {
    upstreamDns: string
    upstreamDnsBackup: string
    serverIp: string
    proxyAllDomains: boolean
  }
}

interface DnsConfig {
  upstreamDns: string
  upstreamDnsBackup: string
  upstreamDnsIpv6: string
  upstreamDnsIpv6Backup: string
  cacheEnabled: boolean
  cacheTtl: number
  blockAdsEnabled: boolean
  logQueries: boolean
  proxyAllDomains: boolean
  serverIp: string
}

// Stats Card Component
function StatsCard({ title, value, description, icon: Icon, color }: {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  color: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

// Login Component
function LoginScreen({ onLogin }: { onLogin: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const success = await onLogin(password)
    
    if (success) {
      toast.success('Welcome to DNS Proxy Admin')
    } else {
      setError('Invalid password')
      setPassword('')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Smart DNS Proxy</CardTitle>
          <CardDescription>
            Enter admin password to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pr-10"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Login
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Connection status interface
interface ConnectionStatus {
  connected: boolean
  proxyUrl: string
  serverIp?: string
  version?: string
  uptime?: number
  error?: string
}

// Traffic proxy stats interface
interface TrafficProxyStats {
  connected: boolean
  totalConnections: number
  activeConnections: number
  httpRequests: number
  httpsTunnels: number
  bytesReceived: number
  bytesSent: number
  errors: number
  error?: string
}

// Main Dashboard Component
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<DnsStats | null>(null)
  const [rules, setRules] = useState<DnsRule[]>([])
  const [logs, setLogs] = useState<DnsLog[]>([])
  const [config, setConfig] = useState<DnsConfig | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [trafficStats, setTrafficStats] = useState<TrafficProxyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchDomain, setSearchDomain] = useState('')
  const [resolveResult, setResolveResult] = useState<any>(null)
  const [newRuleDialogOpen, setNewRuleDialogOpen] = useState(false)
  const [newRule, setNewRule] = useState({
    domain: '',
    targetType: 'proxy',
    customIp: '',
    priority: 50,
    category: '',
  })
  
  // Local state for editing server IP
  const [editingServerIp, setEditingServerIp] = useState('')
  const [savingIp, setSavingIp] = useState(false)

  // Check connection status for both DNS and traffic proxy
  const checkConnection = useCallback(async () => {
    try {
      const status = await getProxyStatus()
      
      setConnectionStatus({
        connected: status.dns?.connected || false,
        proxyUrl: status.dns?.url || 'unknown',
        serverIp: status.dns?.serverIp,
        version: status.dns?.version,
        uptime: status.dns?.uptime,
        error: status.dns?.error,
      })
      
      setTrafficStats({
        connected: status.traffic?.connected || false,
        totalConnections: status.traffic?.totalConnections || 0,
        activeConnections: status.traffic?.activeConnections || 0,
        httpRequests: status.traffic?.httpRequests || 0,
        httpsTunnels: status.traffic?.httpsTunnels || 0,
        bytesReceived: status.traffic?.bytesReceived || 0,
        bytesSent: status.traffic?.bytesSent || 0,
        errors: status.traffic?.errors || 0,
        error: status.traffic?.error,
      })
      
      return status.dns?.connected || false
    } catch (error) {
      setConnectionStatus({
        connected: false,
        proxyUrl: 'unknown',
        error: 'Failed to check connection status',
      })
      setTrafficStats({
        connected: false,
        totalConnections: 0,
        activeConnections: 0,
        httpRequests: 0,
        httpsTunnels: 0,
        bytesReceived: 0,
        bytesSent: 0,
        errors: 0,
        error: 'Failed to check traffic proxy status',
      })
      return false
    }
  }, [])

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      // First check connection status
      await checkConnection()
      
      const [statsData, rulesData, logsData, configData] = await Promise.all([
        dnsProxyFetch('stats'),
        dnsProxyFetch('rules'),
        dnsProxyFetch('logs?limit=100'),
        dnsProxyFetch('config'),
      ])
      setStats(statsData)
      setRules(rulesData.rules)
      setLogs(logsData.logs)
      setConfig(configData.config)
      // Initialize editing state with current server IP
      setEditingServerIp(configData.config?.serverIp || '')
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to fetch data from DNS proxy')
    } finally {
      setLoading(false)
    }
  }, [checkConnection])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleResolve = async () => {
    if (!searchDomain) return
    try {
      const result = await dnsProxyFetch(`resolve?domain=${encodeURIComponent(searchDomain)}`)
      setResolveResult(result)
      toast.success(`Resolved ${searchDomain}`)
    } catch (error) {
      toast.error('Failed to resolve domain')
    }
  }

  const handleAddRule = async () => {
    try {
      await dnsProxyFetch('rules', {
        method: 'POST',
        body: JSON.stringify(newRule),
      })
      toast.success('Rule added successfully')
      setNewRuleDialogOpen(false)
      setNewRule({ domain: '', targetType: 'proxy', customIp: '', priority: 50, category: '' })
      fetchData()
    } catch (error) {
      toast.error('Failed to add rule')
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await dnsProxyFetch(`rules/${ruleId}`, { method: 'DELETE' })
      toast.success('Rule deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete rule')
    }
  }

  const handleClearCache = async () => {
    try {
      await dnsProxyFetch('cache/clear', { method: 'POST' })
      toast.success('Cache cleared')
    } catch (error) {
      toast.error('Failed to clear cache')
    }
  }

  const handleClearLogs = async () => {
    try {
      await dnsProxyFetch('logs/clear', { method: 'POST' })
      toast.success('Logs cleared')
      fetchData()
    } catch (error) {
      toast.error('Failed to clear logs')
    }
  }

  // Save server IP
  const handleSaveServerIp = async () => {
    if (!editingServerIp || editingServerIp === config?.serverIp) return
    
    setSavingIp(true)
    try {
      const result = await dnsProxyFetch('config', {
        method: 'POST',
        body: JSON.stringify({ serverIp: editingServerIp }),
      })
      if (result.success) {
        toast.success(`Server IP updated to ${editingServerIp}`)
        fetchData()
      }
    } catch (error) {
      toast.error('Failed to update server IP')
      // Reset to current value
      setEditingServerIp(config?.serverIp || '')
    } finally {
      setSavingIp(false)
    }
  }

  const handleUpdateConfig = async (updates: Partial<DnsConfig>) => {
    try {
      await dnsProxyFetch('config', {
        method: 'POST',
        body: JSON.stringify(updates),
      })
      toast.success('Configuration updated')
      fetchData()
    } catch (error) {
      toast.error('Failed to update configuration')
    }
  }

  const getResultBadge = (resultType: string) => {
    const colors: Record<string, string> = {
      proxy: 'bg-blue-500',
      direct: 'bg-green-500',
      blocked: 'bg-red-500',
      cached: 'bg-yellow-500',
      custom: 'bg-purple-500',
      nxdomain: 'bg-gray-500',
    }
    return colors[resultType] || 'bg-gray-500'
  }

  const getResultIcon = (resultType: string) => {
    switch (resultType) {
      case 'proxy': return <ArrowUpRight className="h-3 w-3" />
      case 'direct': return <CheckCircle className="h-3 w-3" />
      case 'blocked': return <XCircle className="h-3 w-3" />
      case 'cached': return <Zap className="h-3 w-3" />
      default: return <AlertCircle className="h-3 w-3" />
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Smart DNS Proxy</h1>
                <p className="text-sm text-muted-foreground">
                  DNS-over-HTTPS proxy with smart routing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Shield className="h-4 w-4" />
              DNS Rules
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <List className="h-4 w-4" />
              Query Logs
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Total Queries"
                value={stats?.totalQueries || 0}
                description="All time queries"
                icon={BarChart3}
                color="text-blue-500"
              />
              <StatsCard
                title="Last 24 Hours"
                value={stats?.last24h || 0}
                description="Recent queries"
                icon={Clock}
                color="text-green-500"
              />
              <StatsCard
                title="Cache Size"
                value={stats?.cacheSize || 0}
                description="Cached responses"
                icon={Zap}
                color="text-yellow-500"
              />
              <StatsCard
                title="Active Rules"
                value={stats?.rulesCount || 0}
                description="DNS routing rules"
                icon={Shield}
                color="text-purple-500"
              />
            </div>

            {/* Current Server IP Display */}
            <Card className={`border-2 ${connectionStatus?.connected ? 'border-green-500/20 bg-green-500/5' : connectionStatus ? 'border-red-500/20 bg-red-500/5' : 'border-gray-500/20 bg-gray-500/5'}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">Current Proxy Server IP</p>
                      {connectionStatus && (
                        <Badge variant={connectionStatus.connected ? 'default' : 'destructive'} className="text-xs">
                          {connectionStatus.connected ? 'Connected' : 'Disconnected'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold font-mono">{config?.serverIp || connectionStatus?.serverIp || 'Loading...'}</p>
                    {connectionStatus?.error && (
                      <p className="text-sm text-red-500">{connectionStatus.error}</p>
                    )}
                  </div>
                  <div className={`p-3 rounded-full ${connectionStatus?.connected ? 'bg-green-500/10' : connectionStatus ? 'bg-red-500/10' : 'bg-gray-500/10'}`}>
                    <Server className={`h-8 w-8 ${connectionStatus?.connected ? 'text-green-500' : connectionStatus ? 'text-red-500' : 'text-gray-500'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Traffic Proxy Status */}
            <Card className={`border-2 ${trafficStats?.connected ? 'border-green-500/20 bg-green-500/5' : trafficStats ? 'border-red-500/20 bg-red-500/5' : 'border-gray-500/20 bg-gray-500/5'}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">Traffic Proxy Status</p>
                      <Badge variant={trafficStats?.connected ? 'default' : trafficStats ? 'destructive' : 'secondary'} className="text-xs">
                        {trafficStats?.connected ? 'Running' : trafficStats ? 'Stopped' : 'Loading...'}
                      </Badge>
                    </div>
                    <div className="flex gap-6 mt-2">
                      <div>
                        <p className="text-lg font-bold">{trafficStats?.activeConnections ?? '-'}</p>
                        <p className="text-xs text-muted-foreground">Active</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{trafficStats?.totalConnections ?? '-'}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{trafficStats?.httpRequests ?? '-'}</p>
                        <p className="text-xs text-muted-foreground">HTTP</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{trafficStats?.httpsTunnels ?? '-'}</p>
                        <p className="text-xs text-muted-foreground">HTTPS</p>
                      </div>
                    </div>
                    {trafficStats?.error && (
                      <p className="text-sm text-red-500 mt-2">{trafficStats.error}</p>
                    )}
                  </div>
                  <div className={`p-3 rounded-full ${trafficStats?.connected ? 'bg-green-500/10' : trafficStats ? 'bg-red-500/10' : 'bg-gray-500/10'}`}>
                    <Activity className={`h-8 w-8 ${trafficStats?.connected ? 'text-green-500' : trafficStats ? 'text-red-500' : 'text-gray-500'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Quick DNS Lookup
                </CardTitle>
                <CardDescription>
                  Test DNS resolution through the proxy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter domain (e.g., youtube.com)"
                    value={searchDomain}
                    onChange={(e) => setSearchDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleResolve()}
                    className="flex-1"
                  />
                  <Button onClick={handleResolve}>
                    <Search className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                </div>
                {resolveResult && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Domain:</span>
                        <span className="ml-2 font-medium">{resolveResult.domain}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <Badge className="ml-2">{resolveResult.type}</Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Result:</span>
                        <Badge className={`ml-2 ${getResultBadge(resolveResult.resultType)}`}>
                          {resolveResult.resultType}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IP:</span>
                        <code className="ml-2 text-xs bg-background px-2 py-1 rounded">
                          {resolveResult.answers?.[0]?.data || 'N/A'}
                        </code>
                      </div>
                      {resolveResult.realIp && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Real IP (hidden):</span>
                          <code className="ml-2 text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded">
                            {resolveResult.realIp}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats by Result Type */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Query Distribution</CardTitle>
                  <CardDescription>By result type (last 24h)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.byResult && Object.entries(stats.byResult).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getResultBadge(type)}`} />
                          <span className="capitalize">{type}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Queried Domains</CardTitle>
                  <CardDescription>Most frequent queries (last 24h)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.topDomains?.map(([domain, count]) => (
                      <div key={domain} className="flex items-center justify-between">
                        <code className="text-sm">{domain}</code>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* DoH Configuration Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  DNS-over-HTTPS Configuration
                </CardTitle>
                <CardDescription>
                  Configure your devices or browsers to use this DNS proxy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">DoH Endpoint:</p>
                    <code className="text-xs bg-background px-3 py-2 rounded block break-all">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/dns-query
                    </code>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">REST API Endpoint:</p>
                    <code className="text-xs bg-background px-3 py-2 rounded block break-all">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/api/resolve?domain=example.com
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DNS Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">DNS Routing Rules</h2>
                <p className="text-sm text-muted-foreground">
                  Define how specific domains should be resolved
                </p>
              </div>
              <Dialog open={newRuleDialogOpen} onOpenChange={setNewRuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add DNS Rule</DialogTitle>
                    <DialogDescription>
                      Create a new DNS routing rule
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="domain">Domain Pattern</Label>
                      <Input
                        id="domain"
                        placeholder="*.example.com"
                        value={newRule.domain}
                        onChange={(e) => setNewRule({ ...newRule, domain: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use * as wildcard. E.g., *.youtube.com
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetType">Target Type</Label>
                      <Select
                        value={newRule.targetType}
                        onValueChange={(v) => setNewRule({ ...newRule, targetType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="proxy">Proxy (return custom IP)</SelectItem>
                          <SelectItem value="direct">Direct (use upstream DNS)</SelectItem>
                          <SelectItem value="block">Block (return 0.0.0.0)</SelectItem>
                          <SelectItem value="custom">Custom IP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(newRule.targetType === 'proxy' || newRule.targetType === 'custom') && (
                      <div className="space-y-2">
                        <Label htmlFor="customIp">Custom IP</Label>
                        <Input
                          id="customIp"
                          placeholder="1.2.3.4"
                          value={newRule.customIp}
                          onChange={(e) => setNewRule({ ...newRule, customIp: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Input
                        id="priority"
                        type="number"
                        value={newRule.priority}
                        onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Higher priority rules are evaluated first
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category (optional)</Label>
                      <Input
                        id="category"
                        placeholder="streaming"
                        value={newRule.category}
                        onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewRuleDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddRule}>Add Rule</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Custom IP</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No rules configured. Add your first rule to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rules.slice(0, 100).map((rule) => (
                          <TableRow key={rule.id}>
                            <TableCell className="font-mono text-sm">{rule.domain}</TableCell>
                            <TableCell>
                              <Badge className={getResultBadge(rule.targetType)}>
                                {rule.targetType}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {rule.customIp || '-'}
                            </TableCell>
                            <TableCell>{rule.priority}</TableCell>
                            <TableCell>
                              <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                                {rule.enabled ? 'Active' : 'Disabled'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRule(rule.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Query Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Query Logs</h2>
                <p className="text-sm text-muted-foreground">
                  Recent DNS queries processed by the proxy
                </p>
              </div>
              <Button variant="outline" onClick={handleClearLogs}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Logs
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Real IP</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No query logs yet. Make some DNS queries to see them here.
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">{log.domain}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.queryType}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getResultBadge(log.resultType)} gap-1`}>
                                {getResultIcon(log.resultType)}
                                {log.resultType}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.resolvedIp || '-'}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-yellow-600 dark:text-yellow-400">
                              {log.realIp || '-'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Server IP Configuration */}
            <Card className="border-blue-500/20">
              <CardHeader className="bg-blue-500/5">
                <CardTitle className="flex items-center gap-2 text-blue-500">
                  <Server className="h-5 w-5" />
                  Proxy Server IP
                </CardTitle>
                <CardDescription>
                  This IP will be returned for all proxied domains. Set to your server's public IP.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="serverIp" className="sr-only">Server IP Address</Label>
                    <Input
                      id="serverIp"
                      value={editingServerIp}
                      onChange={(e) => setEditingServerIp(e.target.value)}
                      placeholder="Enter server IP"
                      className="font-mono text-lg h-12"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveServerIp}
                    disabled={savingIp || editingServerIp === config?.serverIp}
                    className="h-12 px-6"
                  >
                    {savingIp ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                </div>
                {editingServerIp !== config?.serverIp && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Press Save to apply the new IP address. All {rules.length} proxy rules will be updated.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>DNS Configuration</CardTitle>
                <CardDescription>
                  Configure upstream DNS servers and caching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upstream DNS Configuration */}
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">📡 Upstream DNS Servers</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    DNS servers used to resolve domains not in proxy rules.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="upstreamDns">Primary DNS (IPv4)</Label>
                      <Input
                        id="upstreamDns"
                        value={config?.upstreamDns || ''}
                        onBlur={(e) => {
                          if (e.target.value !== config?.upstreamDns) {
                            handleUpdateConfig({ upstreamDns: e.target.value })
                          }
                        }}
                        onChange={(e) => setConfig(prev => prev ? { ...prev, upstreamDns: e.target.value } : null)}
                        placeholder="76.76.2.45"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="upstreamDnsBackup">Backup DNS (IPv4)</Label>
                      <Input
                        id="upstreamDnsBackup"
                        value={config?.upstreamDnsBackup || ''}
                        onBlur={(e) => {
                          if (e.target.value !== config?.upstreamDnsBackup) {
                            handleUpdateConfig({ upstreamDnsBackup: e.target.value })
                          }
                        }}
                        onChange={(e) => setConfig(prev => prev ? { ...prev, upstreamDnsBackup: e.target.value } : null)}
                        placeholder="76.76.10.45"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Caching</Label>
                      <p className="text-sm text-muted-foreground">
                        Cache DNS responses for faster lookups
                      </p>
                    </div>
                    <Switch
                      checked={config?.cacheEnabled}
                      onCheckedChange={(checked) => handleUpdateConfig({ cacheEnabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Block Ads & Trackers</Label>
                      <p className="text-sm text-muted-foreground">
                        Block known ad and tracking domains
                      </p>
                    </div>
                    <Switch
                      checked={config?.blockAdsEnabled}
                      onCheckedChange={(checked) => handleUpdateConfig({ blockAdsEnabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Log Queries</Label>
                      <p className="text-sm text-muted-foreground">
                        Keep a log of all DNS queries
                      </p>
                    </div>
                    <Switch
                      checked={config?.logQueries}
                      onCheckedChange={(checked) => handleUpdateConfig({ logQueries: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Proxy All Domains</Label>
                      <p className="text-sm text-muted-foreground">
                        Return server IP for ALL domains (not just filtered ones)
                      </p>
                    </div>
                    <Switch
                      checked={config?.proxyAllDomains}
                      onCheckedChange={(checked) => handleUpdateConfig({ proxyAllDomains: checked })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cacheTtl">Cache TTL (seconds)</Label>
                    <Input
                      id="cacheTtl"
                      type="number"
                      value={config?.cacheTtl || 300}
                      onBlur={(e) => {
                        if (parseInt(e.target.value) !== config?.cacheTtl) {
                          handleUpdateConfig({ cacheTtl: parseInt(e.target.value) })
                        }
                      }}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, cacheTtl: parseInt(e.target.value) } : null)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClearCache}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear Cache
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>Smart DNS Proxy v2.0.0</p>
            <p>DoH endpoint ready</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Main App Component with Auth
export default function DnsProxyDashboard() {
  // Initialize auth state from sessionStorage synchronously
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('dns-proxy-auth') === 'true'
    }
    return false
  })

  const handleLogin = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsAuthenticated(true)
        sessionStorage.setItem('dns-proxy-auth', 'true')
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem('dns-proxy-auth')
    toast.info('Logged out successfully')
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return <Dashboard onLogout={handleLogout} />
}
