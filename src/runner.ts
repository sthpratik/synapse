import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { SynapseConfig } from './types/config';
import { ConfigValidator } from './validators/configValidator';
import { K6Generator } from './generators/k6Generator';

export interface RunOptions {
  outputDir: string;
  dryRun?: boolean;
  keepScript?: boolean;
}

export class SynapseRunner {
  private validator: ConfigValidator;

  constructor() {
    this.validator = new ConfigValidator();
  }

  async run(configPath: string, options: RunOptions): Promise<void> {
    console.log(chalk.blue('📋 Loading configuration...'));
    const config = await this.loadConfig(configPath);
    
    console.log(chalk.blue('✅ Validating configuration...'));
    await this.validator.validate(config);
    
    console.log(chalk.blue('🔧 Generating K6 script...'));
    const scriptPath = await this.generateK6Script(config, options.outputDir);
    
    if (options.dryRun) {
      console.log(chalk.yellow('🏃 Dry run mode - K6 script generated but not executed'));
      console.log(chalk.blue(`📄 Script location: ${scriptPath}`));
      return;
    }
    
    console.log(chalk.blue('🚀 Running K6 load test...'));
    await this.runK6Test(scriptPath, options.outputDir);
    
    if (!options.keepScript) {
      fs.unlinkSync(scriptPath);
      console.log(chalk.gray('🗑️  Cleaned up generated script'));
    } else {
      console.log(chalk.blue(`📄 K6 script saved: ${scriptPath}`));
    }
    
    console.log(chalk.green('✅ Load test completed!'));
  }

  async generateScript(configPath: string, outputPath: string): Promise<void> {
    const config = await this.loadConfig(configPath);
    await this.validator.validate(config);
    
    const generator = new K6Generator(config);
    const script = await generator.generateK6Script();
    
    fs.writeFileSync(outputPath, script);
  }

  private async loadConfig(configPath: string): Promise<SynapseConfig> {
    const configContent = fs.readFileSync(configPath, 'utf8');
    return yaml.parse(configContent) as SynapseConfig;
  }

  private async generateK6Script(config: SynapseConfig, outputDir: string): Promise<string> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const generator = new K6Generator(config);
    const script = await generator.generateK6Script();
    
    const scriptPath = path.join(outputDir, 'test.js');
    fs.writeFileSync(scriptPath, script);
    
    return scriptPath;
  }

  private async runK6Test(scriptPath: string, outputDir: string): Promise<void> {
    try {
      // Check if k6 is installed
      execSync('k6 version', { stdio: 'pipe' });
    } catch (error) {
      console.error(chalk.red('❌ K6 is not installed or not in PATH'));
      console.log(chalk.blue('💡 Install K6: https://k6.io/docs/getting-started/installation/'));
      throw new Error('K6 not found');
    }

    const outputFile = path.join(outputDir, 'results.json');
    const command = `k6 run --out json=${outputFile} ${scriptPath}`;
    
    try {
      console.log(chalk.gray(`Running: ${command}`));
      execSync(command, { stdio: 'inherit' });
      console.log(chalk.green(`📊 Results saved to: ${outputFile}`));
    } catch (error) {
      throw new Error('K6 test execution failed');
    }
  }

  async checkK6Installation(): Promise<boolean> {
    try {
      execSync('k6 version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}
