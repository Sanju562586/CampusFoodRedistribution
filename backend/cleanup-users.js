const { User, sequelize } = require('./models');
const { Op } = require('sequelize');

async function cleanup() {
    try {
        console.log("Cleaning up users...");

        // Count before
        const totalBefore = await User.count();
        console.log(`Total users before cleanup: ${totalBefore}`);

        // Delete all users where role is NOT 'admin'
        // OR email is NOT 'admin@test.com' if we want to be very specific, 
        // but user said "except the admin", implying role usually. 
        // I'll stick to role != 'admin' as it is safer for preserving all admins if any new ones were made.
        const deletedCount = await User.destroy({
            where: {
                role: {
                    [Op.ne]: 'admin'
                }
            }
        });

        console.log(`Deleted ${deletedCount} users.`);

        // Count after
        const totalAfter = await User.count();
        console.log(`Total users remaining: ${totalAfter}`);

        const remaining = await User.findAll();
        remaining.forEach(u => console.log(` - ${u.email} (${u.role})`));

    } catch (error) {
        console.error("Cleanup failed:", error);
    } finally {
        await sequelize.close();
    }
}

cleanup();
