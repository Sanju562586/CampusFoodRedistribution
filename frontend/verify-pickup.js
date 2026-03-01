const axios = require('axios');

async function test() {
    try {
        // 1. Login Admin & Post Food
        console.log("Logging in as Admin...");
        const adminRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'sanjaykumardupati6@gmail.com',
            password: 'SanjayKumar612'
        });
        const adminToken = adminRes.data.token;
        console.log("Admin logged in.");

        // Create unique food to reserve
        const foodName = "Pickup Test Food " + Date.now();
        const foodRes = await axios.post('http://localhost:5000/api/food/create', {
            name: foodName, quantity: 5, expiry_time: new Date(Date.now() + 10000000).toISOString(), dining_hall: "Pickup Hall", allergens: []
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        const foodId = foodRes.data.id;
        console.log("Created food:", foodId);

        // 2. Register & Login Student
        const studentEmail = `student_${Date.now()}@test.com`;
        const studentPassword = '123456';

        try {
            await axios.post('http://localhost:5000/api/auth/register', {
                email: studentEmail,
                password: studentPassword,
                name: "Test Student",
                college: "Engineering",
                roll_number: "12345",
                location: "Hostel A",
                role: "student"
            });
            console.log("Registered new student:", studentEmail);
        } catch (e) {
            console.log("Student registration skipped (might exist)");
        }

        const studentRes = await axios.post('http://localhost:5000/api/auth/login', { email: studentEmail, password: studentPassword });
        const studentToken = studentRes.data.token;

        // 3. Reserve
        console.log("Reserving...");
        const resRes = await axios.post('http://localhost:5000/api/reservation/create', {
            foodId, quantity: 1
        }, { headers: { Authorization: `Bearer ${studentToken}` } });
        const code = resRes.data.reservation.reservation_code;
        const qrUrl = resRes.data.qrCodeUrl;
        console.log("Reserved. Code:", code);
        console.log("QR URL Present:", !!qrUrl);

        // 4. Admin Verify Pickup
        console.log("Verifying Pickup...");
        const pickupRes = await axios.post('http://localhost:5000/api/reservation/pickup', {
            reservation_code: code
        }, { headers: { Authorization: `Bearer ${adminToken}` } });

        console.log("Pickup Result:", pickupRes.data.message);

        if (pickupRes.data.message === "Pickup confirmed") {
            console.log("SUCCESS: Pickup flow working.");
            console.log("Reservation Details:", JSON.stringify(pickupRes.data.reservation, null, 2));
        } else {
            console.error("FAILURE: Pickup failed.");
        }

    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

test();
