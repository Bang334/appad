jest.mock('../src/config/database', () => ({
  execute: jest.fn(),
  query: jest.fn(),
}));

const db = require('../src/config/database');
const SongModel = require('../src/models/song.model');

describe('SongModel.checkAccessBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks all unique song IDs with one database query', async () => {
    db.execute.mockResolvedValue([
      [
        {
          song_id: 1,
          has_access: true,
          access_type: 'premium',
        },
        {
          song_id: 2,
          has_access: false,
          access_type: null,
        },
      ],
    ]);

    const result = await SongModel.checkAccessBatch(
      [1, 2, 2, 'invalid'],
      42
    );

    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(db.execute.mock.calls[0][1]).toEqual([42, 42, 42, 42, 1, 2]);
    expect(result).toEqual([
      {
        song_id: 1,
        hasAccess: true,
        accessType: 'premium',
      },
      {
        song_id: 2,
        hasAccess: false,
        accessType: null,
      },
    ]);
  });

  it('does not query the database for an empty song list', async () => {
    await expect(SongModel.checkAccessBatch([], 42)).resolves.toEqual([]);
    expect(db.execute).not.toHaveBeenCalled();
  });
});
