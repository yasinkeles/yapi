const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../src/config/database');
const User = require('../src/models/User');

const username = process.argv[2] || 'admin';
const newPassword = process.argv[3] || 'admin';

(async () => {
    try {
        await db.initialize();

        const user = await User.findByUsername(username);
        if (!user) {
            console.error(`Kullanici bulunamadi: ${username}`);
            process.exit(1);
        }

        await User.update(user.id, { password: newPassword });
        console.log(`Sifre basariyla sifirlandi!`);
        console.log(`  Kullanici: ${username}`);
        console.log(`  Yeni sifre: ${newPassword}`);
        process.exit(0);

    } catch (e) {
        console.error("HATA:", e.message);
        process.exit(1);
    }
})();
