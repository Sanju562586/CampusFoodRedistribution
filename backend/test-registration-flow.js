const axios = require('axios');

const API_URL = 'http://localhost:5000/api/auth';

async function testRegistrationFlow() {
    const email = `testuser_${Date.now()}@example.com`;
    const password = 'password123';
    const mobileNumber = '1234567890';

    console.log(`Starting registration test for ${email}...`);

    try {
        // 1. Register
        console.log('1. Registering user...');
        const registerRes = await axios.post(`${API_URL}/register`, {
            email,
            password,
            name: 'Test User',
            role: 'student',
            mobile_number: mobileNumber,
            college: 'Test College',
            roll_number: '12345',
            location: 'Test Location'
        });
        console.log('Registration Response:', registerRes.data);

        // 2. Try to Login (Should fail)
        console.log('2. Trying to login before verification...');
        try {
            await axios.post(`${API_URL}/login`, { email, password });
            console.error('❌ Login should have failed but succeeded!');
        } catch (err) {
            if (err.response && err.response.status === 403) {
                console.log('✅ Login failed as expected (Email not verified)');
            } else {
                console.error('❌ Login failed with unexpected error:', err.message);
            }
        }

        // 3. Verify Email (We need to look up the token from DB or simple logs if we were running the server here, 
        // but since we are running against a running server, we might need a backdoor or just fail this part if we can't see the OTP.
        // However, in the backend code I added a console.log for OTP in Dev mode. 
        // I can't easily see the server logs of the *running* process if I didn't start it myself in this session.
        // BUT! I can use the existing `User` model to find the user and get the token if I connect to the DB.

        // For this script, let's assume we can connect to DB to get the OTP.
        // We will need to import the models.
    } catch (err) {
        console.error('Test Failed:', err.response ? err.response.data : err.message);
    }
}

// We rely on the server being running.
console.log("Run this script to test the flow against a running backend.");
