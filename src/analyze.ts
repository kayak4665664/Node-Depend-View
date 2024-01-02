import fs from 'fs/promises';
import path from 'path';
import semver from 'semver';

// Function to check if a given file path exists.
async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch { return false; }
}

// Function to get real path if the given path is a symbolic link.
async function getRealPath(filePath: string): Promise<string> {
  try {
    const realPath: string = await fs.realpath(filePath);
    return realPath;
  } catch { return filePath; }
}

interface Node {
  id: string;
  name: string;
  version: string;
  description: string;
  dir: string;
  depth: number;
  isMultipleVersions: boolean;
}

interface Edge {
  source: string;
  sourceId: string;
  target: string;
  targetId: string;
  isCircular: boolean;
}

interface PackageJson {
  name: string;
  version: string;
  description: string;
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
}

// Declare global variables for tracking visited directories, nodes, etc.
const visitedDirs: Map<string, { node: Node, dependencies: { [key: string]: string } }> = new Map();
const parsedNodes: Set<string> = new Set();
const nodes: Map<string, Node> = new Map();
const adjacencyList: Map<string, { outNodes: Set<string>, inNodes: Set<string> }> = new Map();
const dirsQueue: { currentDir: string, currentDepth: number }[] = [];
const multipleVersions: Map<string, Set<string>> = new Map();
const nodesDegrees: Map<string, { inDegree: number, outDegree: number }> = new Map();
let rootDir: string = '';
let includeDevDependencies: boolean = false;

// Function to get the node ID based on directory.
async function getNodeId(dir: string): Promise<string | null> {
  if (visitedDirs.has(dir)) return visitedDirs.get(dir)!.node.id;

  const packageJsonPath: string = path.join(dir, 'package.json');
  if (!await exists(packageJsonPath)) return null;

  let packageJson: PackageJson;
  try {
    packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  } catch (error) {
    console.error(`Error reading package.json at ${packageJsonPath}:`);
    return null;
  }

  const { name, version } = packageJson;
  const nodeId: string = `${name}@${version}`;
  const node: Node = {
    id: nodeId,
    name,
    version,
    description: packageJson.description,
    dir,
    depth: -1,
    isMultipleVersions: false,
  };
  const dependencies: {
    [key: string]: string;
  } = packageJson.dependencies || {};

  if (includeDevDependencies) {
    const devDependencies: {
      [key: string]: string;
    } = packageJson.devDependencies || {};
    Object.assign(dependencies, devDependencies);
  }

  visitedDirs.set(dir, { node, dependencies });

  return nodeId;
}

// Function to add a node to the nodes map.
async function addNode(id: string, dir: string, depth: number): Promise<void> {
  if (nodes.has(id)) return;

  const { node } = (visitedDirs.get(dir)!);
  node.depth = depth;
  nodes.set(id, node);

  const { name } = node;
  if (multipleVersions.has(name)) multipleVersions.get(name)!.add(id);
  else multipleVersions.set(name, new Set([id]));

  nodesDegrees.set(id, { inDegree: 0, outDegree: 0 });
  adjacencyList.set(id, { outNodes: new Set(), inNodes: new Set() });
}

// Function to find the target node ID.
async function getTargetId(targetName: string, targetVersion: string, dir: string):
  Promise<string | null> {
  const targetId: string | null = await getNodeId(dir);
  if (!targetId) return null;

  const availableVersions: string[] = [];
  availableVersions.push(visitedDirs.get(dir)!.node.version);
  const bestMatch: string | null = semver.maxSatisfying(availableVersions, targetVersion);

  if (bestMatch) return `${targetName}@${bestMatch}`;
  return null;
}

// Function to add an edge between two nodes.
async function addEdge(sourceId: string, targetId: string, depth: number, targetDir: string):
  Promise<void> {
  await addNode(targetId, targetDir, depth);

  dirsQueue.push({ currentDir: targetDir, currentDepth: depth });

  adjacencyList.get(sourceId)!.outNodes.add(targetId);
  adjacencyList.get(targetId)!.inNodes.add(sourceId);

  const { inDegree: sourceInDegree, outDegree: sourceOutDegree } = nodesDegrees.get(sourceId)!;
  nodesDegrees.set(sourceId, { inDegree: sourceInDegree, outDegree: sourceOutDegree + 1 });
  const { inDegree: targetInDegree, outDegree: targetOutDegree } = nodesDegrees.get(targetId)!;
  nodesDegrees.set(targetId, { inDegree: targetInDegree + 1, outDegree: targetOutDegree });
}

// Function to find target nodes and edges.
async function findTargets(
  currentDir: string,
  targets: Map<[targetName: string, targetVersion: string], boolean>,
  sourceId: string,
  depth: number,
): Promise<void> {
  await Promise.all(Array.from(targets).map(
    async ([target, added]: [[targetName: string, targetVersion: string], boolean]):
      Promise<void> => {
      if (!added) {
        const [targetName, targetVersion] = target;

        const targetDir: string = path.join(currentDir, targetName);
        const realTargetDir: string = await getRealPath(targetDir);

        const targetId: string | null = await getTargetId(targetName, targetVersion, realTargetDir);
        if (targetId) {
          await addEdge(sourceId, targetId, depth, realTargetDir);
          targets.set(target, true);
        }
      }
    },
  ));
}

