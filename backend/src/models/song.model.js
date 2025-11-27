const db = require('../config/database');

class SongModel {
  // Create new song
  static async create(songData) {
    const { title, artist_id, album_id, genre_id, duration, file_url, cover_url, release_date, lyrics, is_premium, price } = songData;
    const [result] = await db.execute(
      'INSERT INTO songs (title, artist_id, album_id, genre_id, duration, file_url, cover_url, release_date, lyrics, is_premium, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, artist_id || null, album_id || null, genre_id || null, duration, file_url, cover_url || null, release_date || null, lyrics || null, is_premium || 0, price || 0]
    );
    return result.insertId;
  }

  // Get song by ID
  static async findById(songId) {
    const [rows] = await db.execute(
      `SELECT s.*, 
              a.name as artist_name, 
              al.title as album_title, 
              g.name as genre_name,
              COALESCE(rc.rating_count, 0) as rating_count
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       LEFT JOIN (
         SELECT song_id, COUNT(*) as rating_count
         FROM comments
         WHERE rating IS NOT NULL
         GROUP BY song_id
       ) rc ON s.song_id = rc.song_id
       WHERE s.song_id = ?`,
      [songId]
    );
    return rows[0];
  }

  // Get all songs with pagination
  static async findAll(limit = 20, offset = 0) {
    limit = parseInt(limit) || 20;
    offset = parseInt(offset) || 0;
    const [rows] = await db.query(
      `SELECT s.*, 
              a.name as artist_name, 
              al.title as album_title, 
              g.name as genre_name,
              COALESCE(rc.rating_count, 0) as rating_count
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       LEFT JOIN (
         SELECT song_id, COUNT(*) as rating_count
         FROM comments
         WHERE rating IS NOT NULL
         GROUP BY song_id
       ) rc ON s.song_id = rc.song_id
       ORDER BY s.song_id DESC
       LIMIT ${limit} OFFSET ${offset}`
    );
    return rows;
  }

  // Search songs
  static async search(keyword, limit = 20) {
    limit = parseInt(limit) || 20;
    const [rows] = await db.execute(
      `SELECT s.*, 
              a.name as artist_name, 
              al.title as album_title, 
              g.name as genre_name,
              COALESCE(rc.rating_count, 0) as rating_count
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       LEFT JOIN (
         SELECT song_id, COUNT(*) as rating_count
         FROM comments
         WHERE rating IS NOT NULL
         GROUP BY song_id
       ) rc ON s.song_id = rc.song_id
       WHERE s.title LIKE ? OR a.name LIKE ?
       LIMIT ${limit}`,
      [`%${keyword}%`, `%${keyword}%`]
    );
    return rows;
  }

  // Get songs by artist
  static async findByArtist(artistId) {
    const [rows] = await db.execute(
      `SELECT s.*, 
              a.name as artist_name, 
              al.title as album_title, 
              g.name as genre_name,
              COALESCE(rc.rating_count, 0) as rating_count
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       LEFT JOIN (
         SELECT song_id, COUNT(*) as rating_count
         FROM comments
         WHERE rating IS NOT NULL
         GROUP BY song_id
       ) rc ON s.song_id = rc.song_id
       WHERE s.artist_id = ?`,
      [artistId]
    );
    return rows;
  }

  // Get songs by album
  static async findByAlbum(albumId) {
    const [rows] = await db.execute(
      `SELECT s.*, 
              a.name as artist_name, 
              al.title as album_title, 
              g.name as genre_name,
              COALESCE(rc.rating_count, 0) as rating_count
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       LEFT JOIN (
         SELECT song_id, COUNT(*) as rating_count
         FROM comments
         WHERE rating IS NOT NULL
         GROUP BY song_id
       ) rc ON s.song_id = rc.song_id
       WHERE s.album_id = ?
       ORDER BY s.song_id ASC`,
      [albumId]
    );
    return rows;
  }

  // Get songs by genre
  static async findByGenre(genreId) {
    const [rows] = await db.execute(
      `SELECT s.*, 
              a.name as artist_name, 
              al.title as album_title, 
              g.name as genre_name,
              COALESCE(rc.rating_count, 0) as rating_count
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       LEFT JOIN (
         SELECT song_id, COUNT(*) as rating_count
         FROM comments
         WHERE rating IS NOT NULL
         GROUP BY song_id
       ) rc ON s.song_id = rc.song_id
       WHERE s.genre_id = ?`,
      [genreId]
    );
    return rows;
  }

