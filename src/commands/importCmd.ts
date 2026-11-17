import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import chalk from 'chalk';
import { importOpenApi } from '../importers/openapi';
import { importHar } from '../importers/har';
import { ExitCode } from '../utils/exitCodes';

export const importCommand = new Command('import')
  .description('Import OpenAPI or HAR into a Synapse configuration')
  .option('--openapi <path>', 'OpenAPI 3 / Swagger 2 file (.yaml/.yml/.json)')
  .option('--har <path>', 'HAR capture file (.har/.json)')
  .option('-o, --output <path>', 'Output synapse.yml path', 'synapse.yml')
  .option('-n, --name <name>', 'Test name override')
  .option('--path <filter>', 'OpenAPI: only paths containing this filter')
  .option('--method <method>', 'OpenAPI: preferred HTTP method')
  .option('--concurrent <n>', 'Concurrent VUs', '10')
  .option('--iterations <n>', 'Iterations (OpenAPI)', '50')
  .option('--duration <dur>', 'Duration (HAR batch mode)', '2m')
  .option('--include-static', 'HAR: include CSS/JS/image URLs')
  .option('--csv <path>', 'HAR: output CSV path for URLs')
  .action((options) => {
    try {
      if (!options.openapi && !options.har) {
        console.error(chalk.red('Provide --openapi <file> or --har <file>'));
        process.exit(ExitCode.CONFIG_ERROR);
      }
      if (options.openapi && options.har) {
        console.error(chalk.red('Provide only one of --openapi or --har'));
        process.exit(ExitCode.CONFIG_ERROR);
      }

      const outPath = path.resolve(options.output);

      if (options.openapi) {
        const config = importOpenApi(path.resolve(options.openapi), {
          name: options.name,
          pathFilter: options.path,
          method: options.method,
          concurrent: parseInt(options.concurrent, 10),
          iterations: parseInt(options.iterations, 10)
        });
        fs.writeFileSync(outPath, yaml.stringify(config));
        console.log(chalk.green(`✅ Imported OpenAPI → ${outPath}`));
        console.log(chalk.blue(`   ${config.request?.method} ${config.baseUrl}`));
        if (config.auth) {
          console.log(chalk.yellow('   Auth stub added — replace REPLACE_ME tokens before running'));
        }
        return;
      }

      const { config, urls, csvPath } = importHar(path.resolve(options.har), {
        name: options.name,
        concurrent: parseInt(options.concurrent, 10),
        duration: options.duration,
        includeStatic: !!options.includeStatic,
        outputCsv: options.csv ? path.resolve(options.csv) : undefined
      });
      // Ensure batch file path is relative-friendly when possible
      config.batch!.file = csvPath;
      fs.writeFileSync(outPath, yaml.stringify(config));
      console.log(chalk.green(`✅ Imported HAR → ${outPath}`));
      console.log(chalk.blue(`   ${urls.length} URLs → ${csvPath}`));
      console.log(chalk.blue('   Mode: batch'));
    } catch (error) {
      console.error(chalk.red('❌ Import failed:'), error instanceof Error ? error.message : error);
      process.exit(ExitCode.GENERAL_ERROR);
    }
  });
