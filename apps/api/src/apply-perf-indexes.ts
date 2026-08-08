/** One-shot: apply PERF 0039/0040 indexes when full migration chain is dirty (dev sqlite). */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function main() {
  const ds = new DataSource({
    type: 'sqlite',
    database: process.env.DB_SQLITE_PATH || 'data/study.sqlite',
    entities: [],
    synchronize: false,
  });
  await ds.initialize();
  await ds.query(
    `CREATE INDEX IF NOT EXISTS IDX_checkins_student_created ON checkins(student_id, created_at)`,
  );
  await ds.query(
    `CREATE INDEX IF NOT EXISTS IDX_checkins_student_confirm_created ON checkins(student_id, confirm_status, created_at)`,
  );
  await ds.query(
    `CREATE INDEX IF NOT EXISTS IDX_task_assigns_student ON task_assigns(student_id)`,
  );
  await ds.query(
    `CREATE INDEX IF NOT EXISTS IDX_wish_redeems_student_status_created ON wish_redeems(student_id, status, created_at)`,
  );
  await ds.query(
    `CREATE INDEX IF NOT EXISTS IDX_task_assigns_student_status ON task_assigns(student_id, status)`,
  );
  await ds.query(
    `CREATE INDEX IF NOT EXISTS IDX_plan_items_plan_planned ON plan_items(plan_id, planned_date)`,
  );
  await ds.query(
    `CREATE INDEX IF NOT EXISTS IDX_journal_posts_author_status_id ON journal_posts(author_id, status, id)`,
  );
  await ds.query(
    `CREATE INDEX IF NOT EXISTS IDX_journal_comments_post_status_id ON journal_comments(post_id, status, id)`,
  );
  await ds.query(
    `CREATE INDEX IF NOT EXISTS IDX_point_ledgers_student_created ON point_ledgers(student_id, created_at)`,
  );
  await ds.query(
    `CREATE INDEX IF NOT EXISTS IDX_wish_items_student_id ON wish_items(student_id)`,
  );
  await ds.query(
    `CREATE INDEX IF NOT EXISTS IDX_point_gifts_from_status_accepted ON point_gifts(from_student_id, status, accepted_at)`,
  );
  console.log('PERF indexes applied (IF NOT EXISTS)');
  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
