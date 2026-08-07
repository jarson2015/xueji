/**
 * One-shot: compare GET /dashboard/monitor vs ?lite=1 latency & payload.
 * Usage: npx ts-node -r tsconfig-paths/register src/bench-monitor.ts
 */
const base = process.env.API_BASE || 'http://localhost:3000/api';
const WARM = Number(process.env.BENCH_WARM || 3);
const N = Number(process.env.BENCH_N || 30);

async function req(path: string, opts: any = {}) {
  const t0 = performance.now();
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  const ms = performance.now() - t0;
  const body = JSON.parse(text);
  if (body.code !== 0) {
    throw new Error(`${path}: ${body.message}`);
  }
  return { ms, bytes: Buffer.byteLength(text, 'utf8'), data: body.data };
}

function stats(arr: number[]) {
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const at = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
  return {
    n: sorted.length,
    min: +sorted[0].toFixed(1),
    p50: +at(50).toFixed(1),
    p95: +at(95).toFixed(1),
    max: +sorted[sorted.length - 1].toFixed(1),
    avg: +(sum / sorted.length).toFixed(1),
  };
}

function childPayloadHint(children: any[]) {
  if (!children?.length) return { items: 0, sampleKeys: [] as string[] };
  const c0 = children[0] || {};
  return {
    items: children.length,
    sampleKeys: Object.keys(c0).sort(),
    todayItems: Array.isArray(c0.todayItems) ? c0.todayItems.length : undefined,
    timeline: Array.isArray(c0.timeline) ? c0.timeline.length : undefined,
  };
}

async function main() {
  const login = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'parent@demo.com',
      password: 'demo1234',
    }),
  });
  const h = { Authorization: `Bearer ${login.data.accessToken}` };

  for (let i = 0; i < WARM; i++) {
    await req('/dashboard/monitor', { headers: h });
    await req('/dashboard/monitor?lite=1', { headers: h });
  }

  const fullMs: number[] = [];
  const liteMs: number[] = [];
  let lastFull: any;
  let lastLite: any;
  let fullBytes = 0;
  let liteBytes = 0;

  for (let i = 0; i < N; i++) {
    // Alternate order each round to reduce bias
    if (i % 2 === 0) {
      lastFull = await req('/dashboard/monitor', { headers: h });
      lastLite = await req('/dashboard/monitor?lite=1', { headers: h });
    } else {
      lastLite = await req('/dashboard/monitor?lite=1', { headers: h });
      lastFull = await req('/dashboard/monitor', { headers: h });
    }
    fullMs.push(lastFull.ms);
    liteMs.push(lastLite.ms);
    fullBytes = lastFull.bytes;
    liteBytes = lastLite.bytes;
  }

  const timedFull = await req('/dashboard/monitor?timing=1', { headers: h });
  const timedLite = await req('/dashboard/monitor?lite=1&timing=1', {
    headers: h,
  });

  // ETag 304 往返（应接近纯网络开销）
  const etagWarm = await fetch(`${base}/dashboard/monitor?lite=1`, {
    headers: h,
  });
  const etag = etagWarm.headers.get('etag') || '';
  const etagMs: number[] = [];
  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    const r = await fetch(`${base}/dashboard/monitor?lite=1`, {
      headers: { ...h, 'If-None-Match': etag },
    });
    etagMs.push(performance.now() - t0);
    if (r.status !== 304) {
      throw new Error(`bench etag expected 304 got ${r.status}`);
    }
  }

  const full = stats(fullMs);
  const lite = stats(liteMs);
  const out = {
    base,
    warm: WARM,
    rounds: N,
    full: {
      ...full,
      bytes: fullBytes,
      liteFlag: lastFull.data?.lite ?? false,
      children: childPayloadHint(lastFull.data?.children),
      pendingConfirms: (lastFull.data?.pendingConfirms || []).length,
      hasCoach: Array.isArray(lastFull.data?.coachInsights),
      hasFairness: !!lastFull.data?.fairnessHint,
      serverPerf: timedFull.data?._perf || null,
    },
    lite: {
      ...lite,
      bytes: liteBytes,
      liteFlag: lastLite.data?.lite === true,
      children: childPayloadHint(lastLite.data?.children),
      pendingConfirms: (lastLite.data?.pendingConfirms || []).length,
      hasCoach: Array.isArray(lastLite.data?.coachInsights),
      hasFairness: !!lastLite.data?.fairnessHint,
      serverPerf: timedLite.data?._perf || null,
    },
    ratio: {
      latencyFullOverLiteAvg: +(full.avg / lite.avg).toFixed(2),
      latencyFullOverLiteP50: +(full.p50 / lite.p50).toFixed(2),
      payloadShrinkPct: +((1 - liteBytes / fullBytes) * 100).toFixed(1),
    },
    etag304: stats(etagMs),
  };
  console.log('BENCH_MONITOR_OK');
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error('BENCH_MONITOR_FAIL', e.message || e);
  process.exit(1);
});
