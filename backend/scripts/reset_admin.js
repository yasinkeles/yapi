require('dotenv').config();
const db = require('../src/config/database');
const User = require('../src/models/User');

(async () => {
    try {
        await db.initialize();

        const user = await User.findByUsername('admin');
        if (!user) {
            console.log("User admin not found, creating...");
            await User.create({ username: 'admin', password: 'admin', email: 'admin@example.com' });
        } else {
            console.log("Updating admin password...");
            await User.update(user.id, { password: 'admin' }); // hashes automatically
        }
        console.log("DONE");

    } catch (e) {
        console.error("ERROR:", e);
    }
})();
