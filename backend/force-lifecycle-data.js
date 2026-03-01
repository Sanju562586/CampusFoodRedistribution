require('dotenv').config();
const { Food, Reservation, sequelize } = require('./models');

const injectLifecycleData = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // 1. Create EXPIRED Food (Should show up in 'Unclaimed / Waste')
        await Food.create({
            name: "Expired Sushi",
            quantity: 5,
            expiry_time: yesterday, // Expired
            price: 15.00,
            status: "available", // Technically available but expired
            dining_hall: "East Hall"
        });
        console.log("✅ Injected 5 Expired items");

        // 2. Create PICKED UP Reservation (Should show up in 'Successfully Rescued')
        // First need a food item
        const rescuedFood = await Food.create({
            name: "Rescued Pizza",
            quantity: 0, // Consumed? Or maybe we keep it? 
            // The logic says 'savedQuantity' is sum of Reservation quantity with status 'picked_up'.
            // It doesn't depend on Food quantity remaining.
            expiry_time: tomorrow,
            price: 5.00,
            status: "unavailable",
            dining_hall: "West Hall"
        });

        await Reservation.create({
            userId: 1, // specific user or random
            foodId: rescuedFood.id,
            quantity: 10,
            status: 'picked_up',
            reservation_code: 'TEST-RESCUE'
        });
        console.log("✅ Injected 10 Picked Up items (via Reservation)");

        process.exit(0);
    } catch (error) {
        console.error('Injection failed:', error);
        process.exit(1);
    }
};

injectLifecycleData();
