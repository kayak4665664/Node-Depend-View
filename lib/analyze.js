"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRealPath = exports.exists = exports.analyze = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const semver_1 = __importDefault(require("semver"));
// Function to check if a given file path exists.
async function exists(filePath) {
    try {
        await promises_1.default.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
exports.exists = exists;
// Function to get real path if the given path is a symbolic link.
async function getRealPath(filePath) {
    try {
        const realPath = await promises_1.default.realpath(filePath);
        return realPath;
    }
    catch {
        return filePath;
    }
}
exports.getRealPath = getRealPath;
// Declare global variables for tracking visited directories, nodes, etc.
const visitedDirs = new Map();
const parsedNodes = new Set();
const nodes = new Map();
const adjacencyList = new Map();
const dirsQueue = [];
const multipleVersions = new Map();
const nodesDegrees = new Map();
let rootDir = '';
let includeDevDependencies = false;
// Function to get the node ID based on directory.
async function getNodeId(dir) {
    if (visitedDirs.has(dir))
        return visitedDirs.get(dir).node.id;
    const packageJsonPath = path_1.default.join(dir, 'package.json');
    if (!await exists(packageJsonPath))
        return null;
    let packageJson;
    try {
        packageJson = JSON.parse(await promises_1.default.readFile(packageJsonPath, 'utf8'));
    }
    catch (error) {
        console.error(`Error reading package.json at ${packageJsonPath}:`);
        return null;
    }
    const { name, version } = packageJson;
    const nodeId = `${name}@${version}`;
    const node = {
        id: nodeId,
        name,
        version,
        description: packageJson.description,
        dir,
        depth: -1,
        isMultipleVersions: false,
    };
    const dependencies = packageJson.dependencies || {};
    if (includeDevDependencies) {
        const devDependencies = packageJson.devDependencies || {};
        Object.assign(dependencies, devDependencies);
    }
    visitedDirs.set(dir, { node, dependencies });
    return nodeId;
}
// Function to add a node to the nodes map.
async function addNode(id, dir, depth) {
    if (nodes.has(id))
        return;
    const { node } = (visitedDirs.get(dir));
    node.depth = depth;
    nodes.set(id, node);
    const { name } = node;
    if (multipleVersions.has(name))
        multipleVersions.get(name).add(id);
    else
        multipleVersions.set(name, new Set([id]));
    nodesDegrees.set(id, { inDegree: 0, outDegree: 0 });
    adjacencyList.set(id, { outNodes: new Set(), inNodes: new Set() });
}
// Function to find the target node ID.
async function getTargetId(targetName, targetVersion, dir) {
    const targetId = await getNodeId(dir);
    if (!targetId)
        return null;
    const availableVersions = [];
    availableVersions.push(visitedDirs.get(dir).node.version);
    const bestMatch = semver_1.default.maxSatisfying(availableVersions, targetVersion);
    if (bestMatch)
        return `${targetName}@${bestMatch}`;
    return null;
}
// Function to add an edge between two nodes.
async function addEdge(sourceId, targetId, depth, targetDir) {
    await addNode(targetId, targetDir, depth);
    dirsQueue.push({ currentDir: targetDir, currentDepth: depth });
    adjacencyList.get(sourceId).outNodes.add(targetId);
    adjacencyList.get(targetId).inNodes.add(sourceId);
    const { inDegree: sourceInDegree, outDegree: sourceOutDegree } = nodesDegrees.get(sourceId);
    nodesDegrees.set(sourceId, { inDegree: sourceInDegree, outDegree: sourceOutDegree + 1 });
    const { inDegree: targetInDegree, outDegree: targetOutDegree } = nodesDegrees.get(targetId);
    nodesDegrees.set(targetId, { inDegree: targetInDegree + 1, outDegree: targetOutDegree });
}
// Function to find target nodes and edges.
async function findTargets(currentDir, targets, sourceId, depth) {
    await Promise.all(Array.from(targets).map(async ([target, added]) => {
        if (!added) {
            const [targetName, targetVersion] = target;
            const targetDir = path_1.default.join(currentDir, targetName);
            const realTargetDir = await getRealPath(targetDir);
            const targetId = await getTargetId(targetName, targetVersion, realTargetDir);
            if (targetId) {
                await addEdge(sourceId, targetId, depth, realTargetDir);
                targets.set(target, true);
            }
        }
    }));
}
// Function to parse dependencies and create nodes and edges.
async function parseDependencies(sourceId, dependencies, parentDir, depth) {
    const targets = new Map(Object.entries(dependencies).map(([targetName, targetVersion]) => [[targetName, targetVersion], false]));
    const fromDir = rootDir;
    const toDir = path_1.default.join(parentDir, 'node_modules');
    const relativePath = path_1.default.relative(fromDir, toDir);
    const directories = relativePath.split(path_1.default.sep);
    let currentDir = fromDir;
    await directories.reduce(async (acc, dir) => {
        await acc;
        currentDir = path_1.default.join(currentDir, dir);
        if (dir === 'node_modules') {
            await findTargets(currentDir, targets, sourceId, depth);
        }
    }, Promise.resolve());
}
// Function to parse the package.json file and create nodes and edges.
async function parsePackageJson(dir, depth) {
    if (depth < 1)
        return;
    const nodeId = await getNodeId(dir);
    if (!nodeId)
        return;
    if (dir === rootDir)
        await addNode(nodeId, dir, depth);
    if (depth - 1 < 1 || parsedNodes.has(nodeId))
        return;
    const { dependencies } = (visitedDirs.get(dir));
    if (dependencies)
        await parseDependencies(nodeId, dependencies, dir, depth - 1);
    parsedNodes.add(nodeId);
}
// Function to perform a breadth-first search starting from the root directory.
async function breadthFirstSearch() {
    if (dirsQueue.length === 0)
        return;
    const { currentDir, currentDepth } = dirsQueue.shift();
    await parsePackageJson(currentDir, currentDepth);
    await breadthFirstSearch();
}
// Function to perform a topological sort on the nodes and edges.
async function topologicalSort(adjacencyListForSort) {
    const queue = [];
    nodesDegrees.forEach((degree, nodeId) => {
        if (degree.inDegree === 0)
            queue.push(nodeId);
    });
    while (queue.length > 0) {
        const nodeId = queue.shift();
        const { outNodes } = adjacencyListForSort.get(nodeId);
        outNodes.forEach((target) => {
            const { inDegree, outDegree } = nodesDegrees.get(target);
            if (inDegree - 1 === 0)
                queue.push(target);
            nodesDegrees.set(target, { inDegree: inDegree - 1, outDegree });
            adjacencyListForSort.get(target).inNodes.delete(nodeId);
        });
        adjacencyListForSort.delete(nodeId);
        nodesDegrees.delete(nodeId);
    }
    nodesDegrees.forEach((degree, nodeID) => {
        if (degree.outDegree === 0)
            queue.push(nodeID);
    });
    while (queue.length > 0) {
        const nodeId = queue.shift();
        const { inNodes } = adjacencyListForSort.get(nodeId);
        inNodes.forEach((source) => {
            const { inDegree, outDegree } = nodesDegrees.get(source);
            if (outDegree - 1 === 0)
                queue.push(source);
            nodesDegrees.set(source, { inDegree, outDegree: outDegree - 1 });
            adjacencyListForSort.get(source).outNodes.delete(nodeId);
        });
        adjacencyListForSort.delete(nodeId);
        nodesDegrees.delete(nodeId);
    }
    return adjacencyListForSort;
}
// Main function to analyze the directory and return nodes and edges.
async function analyze(dir, depth = 3, devDependencies = false) {
    includeDevDependencies = devDependencies;
    dirsQueue.push({ currentDir: dir, currentDepth: depth });
    rootDir = dir;
    await breadthFirstSearch();
    multipleVersions.forEach((versions) => {
        if (versions.size < 2)
            return;
        versions.forEach((id) => {
            nodes.get(id).isMultipleVersions = true;
        });
    });
    const nodesList = [];
    nodes.forEach((node) => {
        nodesList.push(node);
    });
    const adjacencyListForSort = new Map();
    adjacencyList.forEach((outAndInNodes, id) => {
        adjacencyListForSort.set(id, {
            outNodes: new Set(outAndInNodes.outNodes),
            inNodes: new Set(outAndInNodes.inNodes),
        });
    });
    const adjacencyListAfterSort = await topologicalSort(adjacencyListForSort);
    const edgesList = [];
    adjacencyList.forEach((outAndInNodes, id) => {
        const { outNodes } = outAndInNodes;
        outNodes.forEach((target) => {
            const isCircular = adjacencyListAfterSort.has(id)
                && adjacencyListAfterSort.get(id).outNodes.has(target);
            edgesList.push({
                source: id,
                sourceId: id,
                target,
                targetId: target,
                isCircular,
            });
        });
    });
    console.log('nodes:', nodesList.length, ' edges:', edgesList.length);
    return { nodesList, edgesList };
}
exports.analyze = analyze;
