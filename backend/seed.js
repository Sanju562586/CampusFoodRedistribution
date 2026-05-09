/**
 * seed.js — Campus Food Redistribution Seed Script
 *
 * Use this file to seed initial data for development/testing.
 * Fill in the USERS and FOOD_ITEMS arrays below, then run:
 *
 *   node seed.js
 *
 * ⚠️  Do NOT commit real credentials or production data here.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { sequelize, User, Food } = require("./models");

// ── Add users to seed ──────────────────────────────────────────────────────
// Example shape:
// {
//   email: "someone@example.com",
//   password: "PlainTextPassword",   ← will be hashed automatically
//   name: "Full Name",
//   college: "College Name",
//   roll_number: "ROLLNO",
//   location: "City, State",
//   dietary_preferences: "Veg",      ← "Veg" | "Non-Veg" | "Vegan"
//   allergens: [],
//   role: "student",                 ← "student" | "donor" | "admin"
//   points: 0,
// }
const USERS = [
  // Add user objects here
];

// ── Add food items to seed ─────────────────────────────────────────────────
// Example shape:
// {
//   name: "Item Name",
//   quantity: 10,
//   expiry_time: new Date(Date.now() + 4 * 60 * 60 * 1000),  ← 4 hours from now
//   dining_hall: "Venue Name, Area",
//   location: "Area, City",
//   allergens: ["gluten"],
//   price: 50,
//   landmark: "Near XYZ",
//   latitude: 17.0000,
//   longitude: 78.0000,
//   status: "available",
//   donorEmail: "donor@example.com",  ← must match a USERS entry above
// }
const FOOD_ITEMS = [
  // Add food item objects here
];

// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  if (USERS.length === 0 && FOOD_ITEMS.length === 0) {
    console.log("ℹ️  Nothing to seed — USERS and FOOD_ITEMS arrays are empty.");
    console.log("   Add entries to seed.js, then re-run: node seed.js");
    process.exit(0);
  }

  try {
    console.log("🌱 Syncing database...\n");
    await sequelize.sync({ alter: true });

    // ── Upsert users ────────────────────────────────────────────────────────
    const userMap = {}; // email → User instance
    for (const u of USERS) {
      let user = await User.findOne({ where: { email: u.email } });
      if (!user) {
        user = await User.create({
          ...u,
          password: await bcrypt.hash(u.password, 10),
          allergens: JSON.stringify(u.allergens || []),
        });
        console.log(`✅ Created user: ${u.email} (${u.role})`);
      } else {
        console.log(`ℹ️  User already exists: ${u.email}`);
      }
      userMap[u.email] = user;
    }

    // ── Upsert food items ───────────────────────────────────────────────────
    let createdCount = 0;
    for (const item of FOOD_ITEMS) {
      const donor = userMap[item.donorEmail];
      if (!donor) {
        console.warn(`⚠️  Skipping "${item.name}" — donorEmail "${item.donorEmail}" not found in USERS.`);
        continue;
      }

      const { donorEmail, ...foodData } = item;
      const existing = await Food.findOne({ where: { name: foodData.name } });

      if (!existing) {
        await Food.create({
          ...foodData,
          donorId: donor.id,
          allergens: JSON.stringify(foodData.allergens || []),
        });
        createdCount++;
        console.log(`  🍱 Created: ${foodData.name} @ ${foodData.location}`);
      } else {
        existing.expiry_time = foodData.expiry_time;
        existing.quantity    = foodData.quantity;
        await existing.save();
        console.log(`  🔄 Refreshed: ${foodData.name}`);
      }
    }

    console.log(`\n✅ Seed complete!`);
    console.log(`   Users processed     : ${USERS.length}`);
    console.log(`   Food items created  : ${createdCount} / ${FOOD_ITEMS.length}`);

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

seed();
