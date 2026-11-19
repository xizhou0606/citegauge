# CiteGauge

TypeScript SDK for server-side website visits, AI crawlers and XML/TXT requests. Requires Node.js 22.18+.

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
