export function archivedReasonLabel(status: string): string {
  if (status === 'day_archived') return '这一期先放下了'
  if (status === 'shared_done') return '家人已完成，不再催促'
  if (status === 'closed') return '期限已过'
  return '已归档'
}
