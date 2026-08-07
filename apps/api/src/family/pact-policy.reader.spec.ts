/**
 * PactPolicyReader — batch forStudents.
 */
import assert from 'assert';
import { User } from '../entities/user.entity';
import { FamilySettings } from '../entities/family-settings.entity';
import { ParentStudent } from '../entities/parent-student.entity';
import { UserRole } from '../common/enums';
import { FamilyPolicyReader } from './family-policy.reader';
import { PactPolicyReader } from './pact-policy.reader';
import { createSqliteMemory, runTests, test } from '../test/sqlite-memory';

async function main() {
  const ds = await createSqliteMemory();
  const users = ds.getRepository(User);
  const settings = ds.getRepository(FamilySettings);
  const links = ds.getRepository(ParentStudent);
  const familyPolicy = new FamilyPolicyReader(settings, links, users);
  const reader = new PactPolicyReader(familyPolicy);

  const parent = await users.save(
    users.create({
      username: 'p_pact',
      passwordHash: 'x',
      name: '家长',
      role: UserRole.PARENT,
      pointsBalance: 0,
    }),
  );
  const a = await users.save(
    users.create({
      username: 's_a',
      passwordHash: 'x',
      name: '甲',
      role: UserRole.STUDENT,
      pointsBalance: 0,
    }),
  );
  const b = await users.save(
    users.create({
      username: 's_b',
      passwordHash: 'x',
      name: '乙',
      role: UserRole.STUDENT,
      pointsBalance: 0,
    }),
  );
  await links.save([
    links.create({ parentId: parent.id, studentId: a.id }),
    links.create({ parentId: parent.id, studentId: b.id }),
  ]);
  await settings.save(
    settings.create({
      parentId: parent.id,
      weeklyRestDays: [],
      extraRestDates: [],
      pointsPactEnabled: true,
      pointsPactMaxAmount: 25,
      pointsPactMaxActive: 2,
      pointsPactMaxOverdueExtra: 10,
      pointsPactParentApproveAbove: 20,
    }),
  );

  await runTests('pact-policy.reader integration', [
    test('forStudents returns pointsPact for each child', async () => {
      const map = await reader.forStudents([a.id, b.id]);
      assert.strictEqual(map.size, 2);
      assert.ok(map.get(a.id)!.pointsPactEnabled);
      assert.strictEqual(map.get(b.id)!.pointsPactMaxAmount, 25);
      assert.strictEqual(map.get(a.id)!.pointsPactMaxActive, 2);
    }),
  ]);

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
