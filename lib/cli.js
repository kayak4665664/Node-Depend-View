#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs"));
const index_1 = __importDefault(require("./index"));
// Use yargs to define and parse the command line options.
const options = yargs_1.default
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
    .parseSync();
const { dir, depth, jsonPath, devDependencies, } = options;
(0, index_1.default)(dir, depth, jsonPath, devDependencies);
