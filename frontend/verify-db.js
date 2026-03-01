const axios = require('axios');

async function test() {
    try {
        // 1. Login Admin
        console.log("Logging in Admin...");
        const adminRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@test.com',
            password: 'admin123'
        });
        const adminToken = adminRes.data.token;
        console.log("Admin Logged in.");

        // 2. Post Food
        console.log("Posting food...");
        const foodData = {
            name: "DB Test Food",
            quantity: 5,
            expiry_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            dining_hall: "DB Hall",
            allergens: ["gluten"]
        };

        const createRes = await axios.post('http://localhost:5000/api/food/create', foodData, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log("Food posted ID:", createRes.data.id);

        // 3. Login Student
        console.log("Logging in Student...");
        const studentRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'student@test.com',
            password: '123456'
        });
        const studentToken = studentRes.data.token;

        // 4. Get Available Food
        console.log("Fetching available food...");
        const listRes = await axios.get('http://localhost:5000/api/food/available', {
            headers: { Authorization: `Bearer ${studentToken}` }
        });

        const found = listRes.data.find(f => f.name === "DB Test Food");
        if (found) {
            console.log("SUCCESS: Food found in DB listing.");
            console.log("Allergens:", found.allergens);
        } else {
            console.error("FAILURE: Food not found.");
        }

    } catch (err) {
        console.error("Error:");
        if (err.response) {
            console.error(err.response.data);
        } else {
            console.error(err.message);
        }
    }
}

test();
