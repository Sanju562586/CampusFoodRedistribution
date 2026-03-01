const { User, PendingUser } = require('./models');

async function verifyManual() {
    try {
        const email = 'testps_20260209102255@example.com';
        const pending = await PendingUser.findOne({ where: { email } });

        if (!pending) {
            console.log("❌ Pending user not found (maybe already verified?)");
            return;
        }

        console.log(`Found pending user: ${pending.email}, OTP: ${pending.verification_token}`);

        // Simulate API call logic effectively
        const response = await fetch('http://localhost:5000/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp: pending.verification_token })
        });

        if (response.ok) {
            console.log("✅ Verification API returned Success");
        } else {
            console.error(`❌ Verification API failed: ${response.status} ${await response.text()}`);
            return;
        }

        // Check tables
        const userInMain = await User.findOne({ where: { email } });
        const userInPending = await PendingUser.findOne({ where: { email } });

        if (userInMain && !userInPending) {
            console.log("✅ SUCCESS: User moved to main table and removed from pending.");
        } else {
            console.error("❌ FAILURE: DB state incorrect.");
            console.log("In Main:", !!userInMain);
            console.log("In Pending:", !!userInPending);
        }

    } catch (e) {
        console.error(e);
    }
}

verifyManual();
