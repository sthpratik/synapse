import { execSync } from 'child_process';
import chalk from 'chalk';

export function isK6Installed(): boolean {
  try {
    execSync('k6 version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function getK6InstallCommand(): string {
  const platform = process.platform;
  
  if (platform === 'darwin') {
    return 'brew install k6';
  } else if (platform === 'linux') {
    return 'sudo snap install k6  # or see https://k6.io/docs/getting-started/installation/';
  } else if (platform === 'win32') {
    return 'choco install k6  # or winget install k6';
  }
  
  return 'See https://k6.io/docs/getting-started/installation/';
}

export async function ensureK6Installed(autoInstall: boolean = false): Promise<boolean> {
  if (isK6Installed()) {
    return true;
  }

  console.error(chalk.red('❌ K6 is not installed'));
  
  if (autoInstall) {
    console.log(chalk.yellow('🔧 Attempting to install K6...'));
    
    try {
      const platform = process.platform;
      
      if (platform === 'darwin') {
        console.log(chalk.blue('🍎 Installing via Homebrew...'));
        execSync('brew install k6', { stdio: 'inherit' });
      } else if (platform === 'linux') {
        console.log(chalk.blue('🐧 Installing via snap...'));
        execSync('sudo snap install k6', { stdio: 'inherit' });
      } else if (platform === 'win32') {
        console.log(chalk.blue('🪟 Installing via Chocolatey...'));
        execSync('choco install k6', { stdio: 'inherit' });
      } else {
        throw new Error('Unsupported platform');
      }
      
      if (isK6Installed()) {
        console.log(chalk.green('✅ K6 installed successfully!'));
        return true;
      }
    } catch (error) {
      console.error(chalk.red('❌ Auto-installation failed'));
    }
  }
  
  console.log(chalk.blue('\n💡 Install K6 manually:'));
  console.log(chalk.blue(`   ${getK6InstallCommand()}`));
  console.log(chalk.blue('   Or visit: https://k6.io/docs/getting-started/installation/\n'));
  
  return false;
}
