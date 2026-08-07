import { Injectable } from '@nestjs/common';
import { formatDate } from './date-util';

/**
 * In-memory revision for parent monitor ETag.
 * Bumped when family events fire so unchanged polls can 304 without DB.
 */
@Injectable()
export class MonitorRevisionService {
  private readonly rev = new Map<number, number>();

  bump(parentIds: number[]) {
    for (const id of parentIds) {
      if (!id) continue;
      this.rev.set(id, (this.rev.get(id) || 0) + 1);
    }
  }

  get(parentId: number) {
    return this.rev.get(parentId) || 0;
  }

  etag(parentId: number, lite: boolean, date = formatDate()) {
    return `W/"mon-${parentId}-${date}-${lite ? 'L' : 'F'}-r${this.get(parentId)}"`;
  }
}
