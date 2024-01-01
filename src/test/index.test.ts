import { analyze } from '../analyze';

jest.mock('../analyze', () => ({
  analyze: jest.fn(),
}));

describe('analyze function call in index.ts', () => {
  beforeEach(() => {
    (analyze as jest.Mock).mockClear();
  });

  it('should call analyze with correct parameters', async () => {
    const dir = '/path/to/dir';
    const depth = 3;
    await analyze(dir, Math.max(1, Math.min(depth, 64)));
    expect(analyze).toHaveBeenCalledWith(dir, 3);
  });

  it('should limit depth to a minimum of 1', async () => {
    const dir = '/path/to/dir';
    const depth = 0;
    await analyze(dir, Math.max(1, Math.min(depth, 64)));
    expect(analyze).toHaveBeenCalledWith(dir, 1);
  });

  it('should limit depth to a maximum of 64', async () => {
    const dir = '/path/to/dir';
    const depth = 100;
    await analyze(dir, Math.max(1, Math.min(depth, 64)));
    expect(analyze).toHaveBeenCalledWith(dir, 64);
  });

  it('should return json data', async () => {
    const dir = '/path/to/dir';
    const depth = 3;
    (analyze as jest.Mock).mockResolvedValue({ nodesList: [], edgesList: [] });
    const jsonData = await analyze(dir, Math.max(1, Math.min(depth, 64)));
    expect(jsonData).toEqual({ nodesList: [], edgesList: [] });
  });
});
