jest.mock('../src/config/database', () => ({
  execute: jest.fn(),
  query: jest.fn(),
}));

const db = require('../src/config/database');
const AlbumModel = require('../src/models/album.model');

describe('AlbumModel.checkAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns normalized album access using one database query', async () => {
    db.execute.mockResolvedValue([
      [
        {
          album_id: 7,
          has_access: true,
          access_type: 'purchased',
          release_date: new Date('2026-01-01T00:00:00Z'),
        },
      ],
    ]);

    const result = await AlbumModel.checkAccess(7, 42);

    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(db.execute.mock.calls[0][1]).toEqual([42, 42, 7]);
    expect(result).toEqual({
      album_id: 7,
      hasAccess: true,
      accessType: 'purchased',
      release_date: new Date('2026-01-01T00:00:00Z'),
    });
  });

  it('returns null when the album does not exist', async () => {
    db.execute.mockResolvedValue([[]]);

    await expect(AlbumModel.checkAccess(999, 42)).resolves.toBeNull();
  });
});
