import { ForbiddenException } from '@nestjs/common';

/** 私密日记访问：本人学生且非代登 */
export function assertJournalPrivateAccess(user: {
  role?: string;
  isProxy?: boolean;
}) {
  if (user.role !== 'student') {
    throw new ForbiddenException('仅学生可操作私密日记');
  }
  if (user.isProxy) {
    throw new ForbiddenException('代登不可使用私密日记');
  }
}
