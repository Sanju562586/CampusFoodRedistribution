/**
 * Marks all already-applied migrations as done in SequelizeMeta,
 * then adds the google_id / avatar_url columns if missing.
 * Run once with: node scripts/fix-migrations.js
 */
require("dotenv").config();
const { Sequelize } = require("sequelize");

const already = [
  "20260131075206-add-points-to-user.js",
  "20260131082102-add-profile-fields-to-user.js",
  "20260131154000-multi-role-schema-update.js",
  "20260209-add-verification-fields.js",
  "20260209-cleanup-users-verification.js",
  "20260209-create-pending-users.js",
  "20260209-remove-mobile-number.js",
  "20260213063403-update-user-unique-constraint.js",
  "20260213064447-add-landmark-to-food.js",
  "20260213120000-add-price-to-food.js",
  "20260419200000-add-coordinates-to-food.js",
];

(async () => {
  const s = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  });

  await s.authenticate();
  console.log("✅ Connected to Neon DB");

  // 1. Mark old migrations as already applied
  for (const name of already) {
    await s.query(
      `INSERT INTO "SequelizeMeta"(name) VALUES (:name) ON CONFLICT DO NOTHING`,
      { replacements: { name } }
    );
    console.log("  marked:", name);
  }

  // 2. Add google_id column if missing
  const [cols] = await s.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='Users' AND column_name='google_id'`
  );
  if (cols.length === 0) {
    await s.query(`ALTER TABLE "Users" ADD COLUMN google_id VARCHAR(255) UNIQUE`);
    console.log("✅ Added google_id column");
  } else {
    console.log("  google_id already exists — skipped");
  }

  // 3. Add avatar_url column if missing
  const [cols2] = await s.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='Users' AND column_name='avatar_url'`
  );
  if (cols2.length === 0) {
    await s.query(`ALTER TABLE "Users" ADD COLUMN avatar_url VARCHAR(255)`);
    console.log("✅ Added avatar_url column");
  } else {
    console.log("  avatar_url already exists — skipped");
  }

  // 4. Mark the new google-oauth migration as done too
  await s.query(
    `INSERT INTO "SequelizeMeta"(name) VALUES (:name) ON CONFLICT DO NOTHING`,
    { replacements: { name: "20260816000000-add-google-oauth-to-users.js" } }
  );
  console.log("  marked: 20260816000000-add-google-oauth-to-users.js");

  await s.close();
  console.log("\n🎉 Done — Google OAuth columns are ready.");
})().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
