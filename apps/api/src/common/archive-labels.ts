import { AssignStatus } from './enums';

export function archivedReasonLabel(status: string): string {
  if (status === AssignStatus.DAY_ARCHIVED) return '这一期先放下了';
  if (status === AssignStatus.SHARED_DONE) return '家人已完成，不再催促';
  if (status === AssignStatus.CLOSED) return '期限已过';
  return '已归档';
}
