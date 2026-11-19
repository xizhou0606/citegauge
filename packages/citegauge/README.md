# CiteGauge

TypeScript SDK for browser page views and server-side traffic.

## Browser

Copy the included citegauge.example.ts to your frontend project as citegauge.ts to see every switch.

Enable browser analytics for the website in CiteGauge, then call this once in the frontend entry point. Customer workspaces use the public workspace option displayed in the dashboard.

```ts
// citegauge.ts (frontend project root)
import { defineConfig } from 'citegauge/browser'
export default defineConfig({ enabled: true, collect: { forms: false }, routes: ['/', '/pricing'] })
```

```ts
// src/main.ts
import citegauge from 'citegauge/browser'
import config from '../citegauge'
citegauge.init(config)
```

Built-in measurements default to enabled. Set individual flags to false or use enabled: false to disable all tracking. See the [full TypeScript configuration and metric definitions](https://citegauge.liushurui0606.workers.dev/docs/sdk/collection.html).

## Node HTTP/1

Requires Node.js 22.18+. Server instrumentation records HTML requests, AI crawler visits and XML/TXT requests.

Install with npm using the versioned distribution in the [SDK guide](https://citegauge.liushurui0606.workers.dev/docs/sdk/). Set the server environment variable CITEGAUGE_TOKEN and create citegauge.ts in the site's working directory.

```ts
import { defineConfig } from 'citegauge'

export default defineConfig({ domain: 'example.com' })
```

In the server startup lifecycle, before accepting requests:

```ts
import citegauge from 'citegauge'

await citegauge.init()
```

[Metrics and coverage](https://citegauge.liushurui0606.workers.dev/docs/sdk/metrics.html)
