const { Food, User, sequelize } = require("./models");
const { Op } = require("sequelize");

async function testRecommend() {
    try {
        await sequelize.authenticate();
        console.log("Connected to DB");

        const user = await User.findOne({ where: { role: 'student' } });
        if (!user) {
            console.log("No student found");
            return;
        }

        const preferences = {
            diet: user.dietary_preferences,
            allergens: user.allergens || []
        };
        console.log("Preferences:", preferences);

        const availableFood = await Food.findAll({
            where: { quantity: { [Op.gt]: 0 }, expiry_time: { [Op.gt]: new Date() } },
            include: [{ model: User, as: 'donor', attributes: ['name', 'location'] }]
        });
        console.log("Available Food count:", availableFood.length);

        if (availableFood.length === 0) {
            console.log("No food available right now.");
            return;
        }

        const safeFood = availableFood.filter(food => {
            const foodAllergens = JSON.parse(food.allergens || "[]");
            const hasAllergen = foodAllergens.some(a => preferences.allergens.includes(a));
            return !hasAllergen;
        });

        console.log("Safe food count:", safeFood.length);
        console.log("Test passed through JSON.parse without errors");

    } catch (err) {
        console.error("Caught expected error:");
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

testRecommend();
