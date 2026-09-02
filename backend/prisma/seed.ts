/**
 * Dialect-agnostic seed. Works with DATABASE_PROVIDER=postgres|mysql
 * (or inferred from DATABASE_URL).
 */
import { resolveDatabaseProvider } from "../src/infrastructure/persistence/sql/provider";
import { createSqlClient } from "../src/infrastructure/persistence/sql/create-sql-client";
import { createDialect } from "../src/infrastructure/persistence/sql/dialect";
import { seedTrips } from "../src/infrastructure/persistence/seed-data";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const provider = resolveDatabaseProvider(
  process.env.DATABASE_PROVIDER,
  connectionString,
);
const db = createSqlClient(provider, connectionString, { max: 1 });
const dialect = createDialect(provider);

async function main() {
  console.log(`Seeding with provider=${provider}`);

  for (const { snapshot: t, startLabel, endLabel, coverColor } of seedTrips()) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Upsert trip header.
      const tripUpsert = dialect.upsert(
        "trips",
        "id, title, start_date, end_date, status, currency, cover_color, owner_id",
        "$1,$2,$3,$4,$5,$6,$7,$8",
        "id",
        `title = EXCLUDED.title,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         status = EXCLUDED.status,
         currency = EXCLUDED.currency,
         cover_color = EXCLUDED.cover_color,
         owner_id = EXCLUDED.owner_id`,
      );
      await client.query(tripUpsert, [
        t.id,
        t.title,
        startLabel,
        endLabel,
        t.status,
        t.currency,
        coverColor,
        t.ownerId,
      ]);

      await client.query(`DELETE FROM expenses WHERE trip_id = $1`, [t.id]);
      await client.query(`DELETE FROM stops WHERE trip_id = $1`, [t.id]);
      await client.query(`DELETE FROM trip_days WHERE trip_id = $1`, [t.id]);
      await client.query(`DELETE FROM trip_members WHERE trip_id = $1`, [t.id]);

      for (const [i, m] of t.members.entries()) {
        await client.query(
          `INSERT INTO trip_members
             (id, trip_id, name, short_name, initials, avatar_bg, avatar_fg, image, is_current_user, sort_order, user_id, role, can_invite)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            m.id,
            t.id,
            m.name,
            m.shortName,
            m.initials,
            m.avatarBg,
            m.avatarFg,
            m.image ?? null,
            m.isCurrentUser,
            i,
            m.userId ?? null,
            m.role,
            m.canInvite,
          ],
        );
      }

      for (const d of t.days) {
        await client.query(
          `INSERT INTO trip_days (trip_id, number, date, date_label, city, color)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [t.id, d.number, d.date, d.dateLabel, d.city, d.color],
        );
      }

      for (const [i, s] of t.stops.entries()) {
        await client.query(
          `INSERT INTO stops
             (id, trip_id, day, time, duration, name, area, category, lat, lng, cost, cost_currency, created_by, transit, note, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            s.id,
            t.id,
            s.day,
            s.time,
            s.duration,
            s.name,
            s.area,
            s.category,
            s.lat,
            s.lng,
            s.cost,
            s.costCurrency,
            s.createdBy,
            s.transit,
            s.note,
            i,
          ],
        );
        for (const memberId of s.votes) {
          await client.query(
            `INSERT INTO stop_votes (stop_id, member_id) VALUES ($1,$2)`,
            [s.id, memberId],
          );
        }
        for (const c of s.comments) {
          await client.query(
            `INSERT INTO stop_comments (stop_id, author_id, text, time_label)
             VALUES ($1,$2,$3,$4)`,
            [s.id, c.author, c.text, c.timeLabel],
          );
        }
      }

      for (const [i, e] of t.expenses.entries()) {
        await client.query(
          `INSERT INTO expenses
             (id, trip_id, description, payer_id, amount, currency, category, when_label, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            e.id,
            t.id,
            e.description,
            e.payer,
            e.amount,
            e.currency,
            e.category,
            e.whenLabel,
            i,
          ],
        );
        for (const memberId of e.participants) {
          await client.query(
            `INSERT INTO expense_participants (expense_id, member_id) VALUES ($1,$2)`,
            [e.id, memberId],
          );
        }
      }

      await client.query("COMMIT");
      console.log(`seeded trip ${t.id}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.end();
  });
