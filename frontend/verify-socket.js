const axios = require('axios');
const { io } = require("socket.io-client");

async function test() {
    try {
        console.log("Starting Socket Client...");
        const socket = io("http://localhost:5000");

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
        });

        socket.on("food_update", (data) => {
            console.log("EVENT RECEIVED: food_update", data);
            socket.disconnect();
            process.exit(0);
        });

        // Login and Reserve to trigger event
        setTimeout(async () => {
            console.log("Triggering reservation...");
            const adminRes = await axios.post('http://localhost:5000/api/auth/login', { email: 'admin@test.com', password: 'admin123' });
            const adminToken = adminRes.data.token;

            // Ensure food exists (using previous ID if possible, or create new)
            const foodRes = await axios.post('http://localhost:5000/api/food/create', {
                name: "Socket Test Food", quantity: 5, expiry_time: new Date(Date.now() + 10000000).toISOString(), dining_hall: "Socket Hall", allergens: []
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            const foodId = foodRes.data.id;

            const studentRes = await axios.post('http://localhost:5000/api/auth/login', { email: 'student@test.com', password: '123456' });
            const studentToken = studentRes.data.token;

            await axios.post('http://localhost:5000/api/reservation/create', {
                foodId, quantity: 1
            }, { headers: { Authorization: `Bearer ${studentToken}` } });
            console.log("Reservation made.");

        }, 1000);

    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

test();
