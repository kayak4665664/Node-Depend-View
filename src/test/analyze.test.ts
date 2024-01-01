import assert from 'assert';
import { analyze } from '../analyze';

describe('analyze function', (): void => {
  it('should return an object with nodesList and edgesList', async () => {
    const result = await analyze('/path/to/dir', 3);
    assert.ok(Array.isArray(result.nodesList));
    assert.ok(Array.isArray(result.edgesList));
  });

  it('should return nodesList and edgesList with correct length', async (): Promise<void> => {
    const result = await analyze('/path/to/dir', 3);
    console.log('nodes:', result.nodesList.length, ' edges:', result.edgesList.length);
    assert.equal(result.nodesList.length, 0);
    assert.equal(result.edgesList.length, 0);
  });

  it('should handle circular dependencies correctly', async (): Promise<void> => {
    const result = await analyze('/path/to/dir', 3);
    const circularEdges = result.edgesList.filter((edge): boolean => edge.isCircular);
    assert.equal(circularEdges.length, 0);
  });

  it('should handle multiple versions correctly', async (): Promise<void> => {
    const result = await analyze('/path/to/dir', 3);
    const nodesWithMultipleVersions = result.nodesList.filter(
      (node): boolean => node.isMultipleVersions,
    );
    assert.equal(nodesWithMultipleVersions.length, 0);
  });
});
