const axios = require('axios');

async function test() {
    try {
        // 1. Login Admin & Post Food
        const adminRes = await axios.post('http://localhost:5000/api/auth/login', { email: 'admin@test.com', password: 'admin123' });
        const adminToken = adminRes.data.token;

        // Create unique food
        const foodName = "Game Food " + Date.now();
        const foodRes = await axios.post('http://localhost:5000/api/food/create', {
            name: foodName, quantity: 5, expiry_time: new Date(Date.now() + 10000000).toISOString(), dining_hall: "Game Hall", allergens: []
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        const foodId = foodRes.data.id;

        // 2. Login Student
        const studentRes = await axios.post('http://localhost:5000/api/auth/login', { email: 'student@test.com', password: '123456' });
        const studentToken = studentRes.data.token;
        const initialPoints = studentRes.data.user.points;
        console.log("Initial Points:", initialPoints);

        // 3. Reserve (Should trigger +10 points)
        console.log("Reserving...");
        await axios.post('http://localhost:5000/api/reservation/create', {
            foodId, quantity: 1
        }, { headers: { Authorization: `Bearer ${studentToken}` } });

        // 4. Login again to check points (or we could fetch profile if we had an endpoint)
        // Quickest way is to login again or check leaderboard
        const studentRes2 = await axios.post('http://localhost:5000/api/auth/login', { email: 'student@test.com', password: '123456' });
        const newPoints = studentRes2.data.user.points;
        console.log("New Points:", newPoints);

        if (newPoints === initialPoints + 10) {
            console.log("SUCCESS: Points awarded.");
        } else {
            console.error("FAILURE: Points not awarded correctly.");
        }

        // 5. Check Leaderboard
        console.log("Checking Leaderboard...");
        const lbRes = await axios.get('http://localhost:5000/api/auth/leaderboard');
        const topUser = lbRes.data[0];
        console.log("Top User:", topUser);

        if (lbRes.data.length > 0) {
            console.log("SUCCESS: Leaderboard fetched.");
        }

    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

test();
