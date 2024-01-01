# Node-Depend-View

## Description

Node-Depend-View is a lightweight Node.js tool for efficient analysis and visualization of npm package dependencies.

### key Features:

- **Dependency Visualization**: Leverage D3.js force-directed graphs to intuitively display package dependencies in a web browser.
- **Multiple Version Detection**: Easily spot packages with multiple versions in your project, highlighted with red dots for quick identification.
- **Cycle Detection**: Detect and highlight circular dependencies with red edges, simplifying the process of resolving potential issues.
- **Theme Support**: Automatically adapts to light and dark themes, providing a seamless user experience.

> [Frontend-of-Node-Depend-View](https://github.com/kayak4665664/Frontend-of-Node-Depend-View) is the front end repository of Node-Depend-View.

## Screenshots

![Dependency Visualization](https://github.com/kayak4665664/Node-Depend-View/blob/main/images/1.png)

![Example of Circular Dependencies](https://github.com/kayak4665664/Node-Depend-View/blob/main/images/2.png)


## Installation

To install Node-Depend-View, run the following command in your terminal:

```
npm install -g @kayak4665664/node-depend-view
```

## Usage
Get started with Node-Depend-View using the command-line interface:

```
node-depend-view --help
```

## Command Options
```
Usage: -d <dir> -p <depth> -j <jsonPath>

Options:
      --help      Show help                                            [boolean]
      --version   Show version number                                  [boolean]
  -d, --dir       Your dir path                              [string] [required]
  -p, --depth     Depth of analysis                        [number] [default: 3]
  -j, --jsonPath  Path to save JSON output                              [string]
```

## Examples

1. To visualize dependencies:

```
node-depend-view -d dir -p 20
```

```
nodes: 451  edges: 710
Time: 93.009ms
Try http://localhost:3000/graph on your browser.
Press Ctrl+C to quit.
```

![Graph Visualization in Browser](https://github.com/kayak4665664/Node-Depend-View/blob/main/images/3.png)

2. To export dependencies to a JSON file:

```
node-depend-view -d dir -j jsonPath
```

```
nodes: 5  edges: 5
Time: 4.4ms
Json written to jsonPath.
```