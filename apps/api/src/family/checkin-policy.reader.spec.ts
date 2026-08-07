/**
 * CheckinPolicyReader — single forStudent returns edu+makeup+rest.
 */
import assert from 'assert';
import { User } from '../entities/user.entity';
import { FamilySettings } from '../entities/family-settings.entity';
import { ParentStudent } from '../entities/parent-student.entity';
import { UserRole } from '../common/enums';
import { FamilyPolicyReader } from './family-policy.reader';
import { CheckinPolicyReader } from './checkin-policy.reader';
import { createSqliteMemory, runTests, test } from '../test/sqlite-memory';

async function main() {
  const ds = await createSqliteMemory();
  const users = ds.getRepository(User);
  const settings = ds.getRepository(FamilySettings);
  const links = ds.getRepository(ParentStudent);
  const familyPolicy = new FamilyPolicyReader(settings, links, users);
  const reader = new CheckinPolicyReader(familyPolicy);

  const parent = await users.save(
    users.create({
      username: 'p_chk',
      passwordHash: 'x',
      name: '家长',
      role: UserRole.PARENT,
      pointsBalance: 0,
    }),
  );
  const student = await users.save(
    users.create({
      username: 's_chk',
      passwordHash: 'x',
      name: '学生',
      role: UserRole.STUDENT,
      pointsBalance: 0,
    }),
  );
  await links.save(links.create({ parentId: parent.id, studentId: student.id }));
  await settings.save(
    settings.create({
      parentId: parent.id,
      weeklyRestDays: [1],
      extraRestDates: [],
      restDaysEnabled: true,
      restPauseCategories: ['study'],
      makeupEnabled: true,
      makeupDiscountPercent: 70,
      makeupWindowDays: 7,
      rewardMode: 'weekly_digest',
      ageBand: 'young',
      reflectionEnabled: false,
    }),
  );

  await runTests('checkin-policy.reader integration', [
    test('forStudent returns edu + makeup + rest in one load', async () => {
      const p = await reader.forStudent(student.id);
      assert.strictEqual(p.edu.rewardMode, 'weekly_digest');
      assert.strictEqual(p.edu.ageBand, 'young');
      assert.strictEqual(p.edu.reflectionEnabled, false);
      assert.strictEqual(p.makeup.enabled, true);
      assert.strictEqual(p.makeup.discountPercent, 70);
      assert.deepStrictEqual(p.rest.weeklyRestDays, [1]);
      assert.strictEqual(p.rest.enabled, true);
    }),
  ]);

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
