const axios = require('axios');

async function test() {
    try {
        // 1. Login Admin & Post Food
        const adminRes = await axios.post('http://localhost:5000/api/auth/login', { email: 'admin@test.com', password: 'admin123' });
        const adminToken = adminRes.data.token;

        // Create unique food to reserve
        const foodName = "Res Test Food " + Date.now();
        const foodRes = await axios.post('http://localhost:5000/api/food/create', {
            name: foodName, quantity: 10, expiry_time: new Date(Date.now() + 10000000).toISOString(), dining_hall: "Res Hall", allergens: []
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        const foodId = foodRes.data.id;
        console.log("Created food:", foodId);

        // 2. Login Student
        const studentRes = await axios.post('http://localhost:5000/api/auth/login', { email: 'student@test.com', password: '123456' });
        const studentToken = studentRes.data.token;

        // 3. Reserve
        console.log("Reserving...");
        const resRes = await axios.post('http://localhost:5000/api/reservation/create', {
            foodId, quantity: 2
        }, { headers: { Authorization: `Bearer ${studentToken}` } });
        console.log("Reserved:", resRes.data.message);

        // 4. Check My Reservations
        console.log("Checking reservations...");
        const myRes = await axios.get('http://localhost:5000/api/reservation/my', { headers: { Authorization: `Bearer ${studentToken}` } });
        const savedRes = myRes.data.find(r => r.foodId === foodId);

        if (savedRes && savedRes.quantity === 2) {
            console.log("SUCCESS: Reservation found.");
        } else {
            console.error("FAILURE: Reservation not found.");
        }

        // 5. Check Food Quantity (should be 8)
        const listRes = await axios.get('http://localhost:5000/api/food/available', { headers: { Authorization: `Bearer ${studentToken}` } });
        const foodItem = listRes.data.find(f => f.id === foodId);
        if (foodItem && foodItem.quantity === 8) {
            console.log("SUCCESS: Quantity decremented.");
        } else {
            console.error("FAILURE: Quantity mismatch.", foodItem?.quantity);
        }

    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

test();
