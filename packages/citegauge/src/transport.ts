import type { Visit } from "./types.ts";

export function transport(endpoint: string, token: string) {
  const queue: Visit[] = [];
  let pending: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  function schedule() {
    if (closed || timer || !queue.length) return;
    timer = setTimeout(() => { timer = undefined; void flush().catch(() => {}); },2000);
    timer.unref();
  }
  async function send() {
    while (queue.length) {
      const events = queue.slice(0,16);
      const res = await fetch(endpoint,{method:"POST",redirect:"error",signal:AbortSignal.timeout(4500),
        headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({events})});
      if (!res.ok) {
        await res.body?.cancel();
        throw Error("CiteGauge 上报失败 (HTTP " + res.status + ")");
      }
      await res.body?.cancel();
      queue.splice(0,events.length);
    }
  }
  function flush(): Promise<void> {
    return pending ??= send().finally(() => { pending = undefined; schedule(); });
  }
  return {
    add(event: Visit) {
      if (closed || queue.length >= 512) return;
      queue.push(event);
      schedule();
    },
    flush,
    close() { closed = true; clearTimeout(timer); return flush(); },
  };
}
