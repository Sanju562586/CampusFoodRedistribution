const { sequelize } = require('./models');

async function fixOrphans() {
    try {
        console.log("🔍 Checking for orphan records...");

        // Delete orphan Reservations (userId not in Users)
        const [resultsRes] = await sequelize.query(`
      DELETE FROM "Reservations"
      WHERE "userId" NOT IN (SELECT "id" FROM "Users");
    `);
        console.log(`✅ Deleted orphan reservations.`);

        // Delete orphan Food (donorId not in Users)
        const [resultsFood] = await sequelize.query(`
      DELETE FROM "Food"
      WHERE "donorId" IS NOT NULL AND "donorId" NOT IN (SELECT "id" FROM "Users");
    `);
        console.log(`✅ Deleted orphan food items.`);

    } catch (error) {
        console.error("❌ Error fixing orphans:", error);
    } finally {
        await sequelize.close();
        process.exit();
    }
}

fixOrphans();
