/**
 * API smoke: auth, today, checkin anti-farm, summary, rest, nudge, redeem path
 */
import 'reflect-metadata';

const base = process.env.API_BASE || 'http://localhost:3000/api';

async function req(path: string, opts: any = {}) {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const body = await res.json();
  if (body.code !== 0) {
    const err: any = new Error(`${path}: ${body.message}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body.data;
}

async function main() {
  const parent = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'parent@demo.com', password: 'demo1234' }),
  });
  const byCode = await req('/auth/login-code', {
    method: 'POST',
    body: JSON.stringify({ code: '102938' }),
  });
  if (byCode.user?.name !== '小明') throw new Error('login-code name mismatch');

  const sh = { Authorization: `Bearer ${byCode.accessToken}` };
  const ph = { Authorization: `Bearer ${parent.accessToken}` };

  await req('/family/settings', {
    method: 'PUT',
    headers: ph,
    body: JSON.stringify({ weeklyRestDays: [], extraRestDates: [] }),
  });

  const today = await req('/my/today', { headers: sh });
  if (typeof today.isRestDay !== 'boolean') throw new Error('today.isRestDay missing');
  const daily = (today.tasks || []).find((t: any) => t.schedule === 'daily');
  if (!daily) throw new Error('no daily task');

  const checkin = await req('/checkins', {
    method: 'POST',
    headers: sh,
    body: JSON.stringify({
      assignId: daily.assignId,
      value: daily.targetValue,
      note: 'smoke daily',
    }),
  });
  if (checkin.confirmStatus === undefined) throw new Error('checkin payload incomplete');
  const firstPoints = checkin.pointsAwarded || 0;

  // Anti-farm: second completion same period must not re-award
  const again = await req('/checkins', {
    method: 'POST',
    headers: sh,
    body: JSON.stringify({
      assignId: daily.assignId,
      value: daily.targetValue,
      note: 'smoke daily again',
    }),
  });
  if ((again.pointsAwarded || 0) !== 0) {
    throw new Error(`anti-farm failed: got ${again.pointsAwarded} points on repeat`);
  }

  // Reject external imageUrl
  let blocked = false;
  try {
    await req('/checkins', {
      method: 'POST',
      headers: sh,
      body: JSON.stringify({
        assignId: daily.assignId,
        value: 1,
        imageUrl: 'https://evil.example/x.png',
      }),
    });
  } catch {
    blocked = true;
  }
  if (!blocked) throw new Error('imageUrl allowlist failed');

  // --- Security verify P1 ---
  let weakRegBlocked = false;
  try {
    await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: `weak_${Date.now()}`,
        password: '12345',
        name: '弱密',
      }),
    });
  } catch {
    weakRegBlocked = true;
  }
  if (!weakRegBlocked) throw new Error('register password <6 should fail');

  const uploadOrigin = base.replace(/\/api\/?$/, '');
  const bareUpload = await fetch(`${uploadOrigin}/uploads/smoke-missing.jpg`);
  if (bareUpload.status !== 401) {
    throw new Error(`unsigned /uploads should be 401, got ${bareUpload.status}`);
  }

  await req('/family/settings', {
    method: 'PUT',
    headers: ph,
    body: JSON.stringify({ allowanceLedgerEnabled: true }),
  });
  let evilCoverBlocked = false;
  try {
    await req('/allowance/goals', {
      method: 'POST',
      headers: sh,
      body: JSON.stringify({
        title: 'smoke evil cover',
        targetCents: 1000,
        coverUrl: 'https://evil.example/cover.png',
      }),
    });
  } catch {
    evilCoverBlocked = true;
  }
  if (!evilCoverBlocked) throw new Error('allowance coverUrl external should fail');

  const fakePng = new Blob([Buffer.from('not-a-real-png')], { type: 'image/png' });
  const fd = new FormData();
  fd.append('file', fakePng, 'fake.png');
  const magicRes = await fetch(`${base}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${byCode.accessToken}` },
    body: fd,
  });
  const magicBody: any = await magicRes.json().catch(() => ({}));
  if (magicRes.ok && magicBody?.code === 0) {
    throw new Error('fake png upload should be rejected by magic check');
  }

  const summary = await req('/dashboard/summary', { headers: ph });
  if (!summary.headline) throw new Error('summary.headline missing');
  if (/还没做|拖欠|驳回/.test(summary.headline)) {
    throw new Error('summary headline still confrontational');
  }

  const students = await req('/students', { headers: ph });
  const xiaoming = students.find((s: any) => s.name === '小明');
  if (!xiaoming) throw new Error('student 小明 missing');
  const nudge = await req(`/students/${xiaoming.id}/nudge`, {
    method: 'POST',
    headers: ph,
    body: JSON.stringify({ message: '加油，下一件很快就好' }),
  });
  // Idempotent: prior smoke may still be in 30m cooldown
  if (nudge.ok) {
    const nudgeAgain = await req(`/students/${xiaoming.id}/nudge`, {
      method: 'POST',
      headers: ph,
      body: JSON.stringify({}),
    });
    if (nudgeAgain.ok !== false || !nudgeAgain.waitMin) {
      throw new Error('nudge rate limit not enforced');
    }
  } else if (!nudge.waitMin) {
    throw new Error('nudge failed');
  }

  const wishes = await req('/wishes', { headers: sh });
  const cheap = (wishes || []).find((w: any) => w.costPoints <= 50);
  if (cheap) {
    const before = await req('/points', { headers: sh });
    if (before.balance >= cheap.costPoints) {
      await req(`/wishes/${cheap.id}/redeem`, { method: 'POST', headers: sh });
      const myRedeems = await req('/my/redeems', { headers: sh });
      if (!myRedeems?.length) throw new Error('my/redeems empty after redeem');
      const redeems = await req('/redeems', { headers: ph });
      const pending = (redeems || []).find(
        (r: any) => r.status === 'pending' && r.wishId === cheap.id,
      );
      if (!pending) throw new Error('redeem pending missing');
      if (!pending.costPoints) throw new Error('redeem costPoints snapshot missing');
      await req(`/redeems/${pending.id}/review`, {
        method: 'POST',
        headers: ph,
        body: JSON.stringify({ action: 'approve' }),
      });
    }
  }

  const points = await req('/points', { headers: sh });
  if (!points.rulesHint) throw new Error('points.rulesHint missing');

  const weekly = await req('/reports/weekly', { headers: ph });
  if (!weekly.headline) throw new Error('weekly.headline missing');
  if (!weekly.range?.from || !weekly.daily?.length) {
    throw new Error('weekly.daily/range incomplete');
  }
  if (!weekly.points || weekly.completion?.rate === undefined) {
    throw new Error('weekly.points/completion missing');
  }

  const vapid = await req('/push/vapid-public-key');
  if (typeof vapid.enabled !== 'boolean') throw new Error('vapid payload bad');

  // Dual-parent invite
  const mom = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: `mom_${Date.now()}`,
      password: 'demo1234',
      name: '妈妈',
    }),
  });
  const mh = { Authorization: `Bearer ${mom.accessToken}` };
  const invite = await req('/family/invites', { method: 'POST', headers: ph });
  if (!invite.code) throw new Error('invite code missing');
  const selfTry = await req('/family/invites/accept', {
    method: 'POST',
    headers: ph,
    body: JSON.stringify({ code: invite.code }),
  });
  if (selfTry.ok !== false) throw new Error('self-accept should soft-fail');
  const joined = await req('/family/invites/accept', {
    method: 'POST',
    headers: mh,
    body: JSON.stringify({ code: invite.code }),
  });
  if (!joined.ok) throw new Error('accept invite failed');
  const momStudents = await req('/students', { headers: mh });
  if (!momStudents.find((s: any) => s.name === '小明')) {
    throw new Error('co-parent did not receive shared students');
  }

  // --- Makeup gate + points pact (requires API + demo seed) ---
  const settingsOff = await req('/family/settings', {
    method: 'PUT',
    headers: ph,
    body: JSON.stringify({ makeupEnabled: false }),
  });
  if (settingsOff.makeupEnabled !== false) {
    throw new Error('settings PUT makeupEnabled not reflected');
  }
  const todayOff = await req('/my/today', { headers: sh });
  const leaked = (todayOff.tasks || []).filter((t: any) => t.canMakeup);
  if (leaked.length) {
    throw new Error('makeupEnabled=false still shows canMakeup');
  }
  if (todayOff.makeupEnabled !== false) {
    throw new Error('today.makeupEnabled should be false');
  }
  await req('/family/settings', {
    method: 'PUT',
    headers: ph,
    body: JSON.stringify({ makeupEnabled: true }),
  });

  // Pact disabled → 403-style business error
  await req('/family/settings', {
    method: 'PUT',
    headers: ph,
    body: JSON.stringify({ pointsPactEnabled: false }),
  });
  let pactBlocked = false;
  try {
    await req('/pacts', {
      method: 'POST',
      headers: sh,
      body: JSON.stringify({
        lenderId: 1,
        amountPoints: 5,
        dueDate: new Date().toISOString().slice(0, 10),
        note: 'smoke',
      }),
    });
  } catch {
    pactBlocked = true;
  }
  if (!pactBlocked) throw new Error('pact create should fail when disabled');

  const settingsOn = await req('/family/settings', {
    method: 'PUT',
    headers: ph,
    body: JSON.stringify({
      pointsPactEnabled: true,
      pointsPactMaxAmount: 50,
      pointsPactParentApproveAbove: 0,
    }),
  });
  if (!settingsOn.pointsPactEnabled) {
    throw new Error('settings PUT pointsPactEnabled not reflected');
  }
  const pactsMe = await req('/pacts/me', { headers: sh });
  if (!pactsMe.enabled) throw new Error('pacts/me.enabled should be true');

  // Idempotent cleanup: repay leftover active pacts so lender balance is restored
  const openPacts = (pactsMe.items || []).filter(
    (p: any) => p.status === 'active' || p.status === 'pending' || p.status === 'parent_pending',
  );
  for (const p of openPacts) {
    if (p.status === 'active') {
      await req(`/pacts/${p.id}/parent-repay`, { method: 'POST', headers: ph });
    } else {
      await req(`/pacts/${p.id}/parent-cancel`, { method: 'POST', headers: ph });
    }
  }

  const hong = await req('/auth/login-code', {
    method: 'POST',
    body: JSON.stringify({ code: '203847' }),
  });
  const hh = { Authorization: `Bearer ${hong.accessToken}` };
  const siblings = await req('/pacts/siblings', { headers: sh });
  const lender = (siblings.siblings || []).find((s: any) => s.name === '小红');
  if (!lender) throw new Error('sibling 小红 missing for pact smoke');

  // Ensure lender has points (sibling list includes balance)
  if ((lender.pointsBalance || 0) < 5) {
    throw new Error('sibling 小红 needs >=5 points for pact smoke (re-seed or award)');
  }

  const due = new Date();
  due.setDate(due.getDate() + 3);
  const dueDate = due.toISOString().slice(0, 10);
  const created = await req('/pacts', {
    method: 'POST',
    headers: sh,
    body: JSON.stringify({
      lenderId: lender.id,
      amountPoints: 5,
      dueDate,
      note: 'smoke pact',
    }),
  });
  if (!created?.id) throw new Error('pact create missing id');
  await req(`/pacts/${created.id}/accept`, { method: 'POST', headers: hh });
  // Leave DB clean for next smoke run
  await req(`/pacts/${created.id}/parent-repay`, { method: 'POST', headers: ph });

  // --- S1: monitor lite/full + autoConfirm settings ---
  const monFull = await req('/dashboard/monitor', { headers: ph });
  if (!Array.isArray(monFull.children)) {
    throw new Error('monitor.children missing');
  }
  const monLite = await req('/dashboard/monitor?lite=1', { headers: ph });
  if (!Array.isArray(monLite.children)) {
    throw new Error('monitor lite children missing');
  }
  if (monLite.lite !== true) {
    throw new Error('monitor lite flag missing');
  }

  // ETag / 304：同 revision 二次请求应 304
  const monRes = await fetch(`${base}/dashboard/monitor?lite=1`, {
    headers: ph,
  });
  const etag = monRes.headers.get('etag');
  if (!etag) throw new Error('monitor missing ETag');
  const mon304 = await fetch(`${base}/dashboard/monitor?lite=1`, {
    headers: { ...ph, 'If-None-Match': etag },
  });
  if (mon304.status !== 304) {
    throw new Error(`monitor ETag expected 304 got ${mon304.status}`);
  }

  const weekendBatch = await req('/students/weekend-reviews', { headers: ph });
  if (!Array.isArray(weekendBatch)) {
    throw new Error('weekend-reviews should be array');
  }
  if (weekendBatch.length !== monFull.children.length) {
    throw new Error(
      `weekend-reviews length ${weekendBatch.length} != children ${monFull.children.length}`,
    );
  }

  const pendingList = monFull.pendingConfirms || [];
  if (pendingList.length) {
    const batchIds = pendingList
      .filter((c: any) => !c.isMakeup)
      .slice(0, 3)
      .map((c: any) => c.id);
    if (batchIds.length) {
      const batch = await req('/checkins/confirm-batch', {
        method: 'POST',
        headers: ph,
        body: JSON.stringify({
          ids: batchIds,
          action: 'approve',
          liked: true,
          note: 'smoke batch',
          skipMakeup: true,
        }),
      });
      if (typeof batch.okCount !== 'number') {
        throw new Error('confirm-batch okCount missing');
      }
    }
  }

  const autoOff = await req('/family/settings', {
    method: 'PUT',
    headers: ph,
    body: JSON.stringify({
      autoConfirmPendingEnabled: false,
      autoConfirmPendingTime: '22:00',
    }),
  });
  if (autoOff.autoConfirmPendingEnabled !== false) {
    throw new Error('autoConfirmPendingEnabled should be false');
  }
  if (autoOff.autoConfirmPendingTime !== '22:00') {
    throw new Error(`autoConfirmPendingTime expected 22:00 got ${autoOff.autoConfirmPendingTime}`);
  }
  // leave default-off for next runs
  await req('/family/settings', {
    method: 'PUT',
    headers: ph,
    body: JSON.stringify({
      autoConfirmPendingEnabled: false,
      autoConfirmPendingTime: '23:30',
    }),
  });

  console.log('SMOKE_OK', {
    loginCode: byCode.user.name,
    headline: summary.headline,
    weeklyHeadline: weekly.headline,
    weeklyDays: weekly.daily.length,
    isRestDay: today.isRestDay,
    firstPoints,
    againPoints: again.pointsAwarded || 0,
    nudge: nudge.message,
    points: points.balance,
    invite: invite.code,
    coParentStudents: momStudents.length,
    pactId: created.id,
    makeupRestored: true,
    pactCleaned: true,
    monitorChildren: monFull.children.length,
    monitorLiteChildren: monLite.children.length,
    weekendReviews: weekendBatch.length,
    pendingAtSmoke: pendingList.length,
    autoConfirmTime: autoOff.autoConfirmPendingTime,
  });
}

main().catch((e) => {
  console.error('SMOKE_FAIL', e.message);
  process.exit(1);
});