// Function to parse dependencies and create nodes and edges.
async function parseDependencies(
  sourceId: string,
  dependencies: { [key: string]: string },
  parentDir: string,
  depth: number,
): Promise<void> {
  const targets: Map<[targetName: string, targetVersion: string], boolean> = new Map(
    Object.entries(dependencies).map(
      ([targetName, targetVersion]: [string, string]):
        [[targetName: string, targetVersion: string],
          boolean] => [[targetName, targetVersion], false],
    ),
  );

  const fromDir: string = rootDir;
  const toDir: string = path.join(parentDir, 'node_modules');
  const relativePath: string = path.relative(fromDir, toDir);
  const directories: string[] = relativePath.split(path.sep);

  let currentDir: string = fromDir;
  await directories.reduce(async (acc: Promise<void>, dir: string): Promise<void> => {
    await acc;
    currentDir = path.join(currentDir, dir);

    if (dir === 'node_modules') {
      await findTargets(currentDir, targets, sourceId, depth);
    }
  }, Promise.resolve());
}

// Function to parse the package.json file and create nodes and edges.
async function parsePackageJson(dir: string, depth: number): Promise<void> {
  if (depth < 1) return;

  const nodeId: string | null = await getNodeId(dir);
  if (!nodeId) return;

  if (dir === rootDir) await addNode(nodeId, dir, depth);

  if (depth - 1 < 1 || parsedNodes.has(nodeId)) return;

  const { dependencies } = (visitedDirs.get(dir)!);
  if (dependencies) await parseDependencies(nodeId, dependencies, dir, depth - 1);

  parsedNodes.add(nodeId);
}

// Function to perform a breadth-first search starting from the root directory.
async function breadthFirstSearch(): Promise<void> {
  if (dirsQueue.length === 0) return;

  const { currentDir, currentDepth } = dirsQueue.shift()!;
  await parsePackageJson(currentDir, currentDepth);

  await breadthFirstSearch();
}

// Function to perform a topological sort on the nodes and edges.
async function topologicalSort(
  adjacencyListForSort: Map<string, { outNodes: Set<string>, inNodes: Set<string> }>,
): Promise<Map<string, { outNodes: Set<string>; inNodes: Set<string>; }>> {
  const queue: string[] = [];

  nodesDegrees.forEach(
    (degree: { inDegree: number, outDegree: number }, nodeId: string): void => {
      if (degree.inDegree === 0) queue.push(nodeId);
    },
  );

  while (queue.length > 0) {
    const nodeId: string = queue.shift()!;
    const { outNodes } = adjacencyListForSort.get(nodeId)!;

    outNodes.forEach((target: string): void => {
      const { inDegree, outDegree } = nodesDegrees.get(target)!;
      if (inDegree - 1 === 0) queue.push(target);
      nodesDegrees.set(target, { inDegree: inDegree - 1, outDegree });
      adjacencyListForSort.get(target)!.inNodes.delete(nodeId);
    });

    adjacencyListForSort.delete(nodeId);
    nodesDegrees.delete(nodeId);
  }

  nodesDegrees.forEach(
    (degree: { inDegree: number, outDegree: number }, nodeID: string): void => {
      if (degree.outDegree === 0) queue.push(nodeID);
    },
  );

  while (queue.length > 0) {
    const nodeId: string = queue.shift()!;
    const { inNodes } = adjacencyListForSort.get(nodeId)!;

    inNodes.forEach((source: string): void => {
      const { inDegree, outDegree } = nodesDegrees.get(source)!;
      if (outDegree - 1 === 0) queue.push(source);
      nodesDegrees.set(source, { inDegree, outDegree: outDegree - 1 });
      adjacencyListForSort.get(source)!.outNodes.delete(nodeId);
    });

    adjacencyListForSort.delete(nodeId);
    nodesDegrees.delete(nodeId);
  }
  return adjacencyListForSort;
}

// Main function to analyze the directory and return nodes and edges.
async function analyze(dir: string, depth: number = 3, devDependencies: boolean = false):
  Promise<{ nodesList: Node[], edgesList: Edge[] }> {
  includeDevDependencies = devDependencies;

  dirsQueue.push({ currentDir: dir, currentDepth: depth });
  rootDir = dir;
  await breadthFirstSearch();

  multipleVersions.forEach((versions: Set<string>): void => {
    if (versions.size < 2) return;
    versions.forEach((id: string): void => {
      nodes.get(id)!.isMultipleVersions = true;
    });
  });

  const nodesList: Node[] = [];
  nodes.forEach((node: Node): void => {
    nodesList.push(node);
  });

  const adjacencyListForSort: Map<
    string, { outNodes: Set<string>, inNodes: Set<string> }> = new Map();
  adjacencyList.forEach((
    outAndInNodes: { outNodes: Set<string>, inNodes: Set<string> },
    id: string,
  ): void => {
    adjacencyListForSort.set(id, {
      outNodes: new Set(outAndInNodes.outNodes),
      inNodes: new Set(outAndInNodes.inNodes),
    });
  });

  const adjacencyListAfterSort: Map<string, {
    outNodes: Set<string>,
    inNodes: Set<string>
  }> = await topologicalSort(adjacencyListForSort);

  const edgesList: Edge[] = [];
  adjacencyList.forEach(
    (outAndInNodes: {
      outNodes: Set<string>,
      inNodes: Set<string>
    }, id: string): void => {
      const { outNodes } = outAndInNodes;
      outNodes.forEach((target: string): void => {
        const isCircular: boolean = adjacencyListAfterSort.has(id)
          && adjacencyListAfterSort.get(id)!.outNodes.has(target);
        edgesList.push({
          source: id,
          sourceId: id,
          target,
          targetId: target,
          isCircular,
        });
      });
    },
  );

  console.log('nodes:', nodesList.length, ' edges:', edgesList.length);
  return { nodesList, edgesList };
}

export { analyze, exists, getRealPath };
