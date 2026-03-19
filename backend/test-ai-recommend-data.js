const { Food, User, sequelize } = require("./models");

async function checkData() {
    try {
        await sequelize.authenticate();
        
        const foods = await Food.findAll();
        console.log("Foods:");
        for (const f of foods) {
            console.log(`Food ${f.id}: allergens =`, f.allergens, typeof f.allergens);
            try {
                const parsed = JSON.parse(f.allergens || "[]");
                console.log(`  parsed:`, parsed, Array.isArray(parsed) ? "is array" : "NOT array");
            } catch (e) {
                console.log(`  PARSE ERROR!`, e.message);
            }
        }

        const users = await User.findAll({ where: { role: 'student' } });
        console.log("\nUsers:");
        for (const u of users) {
            console.log(`User ${u.id}: allergens =`, u.allergens, typeof u.allergens, Array.isArray(u.allergens) ? "is array" : "NOT array");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

checkData();