  // Get trending songs (most listened)
  static async getTrending(limit = 10) {
    limit = parseInt(limit) || 10;
    const [rows] = await db.query(
      `SELECT s.*, 
              a.name as artist_name, 
              al.title as album_title, 
              g.name as genre_name,
              COALESCE(rc.rating_count, 0) as rating_count
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       LEFT JOIN (
         SELECT song_id, COUNT(*) as rating_count
         FROM comments
         WHERE rating IS NOT NULL
         GROUP BY song_id
       ) rc ON s.song_id = rc.song_id
       ORDER BY s.listen_count DESC
       LIMIT ${limit}`
    );
    return rows;
  }

  // Update song
  static async update(songId, songData) {
    const fields = [];
    const values = [];

    Object.keys(songData).forEach(key => {
      if (songData[key] !== undefined && key !== 'song_id') {
        fields.push(`${key} = ?`);
        values.push(songData[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(songId);
    const [result] = await db.execute(
      `UPDATE songs SET ${fields.join(', ')} WHERE song_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  // Increment listen count
  static async incrementListenCount(songId) {
    const [result] = await db.execute(
      'UPDATE songs SET listen_count = listen_count + 1 WHERE song_id = ?',
      [songId]
    );
    return result.affectedRows > 0;
  }

  // Delete song
  static async delete(songId) {
    const [result] = await db.execute(
      'DELETE FROM songs WHERE song_id = ?',
      [songId]
    );
    return result.affectedRows > 0;
  }

  // Check if user has access to a song (premium check)
  static async checkAccess(songId, userId) {
    const song = await this.findById(songId);
    if (!song) return { hasAccess: false, reason: 'Song not found' };
    
    // If not premium song, everyone can access
    if (!song.is_premium) return { hasAccess: true, song };

    // Check if user is the artist of this song (artist can always access their own songs)
    if (song.artist_id) {
      const [artistRows] = await db.execute(
        'SELECT user_id FROM artists WHERE artist_id = ?',
        [song.artist_id]
      );
      
      if (artistRows.length > 0 && artistRows[0].user_id === userId) {
        return { hasAccess: true, song, accessType: 'artist_owner' };
      }
    }

    // If premium song, check if user has premium or purchased it
    const [userRows] = await db.execute(
      'SELECT is_premium, premium_expiry FROM users WHERE user_id = ?',
      [userId]
    );
    
    const user = userRows[0];
    if (!user) return { hasAccess: false, reason: 'User not found' };

    // Check if user has active premium subscription
    if (user.is_premium && user.premium_expiry && new Date(user.premium_expiry) > new Date()) {
      return { hasAccess: true, song, accessType: 'premium' };
    }

    // Check if user purchased this song
    const [purchaseRows] = await db.execute(
      'SELECT purchase_id FROM purchased_songs WHERE user_id = ? AND song_id = ?',
      [userId, songId]
    );

    if (purchaseRows.length > 0) {
      return { hasAccess: true, song, accessType: 'purchased' };
    }

    // Check if user purchased the album containing this song
    if (song.album_id) {
      const [albumPurchaseRows] = await db.execute(
        'SELECT purchase_id FROM purchased_albums WHERE user_id = ? AND album_id = ?',
        [userId, song.album_id]
      );

      if (albumPurchaseRows.length > 0) {
        return { hasAccess: true, song, accessType: 'album_purchased' };
      }
    }

    // Check if user has active artist membership for this song's artist
    if (song.artist_id) {
      const ArtistMembershipModel = require('./artist-membership.model');
      const hasMembership = await ArtistMembershipModel.hasActiveMembership(userId, song.artist_id);
      if (hasMembership) {
        return { hasAccess: true, song, accessType: 'artist_membership' };
      }
    }

    return { hasAccess: false, reason: 'Premium subscription, purchase, or artist membership required', song };
  }

  // Get all premium songs
  static async findPremium(limit = 20, offset = 0) {
    limit = parseInt(limit) || 20;
    offset = parseInt(offset) || 0;
    const [rows] = await db.query(
      `SELECT s.*, 
              a.name as artist_name, 
              al.title as album_title, 
              g.name as genre_name,
              COALESCE(rc.rating_count, 0) as rating_count
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       LEFT JOIN (
         SELECT song_id, COUNT(*) as rating_count
         FROM comments
         WHERE rating IS NOT NULL
         GROUP BY song_id
       ) rc ON s.song_id = rc.song_id
       WHERE s.is_premium = 1
       ORDER BY s.song_id DESC
       LIMIT ${limit} OFFSET ${offset}`
    );
    return rows;
  }
}


module.exports = SongModel;

