require('dotenv').config();
const { User, sequelize } = require('./models');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@campusfood.com';
        const adminPassword = '0987654321San@@'; // Match user input from logs

        console.log(`Resetting password for: ${adminEmail}`);

        const admin = await User.findOne({ where: { email: adminEmail } });

        if (admin) {
            const hash = await bcrypt.hash(adminPassword, 10);
            admin.password = hash;
            admin.role = 'admin'; // Ensure role is correct
            await admin.save();
            console.log(`✅ Admin password verified/reset to: ${adminPassword}`);
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
            console.log(`✅ Admin user created with password: ${adminPassword}`);
        }

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

resetAdmin();
