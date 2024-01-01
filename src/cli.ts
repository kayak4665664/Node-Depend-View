#!/usr/bin/env node

import yargs from 'yargs';
import main from './index';

interface CommandLineOptions {
  dir: string;
  depth: number;
  jsonPath?: string;
}

// Use yargs to define and parse the command line options.
const options = yargs
  .usage('Usage: -d <dir> -p <depth> -j <jsonPath>')
  .option('d', {
    alias: 'dir', describe: 'Your dir path', type: 'string', demandOption: true,
  })
  .option('p', {
    alias: 'depth', describe: 'Depth of analysis', type: 'number', default: 3,
  })
  .option('j', { alias: 'jsonPath', describe: 'Path to save JSON output', type: 'string' })
  .parseSync() as unknown as CommandLineOptions;

const { dir, depth, jsonPath } = options;

main(dir, depth, jsonPath);
