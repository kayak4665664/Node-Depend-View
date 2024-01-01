"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const analyze_1 = require("./analyze");
async function main(dir, depth, jsonPath) {
    const packageJsonPath = path_1.default.join(dir, 'package.json');
    const nodeModules = path_1.default.join(dir, 'node_modules');
    // Check if the directory, package.json, and node_modules exist.
    if (!await (0, analyze_1.exists)(dir) || !await (0, analyze_1.exists)(packageJsonPath)
        || !await (0, analyze_1.exists)(nodeModules)) {
        console.error(`Error: ${dir} is not a valid dir.`);
        return;
    }
    console.time('Time');
    const jsonData = await (0, analyze_1.analyze)(dir, Math.max(1, Math.min(depth, 64)));
    console.timeEnd('Time');
    // Check if jsonPath is not provided.
    if (!jsonPath) {
        const app = (0, express_1.default)();
        const port = 3000;
        // Enable CORS for all routes.
        app.use((0, cors_1.default)());
        // Serve static files from the 'public' directory.
        app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
        // Define a route to get the analysis data.
        app.get('/analyze', async (req, res) => {
            res.json(jsonData);
        });
        // Serve the front-end's index.html for '/graph' route.
        app.get('/graph', (req, res) => {
            res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
        });
        // Start the server and listen on the specified port.
        const server = app.listen(port, () => {
            console.log(`Try http://localhost:${port}/graph on your browser.`);
            console.log('Press Ctrl+C to quit.');
        });
        // Handle Ctrl+C to gracefully shut down the server.
        process.on('SIGINT', () => {
            server.close(() => {
                console.log('');
                process.exit(0);
            });
        });
    }
    else {
        // If jsonPath is provided, write the JSON data to the file.
        try {
            await promises_1.default.writeFile(jsonPath, JSON.stringify(jsonData, null, 2));
            console.log(`Json written to ${jsonPath}.`);
        }
        catch (error) {
            console.error(`Error writing to file ${jsonPath}:`, error);
        }
    }
}
exports.default = main;
