const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const correctLibPath = path.join(__dirname, '../lib/oracle');

console.log(`Fixing .env...`);
console.log(`Setting ORACLE_CLIENT_LIB_DIR to: ${correctLibPath}`);

let envContent = "";
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
}

if (envContent.includes('ORACLE_CLIENT_LIB_DIR=')) {
    // Replace existing line
    // Use regex to handle potential different line endings or values
    envContent = envContent.replace(/^ORACLE_CLIENT_LIB_DIR=.*$/m, `ORACLE_CLIENT_LIB_DIR=${correctLibPath}`);
} else {
    // Append
    envContent += `\nORACLE_CLIENT_LIB_DIR=${correctLibPath}\n`;
}

fs.writeFileSync(envPath, envContent);
console.log("DONE. Please restart the backend.");
