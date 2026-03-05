/**
 * Oracle Instant Client Auto-Installer
 * Downloads and installs Oracle Instant Client automatically
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Oracle Instant Client download URLs (Basic Light package - smaller size)
const ORACLE_DOWNLOADS = {
  win32: {
    x64: {
      url: 'https://download.oracle.com/otn_software/nt/instantclient/1923000/instantclient-basiclite-windows.x64-19.23.0.0.0dbru.zip',
      filename: 'instantclient-basiclite-windows.x64.zip',
      extractDir: 'instantclient_19_23'
    }
  },
  linux: {
    x64: {
      url: 'https://download.oracle.com/otn_software/linux/instantclient/1923000/instantclient-basiclite-linux.x64-19.23.0.0.0dbru.zip',
      filename: 'instantclient-basiclite-linux.x64.zip',
      extractDir: 'instantclient_19_23'
    }
  },
  darwin: {
    x64: {
      url: 'https://download.oracle.com/otn_software/mac/instantclient/1923000/instantclient-basiclite-macos.x64-19.23.0.0.0dbru.zip',
      filename: 'instantclient-basiclite-macos.x64.zip',
      extractDir: 'instantclient_19_23'
    },
    arm64: {
      url: 'https://download.oracle.com/otn_software/mac/instantclient/1923000/instantclient-basiclite-macos.arm64-19.23.0.0.0dbru.zip',
      filename: 'instantclient-basiclite-macos.arm64.zip',
      extractDir: 'instantclient_19_23'
    }
  }
};

const libDir = path.join(__dirname, '..', 'lib', 'oracle');
const downloadDir = path.join(__dirname, '..', 'temp');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from: ${url}`);
    const file = fs.createWriteStream(dest);

    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'node-oracledb-installer'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`Following redirect to: ${redirectUrl}`);
        downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloaded = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        const percent = ((downloaded / totalSize) * 100).toFixed(1);
        process.stdout.write(`\rDownloading: ${percent}%`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\nDownload completed!');
        resolve();
      });
    });

    request.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function extractZip(zipPath, extractTo) {
  console.log(`Extracting to: ${extractTo}`);

  // Ensure extract directory exists
  if (!fs.existsSync(extractTo)) {
    fs.mkdirSync(extractTo, { recursive: true });
  }

  // Use platform-specific extraction
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      // Windows: Use PowerShell Expand-Archive
      const psCommand = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractTo}' -Force"`;
      await execAsync(psCommand);
    } else {
      // Linux/Mac: Use unzip
      await execAsync(`unzip -o "${zipPath}" -d "${extractTo}"`);
    }
    console.log('Extraction completed!');
  } catch (error) {
    console.error('Extraction failed:', error.message);
    throw error;
  }
}

async function installOracleClient() {
  const platform = process.platform;
  const arch = process.arch;

  console.log(`\n📦 Installing Oracle Instant Client for ${platform} ${arch}...`);

  // Check if already installed
  if (fs.existsSync(libDir)) {
    console.log('✓ Oracle Instant Client already installed');
    return;
  }

  // Get download info for current platform
  const platformDownloads = ORACLE_DOWNLOADS[platform];
  if (!platformDownloads) {
    console.log(`⚠️  Oracle Instant Client auto-install not supported for ${platform}`);
    console.log('Please download manually from: https://www.oracle.com/database/technologies/instant-client/downloads.html');
    return;
  }

  const downloadInfo = platformDownloads[arch] || platformDownloads.x64;
  if (!downloadInfo) {
    console.log(`⚠️  Oracle Instant Client auto-install not supported for ${platform} ${arch}`);
    return;
  }

  try {
    // Create temp directory
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const zipPath = path.join(downloadDir, downloadInfo.filename);

    // Download
    console.log('\n1️⃣ Downloading Oracle Instant Client...');
    await downloadFile(downloadInfo.url, zipPath);

    // Extract
    console.log('\n2️⃣ Extracting...');
    await extractZip(zipPath, downloadDir);

    // Move to lib directory
    console.log('\n3️⃣ Installing...');
    const extractedPath = path.join(downloadDir, downloadInfo.extractDir);

    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(path.dirname(libDir), { recursive: true });
    }

    fs.renameSync(extractedPath, libDir);

    // Cleanup
    console.log('\n4️⃣ Cleaning up...');
    fs.unlinkSync(zipPath);

    // Remove temp directory if empty
    const remainingFiles = fs.readdirSync(downloadDir);
    if (remainingFiles.length === 0) {
      fs.rmdirSync(downloadDir);
    }

    console.log('\n✓ Oracle Instant Client installed successfully!');
    console.log(`Location: ${libDir}`);

    // Update .env file with the path
    updateEnvFile(libDir);

  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    console.log('\nPlease install Oracle Instant Client manually:');
    console.log('1. Download from: https://www.oracle.com/database/technologies/instant-client/downloads.html');
    console.log('2. Extract to a directory');
    console.log('3. Set ORACLE_CLIENT_LIB_DIR in your .env file');
  }
}

function updateEnvFile(libPath) {
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');

  const envLine = `ORACLE_CLIENT_LIB_DIR=${libPath}`;

  // Update .env if it exists
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');

    if (envContent.includes('ORACLE_CLIENT_LIB_DIR=')) {
      // Update existing line
      envContent = envContent.replace(/ORACLE_CLIENT_LIB_DIR=.*/g, envLine);
    } else {
      // Add new line
      envContent += `\n${envLine}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log('\n✓ Updated .env file with Oracle client path');
  } else {
    console.log('\n⚠️  .env file not found. Please create one from .env.example');
    console.log(`Add this line: ${envLine}`);
  }
}

// Run installation
if (require.main === module) {
  installOracleClient()
    .then(() => {
      console.log('\n✅ Installation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Installation failed:', error);
      process.exit(0); // Don't fail npm install
    });
}

module.exports = { installOracleClient };
