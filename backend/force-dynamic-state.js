require('dotenv').config();
const { Food, sequelize } = require('./models');

const injectData = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Create Urgent Items (Expiring in 2 hours) -> Triggers "Flash Sale"
        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        await Food.bulkCreate([
            {
                name: "Test Urgent Sandwich 1",
                quantity: 5,
                expiry_time: twoHoursLater,
                price: 10.00,
                status: "available",
                dining_hall: "Main Hall"
            },
            {
                name: "Test Urgent Salad",
                quantity: 3,
                expiry_time: twoHoursLater,
                price: 8.50,
                status: "available",
                dining_hall: "North Hall"
            }
        ]);
        console.log("✅ Injected 2 Urgent items (Expiring in 2h)");

        // 2. Create Surplus Items (High Quantity) -> Triggers "Donate Surplus" if total > 20
        // We need total > 20 for this trigger, let's add bulk if needed.
        // But for now, the urgent items should trigger the first condition (Flash Sale) which is higher priority.

        console.log("Injection complete. Check Admin Dashboard for 'Flash Sale' suggestion.");
        process.exit(0);
    } catch (error) {
        console.error('Injection failed:', error);
        process.exit(1);
    }
};

injectData();
