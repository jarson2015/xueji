/**
 * FamilyPolicyReader integration — dual-parent merge + batch rest keys.
 * Run via: npm run test:unit
 */
import assert from 'assert';
import { User } from '../entities/user.entity';
import { FamilySettings } from '../entities/family-settings.entity';
import { ParentStudent } from '../entities/parent-student.entity';
import { UserRole } from '../common/enums';
import { FamilyPolicyReader } from './family-policy.reader';
import { createSqliteMemory, runTests, test } from '../test/sqlite-memory';

async function main() {
  const ds = await createSqliteMemory();
  const users = ds.getRepository(User);
  const settings = ds.getRepository(FamilySettings);
  const links = ds.getRepository(ParentStudent);
  const reader = new FamilyPolicyReader(settings, links, users);

  const dad = await users.save(
    users.create({
      username: 'dad_pol',
      passwordHash: 'x',
      name: '爸',
      role: UserRole.PARENT,
      pointsBalance: 0,
    }),
  );
  const mom = await users.save(
    users.create({
      username: 'mom_pol',
      passwordHash: 'x',
      name: '妈',
      role: UserRole.PARENT,
      pointsBalance: 0,
    }),
  );
  const kid = await users.save(
    users.create({
      username: 'kid_pol',
      passwordHash: 'x',
      name: '娃',
      role: UserRole.STUDENT,
      pointsBalance: 0,
    }),
  );
  await links.save([
    links.create({ parentId: dad.id, studentId: kid.id }),
    links.create({ parentId: mom.id, studentId: kid.id }),
  ]);
  await settings.save(
    settings.create({
      parentId: dad.id,
      weeklyRestDays: [0],
      extraRestDates: [],
      restDaysEnabled: true,
      restPauseAll: false,
      restPauseCategories: ['study'],
      makeupEnabled: true,
      makeupDiscountPercent: 50,
      makeupWindowDays: 5,
      rewardMode: 'always',
      pointsPactEnabled: false,
      pointsPactMaxAmount: 40,
    }),
  );
  await settings.save(
    settings.create({
      parentId: mom.id,
      weeklyRestDays: [6],
      extraRestDates: ['2099-01-01'],
      restDaysEnabled: true,
      restPauseCategories: ['study', 'chore'],
      makeupEnabled: false,
      makeupDiscountPercent: 80,
      makeupWindowDays: 10,
      rewardMode: 'weekly_digest',
      pointsPactEnabled: true,
      pointsPactMaxAmount: 30,
      pointsPactParentApproveAbove: 15,
    }),
  );

  await runTests('family-policy.reader integration', [
    test('loadForStudents merges dual-parent rules', async () => {
      const map = await reader.loadForStudents([kid.id]);
      const b = map.get(kid.id)!;
      assert.ok(b.makeup.enabled, 'makeup OR of parents');
      assert.strictEqual(b.makeup.discountPercent, 50, 'min discount');
      assert.strictEqual(b.makeup.windowDays, 10, 'max window');
      assert.deepStrictEqual(b.rest.weeklyRestDays, [0, 6]);
      assert.ok(b.rest.enabled);
      assert.ok(b.rest.extraRestDates.includes('2099-01-01'));
      assert.ok(b.rest.pauseCategories.includes('chore'));
      assert.strictEqual(b.edu.rewardMode, 'weekly_digest');
      assert.ok(b.pointsPact.pointsPactEnabled);
      assert.strictEqual(b.pointsPact.pointsPactMaxAmount, 30);
    }),
    test('batchRestDayKeys uses preloaded policies (no extra DB)', async () => {
      const policies = await reader.loadForStudents([kid.id]);
      const keys = reader.batchRestDayKeys(policies, [kid.id], [
        '2099-01-01',
        '2099-01-02',
      ]);
      assert.strictEqual(keys.get(kid.id)!.get('2099-01-01'), true);
      assert.strictEqual(keys.get(kid.id)!.get('2099-01-02'), false);
    }),
  ]);

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
