import { defineConfig } from 'citegauge/browser'

export default defineConfig({
  enabled: true,
  // 客户工作区填入「网站流量 → SDK 接入」显示的 workspace。
  routes: ['/', '/pricing', '/projects/:id'],
  events: ['trial_started'],
  searchKeys: ['q', 'search'],
  collect: {
    pageviews: true, devices: true, pages: true, referrers: true,
    campaigns: true, sessions: true, countries: true, environment: true,
    engagement: true, scrollDepth: true, outboundLinks: true, downloads: true,
    forms: true, siteSearch: true, errors: true, customEvents: true, webVitals: true,
  },
})
