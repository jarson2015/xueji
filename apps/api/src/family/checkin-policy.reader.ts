import { Injectable } from '@nestjs/common';
import {
  FamilyPolicyReader,
  type MakeupConfig,
  type StudentPolicyBundle,
} from './family-policy.reader';

/**
 * Check-in / makeup / rest-day policy facade for CheckinsService & streaks.
 */
@Injectable()
export class CheckinPolicyReader {
  constructor(private readonly familyPolicy: FamilyPolicyReader) {}

  async forStudent(studentId: number): Promise<{
    edu: StudentPolicyBundle['edu'];
    makeup: MakeupConfig;
    rest: StudentPolicyBundle['rest'];
    slots: StudentPolicyBundle['slots'];
  }> {
    const bundle = await this.familyPolicy.loadOne(studentId);
    return {
      edu: bundle.edu,
      makeup: bundle.makeup,
      rest: bundle.rest,
      slots: bundle.slots,
    };
  }

  async forStudents(studentIds: number[]) {
    return this.familyPolicy.loadForStudents(studentIds);
  }

  /** Batch rest-day map for streak / reports (no per-day DB). */
  async restDayKeys(
    studentIds: number[],
    dateKeys: string[],
  ): Promise<Map<number, Map<string, boolean>>> {
    const policies = await this.familyPolicy.loadForStudents(studentIds);
    return this.familyPolicy.batchRestDayKeys(policies, studentIds, dateKeys);
  }
}
