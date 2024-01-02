#!/usr/bin/env node

import yargs from 'yargs';
import main from './index';

interface CommandLineOptions {
  dir: string;
  depth: number;
  jsonPath?: string;
  devDependencies: boolean;
}

// Use yargs to define and parse the command line options.
const options = yargs
  .usage('Usage: -d <dir> -p <depth> -j <jsonPath> -e <devDependencies>')
  .option('d', {
    alias: 'dir', describe: 'Your dir path', type: 'string', demandOption: true,
  })
  .option('p', {
    alias: 'depth', describe: 'Depth of analysis', type: 'number', default: 3,
  })
  .option('j', { alias: 'jsonPath', describe: 'Path to save JSON output', type: 'string' })
  .option('e', {
    alias: 'devDependencies', describe: 'Include devDependencies', type: 'boolean', default: false,
  })
  .parseSync() as unknown as CommandLineOptions;

const {
  dir, depth, jsonPath, devDependencies,
} = options;

main(dir, depth, jsonPath, devDependencies);
