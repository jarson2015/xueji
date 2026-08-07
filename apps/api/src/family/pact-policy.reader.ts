import { Injectable } from '@nestjs/common';
import {
  FamilyPolicyReader,
  type PointsPactConfig,
} from './family-policy.reader';

/** Thin reader for points-pact settings (batch-friendly). */
@Injectable()
export class PactPolicyReader {
  constructor(private readonly familyPolicy: FamilyPolicyReader) {}

  async forStudent(studentId: number): Promise<PointsPactConfig> {
    const bundle = await this.familyPolicy.loadOne(studentId);
    return bundle.pointsPact;
  }

  async forStudents(
    studentIds: number[],
  ): Promise<Map<number, PointsPactConfig>> {
    const policies = await this.familyPolicy.loadForStudents(studentIds);
    const out = new Map<number, PointsPactConfig>();
    for (const [sid, bundle] of policies) {
      out.set(sid, bundle.pointsPact);
    }
    return out;
  }
}
