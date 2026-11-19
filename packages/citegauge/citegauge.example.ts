import { defineConfig } from 'citegauge/browser'

export default defineConfig({
  enabled: true,
  // 客户工作区填入「网站流量 → SDK 接入」显示的 workspace。
  routes: ['/', '/pricing', '/projects/:id'],
  controls: { '定价入口': 'a[href="/pricing"]' },
  goals: [{ name: '查看定价', route: '/pricing' }],
  funnels: [{ name: '了解价格', steps: ['/', '/pricing'] }],
  searchKeys: ['q', 'search'],
  collect: {
    pageviews: true, devices: true, pages: true, referrers: true,
    campaigns: true, sessions: true, countries: true, environment: true,
    engagement: true, scrollDepth: true, outboundLinks: true, downloads: true,
    journeys: true, clicks: true, goals: true, funnels: true, media: true,
    formStarts: true, navigationTiming: true, resourceErrors: true,
    forms: true, siteSearch: true, errors: true, customEvents: true, webVitals: true,
  },
})
