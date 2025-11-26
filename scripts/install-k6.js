#!/usr/bin/env node

const { execSync } = require('child_process');
const os = require('os');

function isK6Installed() {
  try {
    execSync('k6 version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function installK6() {
  const platform = os.platform();
  
  console.log('📦 K6 not found. Installing K6...');
  
  try {
    if (platform === 'darwin') {
      // macOS
      console.log('🍎 Detected macOS - Installing via Homebrew...');
      execSync('brew install k6', { stdio: 'inherit' });
    } else if (platform === 'linux') {
      // Linux
      console.log('🐧 Detected Linux - Installing via package manager...');
      try {
        // Try apt (Debian/Ubuntu)
        execSync('sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69', { stdio: 'inherit' });
        execSync('echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list', { stdio: 'inherit' });
        execSync('sudo apt-get update && sudo apt-get install k6', { stdio: 'inherit' });
      } catch {
        // Try yum (RHEL/CentOS)
        try {
          execSync('sudo yum install https://dl.k6.io/rpm/repo.rpm', { stdio: 'inherit' });
          execSync('sudo yum install k6', { stdio: 'inherit' });
        } catch {
          console.log('⚠️  Could not auto-install K6. Please install manually:');
          console.log('   https://k6.io/docs/getting-started/installation/');
          return false;
        }
      }
    } else if (platform === 'win32') {
      // Windows
      console.log('🪟 Detected Windows - Installing via Chocolatey...');
      try {
        execSync('choco install k6', { stdio: 'inherit' });
      } catch {
        console.log('⚠️  Chocolatey not found. Trying winget...');
        try {
          execSync('winget install k6 --source winget', { stdio: 'inherit' });
        } catch {
          console.log('⚠️  Could not auto-install K6. Please install manually:');
          console.log('   https://k6.io/docs/getting-started/installation/');
          return false;
        }
      }
    } else {
      console.log(`⚠️  Unsupported platform: ${platform}`);
      console.log('   Please install K6 manually: https://k6.io/docs/getting-started/installation/');
      return false;
    }
    
    console.log('✅ K6 installed successfully!');
    return true;
  } catch (error) {
    console.log('⚠️  K6 installation failed:', error.message);
    console.log('   Please install K6 manually: https://k6.io/docs/getting-started/installation/');
    return false;
  }
}

// Main
if (isK6Installed()) {
  console.log('✅ K6 is already installed');
} else {
  installK6();
}
