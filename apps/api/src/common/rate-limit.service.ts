import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

type Bucket = { count: number; resetAt: number };

/** Simple in-memory rate limiter (per-process). Expired keys pruned opportunistically. */
@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, Bucket>();
  private pruneAt = 0;

  /**
   * @param key unique key (e.g. ip+path)
   * @param limit max hits in window
   * @param windowMs window length
   */
  consume(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    this.maybePrune(now);
    let b = this.buckets.get(key);
    if (!b || now >= b.resetAt) {
      b = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, b);
    }
    b.count += 1;
    if (b.count > limit) {
      const waitSec = Math.ceil((b.resetAt - now) / 1000);
      throw new HttpException(
        `操作太频繁，请 ${waitSec} 秒后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Test / ops helper */
  size() {
    return this.buckets.size;
  }

  private maybePrune(now: number) {
    // At most every 60s, or when map grows large
    if (now < this.pruneAt && this.buckets.size < 2000) return;
    this.pruneAt = now + 60_000;
    for (const [k, b] of this.buckets) {
      if (now >= b.resetAt) this.buckets.delete(k);
    }
    // Hard cap: drop oldest-reset keys if still huge (attack / leak)
    if (this.buckets.size > 5000) {
      const sorted = [...this.buckets.entries()].sort(
        (a, b) => a[1].resetAt - b[1].resetAt,
      );
      for (let i = 0; i < sorted.length - 4000; i++) {
        this.buckets.delete(sorted[i][0]);
      }
    }
  }
}
