import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { analyze, exists } from './analyze';

async function main(dir: string, depth: number, jsonPath: string | undefined): Promise<void> {
  const packageJsonPath: string = path.join(dir, 'package.json');
  const nodeModules: string = path.join(dir, 'node_modules');

  // Check if the directory, package.json, and node_modules exist.
  if (!await exists(dir) || !await exists(packageJsonPath)
    || !await exists(nodeModules)) {
    console.error(`Error: ${dir} is not a valid dir.`);
    return;
  }

  console.time('Time');
  const jsonData = await analyze(
    dir,
    Math.max(1, Math.min(depth, 64)),
    // Ensure the depth is between 1 and 64.
  );
  console.timeEnd('Time');

  // Check if jsonPath is not provided.
  if (!jsonPath) {
    const app = express();
    const port = 3000;

    // Enable CORS for all routes.
    app.use(cors());

    // Serve static files from the 'public' directory.
    app.use(express.static('public'));

    // Define a route to get the analysis data.
    app.get('/analyze', async (req, res): Promise<void> => {
      res.json(jsonData);
    });

    // Serve the front-end's index.html for '/graph' route.
    app.get('/graph', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // Start the server and listen on the specified port.
    const server = app.listen(port, (): void => {
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
  } else {
    // If jsonPath is provided, write the JSON data to the file.
    try {
      await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2));
      console.log(`Json written to ${jsonPath}.`);
    } catch (error) {
      console.error(`Error writing to file ${jsonPath}:`, error);
    }
  }
}

export default main;
