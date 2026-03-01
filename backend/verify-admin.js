require('dotenv').config();
const { User, sequelize } = require('./models');
const bcrypt = require('bcryptjs');

async function verifyAdmin() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            console.error('ADMIN_EMAIL or ADMIN_PASSWORD not set in .env');
            return;
        }

        const admin = await User.findOne({ where: { email: adminEmail } });

        if (admin) {
            console.log(`✅ Admin user found: ${admin.email}`);
            // Optional: Update password to match .env if needed
            // const hash = await bcrypt.hash(adminPassword, 10);
            // admin.password = hash;
            // await admin.save();
            // console.log('✅ Admin password updated to match .env');
        } else {
            console.log('⚠️ Admin user NOT found. Creating...');
            const hash = await bcrypt.hash(adminPassword, 10);
            await User.create({
                email: adminEmail,
                password: hash,
                name: 'Campus Admin',
                role: 'admin',
                points: 0,
                college: 'Admin Dept',
                location: 'Main Office'
            });
            console.log('✅ Admin user created successfully.');
        }

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

verifyAdmin();
