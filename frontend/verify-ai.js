const axios = require('axios');

async function test() {
    try {
        // 1. Login Admin
        const adminRes = await axios.post('http://localhost:5000/api/auth/login', { email: 'admin@test.com', password: 'admin123' });
        const adminToken = adminRes.data.token;

        // 2. Login Student
        const studentRes = await axios.post('http://localhost:5000/api/auth/login', { email: 'student@test.com', password: '123456' });
        const studentToken = studentRes.data.token;

        // 3. Test Recommendation
        console.log("Testing Recommendation...");
        const recRes = await axios.get('http://localhost:5000/api/ai/recommend', { headers: { Authorization: `Bearer ${studentToken}` } });
        console.log("Recommendation Type:", recRes.data.type);
        console.log("Recommendation Message:", recRes.data.message);

        if (recRes.data.data) {
            console.log("SUCCESS: Recommendations received.");
        }

        // 4. Test Waste Prediction
        console.log("Testing Waste Prediction...");
        const wasteRes = await axios.get('http://localhost:5000/api/ai/waste-prediction', { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log("Analysis:", wasteRes.data.analysis);
        console.log("Predicted items:", wasteRes.data.atRiskCount);

        if (wasteRes.data.analysis) {
            console.log("SUCCESS: Waste prediction received.");
        }

    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

test();
