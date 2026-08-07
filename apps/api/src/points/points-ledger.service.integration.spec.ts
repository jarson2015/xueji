/**
 * PointsLedgerService integration — credit/debit/transfer + digest settle idempotent.
 */
import assert from 'assert';
import { User } from '../entities/user.entity';
import { PointLedger } from '../entities/point-ledger.entity';
import { PointReason, UserRole } from '../common/enums';
import { PointsLedgerService } from './points-ledger.service';
import { createSqliteMemory, runTests, test } from '../test/sqlite-memory';

async function main() {
  const ds = await createSqliteMemory();
  const users = ds.getRepository(User);
  const ledger = new PointsLedgerService(ds);

  const alice = await users.save(
    users.create({
      username: 'alice_led',
      passwordHash: 'x',
      name: 'Alice',
      role: UserRole.STUDENT,
      pointsBalance: 20,
    }),
  );
  const bob = await users.save(
    users.create({
      username: 'bob_led',
      passwordHash: 'x',
      name: 'Bob',
      role: UserRole.STUDENT,
      pointsBalance: 5,
    }),
  );

  await runTests('points-ledger.service integration', [
    test('credit and debit conserve balance', async () => {
      await ds.transaction(async (m) => {
        await ledger.credit(m, {
          studentId: alice.id,
          amount: 10,
          reason: PointReason.CHECKIN,
          note: 'test credit',
        });
        await ledger.debit(m, {
          studentId: alice.id,
          amount: 5,
          reason: PointReason.REDEEM,
          enforceBalance: true,
        });
      });
      const u = await users.findOneByOrFail({ id: alice.id });
      assert.strictEqual(u.pointsBalance, 25);
    }),
    test('transfer moves points between students', async () => {
      await ds.transaction(async (m) => {
        await ledger.transfer(m, {
          fromId: alice.id,
          toId: bob.id,
          amount: 8,
          reasonOut: PointReason.PACT_OUT,
          reasonIn: PointReason.PACT_IN,
          noteOut: 'lend',
          noteIn: 'borrow',
          enforceBalance: true,
        });
      });
      const a = await users.findOneByOrFail({ id: alice.id });
      const b = await users.findOneByOrFail({ id: bob.id });
      assert.strictEqual(a.pointsBalance, 17);
      assert.strictEqual(b.pointsBalance, 13);
    }),
    test('settleWeeklyDigest is idempotent', async () => {
      await ds.transaction(async (m) => {
        await ledger.recordPendingDigest(m, bob.id, 7, 101, '阅读');
        await ledger.recordPendingDigest(m, bob.id, 3, 102, '家务');
      });
      const first = await ledger.settleWeeklyDigest(bob.id);
      assert.strictEqual(first.settled, 2);
      assert.strictEqual(first.points, 10);
      const after = await users.findOneByOrFail({ id: bob.id });
      assert.strictEqual(after.pointsBalance, 23);
      const second = await ledger.settleWeeklyDigest(bob.id);
      assert.strictEqual(second.settled, 0);
      assert.strictEqual(second.points, 0);
      const again = await users.findOneByOrFail({ id: bob.id });
      assert.strictEqual(again.pointsBalance, 23);
    }),
  ]);

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
