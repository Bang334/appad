const db = require('../config/database');

class SongModel {
  // Create new song
  static async create(songData) {
    let { title, artist_id, album_id, genre_id, duration, file_url, cover_url, release_date, lyrics, is_premium, price, status } = songData;
    
    // If release date is in the future, automatically set status to 0 (Hidden/Scheduled)
    if (release_date && new Date(release_date) > new Date()) {
      status = 0;
    }

    const [result] = await db.execute(
      'INSERT INTO songs (title, artist_id, album_id, genre_id, duration, file_url, cover_url, release_date, lyrics, is_premium, price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, artist_id || null, album_id || null, genre_id || null, duration, file_url, cover_url || null, release_date || null, lyrics || null, is_premium || 0, price || 0, status !== undefined ? status : 1]
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

  // Get all songs with pagination (only active songs for users)
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
       WHERE s.status = 1
       ORDER BY s.song_id DESC
       LIMIT ${limit} OFFSET ${offset}`
    );
    return rows;
  }

  // Search songs (only active songs)
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
       WHERE s.status = 1 AND (s.title LIKE ? OR a.name LIKE ?)
       LIMIT ${limit}`,
      [`%${keyword}%`, `%${keyword}%`]
    );
    return rows;
  }

  // Get songs by artist (ALL songs - for artist management, regardless of status)
  static async findByArtist(artistId, includeHidden = true) {
    const statusFilter = includeHidden ? '' : 'AND s.status = 1';
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
       WHERE s.artist_id = ? ${statusFilter}`,
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

  // Get songs by genre (only active songs)
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
       WHERE s.genre_id = ? AND s.status = 1`,
      [genreId]
    );
    return rows;
  }

  // Get trending songs (most listened, only active)
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
       WHERE s.status = 1
       ORDER BY s.listen_count DESC
       LIMIT ${limit}`
    );
    return rows;
  }

  // Update song
  static async update(songId, songData) {
    // If updating release date to the future, automatically set status to 0 (Hidden)
    if (songData.release_date && new Date(songData.release_date) > new Date()) {
      songData.status = 0;
    }

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

  // Get top songs by artist (for followed artists preview)
  static async findTopSongsByArtist(artistId, limit = 3) {
    limit = parseInt(limit) || 3;
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
       WHERE s.artist_id = ? AND s.status = 1
       ORDER BY s.listen_count DESC
       LIMIT ?`,
      [artistId, limit]
    );
    return rows;
  }

  // Get recommendations for user with Weighted Scoring and Detailed Logging
  static async getRecommendations(userId, limit = 20) {
    limit = parseInt(limit) || 20;

    console.log(`\n🔍 [RECOMMENDATION] Starting calculation for User ${userId}...`);

    // 1. Calculate Artist Scores with Breakdown
    const [artistAnalysis] = await db.query(
      `SELECT 
        artist_id, 
        SUM(score) as total_score,
        SUM(CASE WHEN source = 'membership' THEN score ELSE 0 END) as membership_score,
        SUM(CASE WHEN source = 'follow' THEN score ELSE 0 END) as follow_score,
        SUM(CASE WHEN source = 'purchase' THEN score ELSE 0 END) as purchase_score,
        SUM(CASE WHEN source = 'favorite' THEN score ELSE 0 END) as favorite_score,
        SUM(CASE WHEN source = 'listen' THEN score ELSE 0 END) as listen_score
      FROM (
        -- Membership
        SELECT artist_id, 50 as score, 'membership' as source FROM artist_memberships WHERE user_id = ? AND status = 'active'
        UNION ALL
        -- Follows
        SELECT artist_id, 20 as score, 'follow' as source FROM follows WHERE user_id = ?
        UNION ALL
        -- Purchases
        SELECT s.artist_id, COUNT(*) * 10 as score, 'purchase' as source
        FROM purchased_songs ps 
        JOIN songs s ON ps.song_id = s.song_id 
        WHERE ps.user_id = ? AND s.artist_id IS NOT NULL 
        GROUP BY s.artist_id
        UNION ALL
        -- Favorites
        SELECT s.artist_id, COUNT(*) * 5 as score, 'favorite' as source
        FROM favorites f 
        JOIN songs s ON f.song_id = s.song_id 
        WHERE f.user_id = ? AND s.artist_id IS NOT NULL 
        GROUP BY s.artist_id
        UNION ALL
        -- Listening History
        SELECT artist_id, SUM(count) * 1 as score, 'listen' as source
        FROM listening_history 
        WHERE user_id = ? AND artist_id IS NOT NULL 
        GROUP BY artist_id
      ) as scores 
      GROUP BY artist_id 
      ORDER BY total_score DESC 
      LIMIT 30`,
      [userId, userId, userId, userId, userId]
    );

    // 2. Calculate Genre Scores with Breakdown
    const [genreAnalysis] = await db.query(
      `SELECT 
        genre_id, 
        SUM(score) as total_score,
        SUM(CASE WHEN source = 'purchase' THEN score ELSE 0 END) as purchase_score,
        SUM(CASE WHEN source = 'favorite' THEN score ELSE 0 END) as favorite_score,
        SUM(CASE WHEN source = 'listen' THEN score ELSE 0 END) as listen_score
      FROM (
        -- Purchases
        SELECT s.genre_id, COUNT(*) * 5 as score, 'purchase' as source
        FROM purchased_songs ps 
        JOIN songs s ON ps.song_id = s.song_id 
        WHERE ps.user_id = ? AND s.genre_id IS NOT NULL 
        GROUP BY s.genre_id
        UNION ALL
        -- Favorites
        SELECT s.genre_id, COUNT(*) * 3 as score, 'favorite' as source
        FROM favorites f 
        JOIN songs s ON f.song_id = s.song_id 
        WHERE f.user_id = ? AND s.genre_id IS NOT NULL 
        GROUP BY s.genre_id
        UNION ALL
        -- Listening History
        SELECT s.genre_id, SUM(lh.count) * 1 as score, 'listen' as source
        FROM listening_history lh
        JOIN songs s ON lh.song_id = s.song_id
        WHERE lh.user_id = ? AND s.genre_id IS NOT NULL 
        GROUP BY s.genre_id
      ) as scores 
      GROUP BY genre_id 
      ORDER BY total_score DESC 
      LIMIT 10`,
      [userId, userId, userId]
    );

    // Create Maps for O(1) Lookup and Detailed Logging
    const artistScoreMap = new Map();
    const artistDetailsMap = new Map();
    const topArtistIds = [];
    
    artistAnalysis.forEach(row => {
      artistScoreMap.set(row.artist_id, parseFloat(row.total_score));
      artistDetailsMap.set(row.artist_id, row);
      topArtistIds.push(row.artist_id);
    });

    const genreScoreMap = new Map();
    const genreDetailsMap = new Map();
    const topGenreIds = [];
    
    genreAnalysis.forEach(row => {
      genreScoreMap.set(row.genre_id, parseFloat(row.total_score));
      genreDetailsMap.set(row.genre_id, row);
      topGenreIds.push(row.genre_id);
    });

    console.log(`📊 Found ${topArtistIds.length} interested artists and ${topGenreIds.length} interested genres.`);

    // If no interests found, return trending
    if (topArtistIds.length === 0 && topGenreIds.length === 0) {
      console.log('⚠️ No interests found. Returning Trending songs.');
      return this.getTrending(limit);
    }

    // 3. Query Candidates
    let conditions = [];
    if (topArtistIds.length > 0) conditions.push(`s.artist_id IN (${topArtistIds.join(',')})`);
    if (topGenreIds.length > 0) conditions.push(`s.genre_id IN (${topGenreIds.join(',')})`);
    
    if (conditions.length === 0) return this.getTrending(limit);

    const candidateLimit = 100;
    const [candidates] = await db.query(
      `SELECT s.*, 
              a.name as artist_name, 
              al.title as album_title, 
              g.name as genre_name
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       WHERE s.status = 1 
         AND (${conditions.join(' OR ')})
         AND NOT EXISTS (
           SELECT 1 FROM listening_history lh 
           WHERE lh.song_id = s.song_id AND lh.user_id = ?
         )
       LIMIT ?`,
      [userId, candidateLimit]
    );

    console.log(`🧐 Scoring ${candidates.length} candidate songs...`);

    // 4. Score & Rank Candidates
    const scoredCandidates = candidates.map(song => {
      let breakdownLog = [];
      let score = 0;
      
      // Personalization Score: Artist
      if (song.artist_id) {
        const aScore = artistScoreMap.get(song.artist_id) || 0;
        if (aScore > 0) {
          score += aScore;
          const details = artistDetailsMap.get(song.artist_id);
          breakdownLog.push(`Artist (${song.artist_name}): +${aScore} [Mem:${details.membership_score}, Fol:${details.follow_score}, Buy:${details.purchase_score}, Fav:${details.favorite_score}, Lis:${details.listen_score}]`);
        }
      }

      // Personalization Score: Genre
      if (song.genre_id) {
        const gScore = genreScoreMap.get(song.genre_id) || 0;
        if (gScore > 0) {
          score += gScore;
          const details = genreDetailsMap.get(song.genre_id);
          breakdownLog.push(`Genre (${song.genre_name}): +${gScore} [Buy:${details.purchase_score}, Fav:${details.favorite_score}, Lis:${details.listen_score}]`);
        }
      }
      
      // Popularity Boost
      if (song.listen_count > 0) {
        const popScore = Math.log10(song.listen_count) * 2;
        score += popScore;
        breakdownLog.push(`Popularity: +${popScore.toFixed(2)}`);
      }
      
      // Freshness Boost
      if (song.release_date) {
        const daysSinceRelease = (new Date() - new Date(song.release_date)) / (1000 * 60 * 60 * 24);
        if (daysSinceRelease < 30) {
          score += 10;
          breakdownLog.push(`Freshness (<30d): +10`);
        }
      }

      // Detailed Log for top candidates
      // console.log(`🎵 Song: "${song.title}" - Total: ${score.toFixed(2)} | ${breakdownLog.join(', ')}`);

      return { ...song, final_score: score, ranking_log: breakdownLog.join(' | ') };
    });

    // Sort by final_score DESC
    scoredCandidates.sort((a, b) => b.final_score - a.final_score);

    // Log the top 5 for debugging clarity
    console.log(`🏆 TOP 5 RECOMMENDATIONS for User ${userId}:`);
    scoredCandidates.slice(0, 5).forEach((s, i) => {
      console.log(`  #${i+1} [${s.final_score.toFixed(1)}] ${s.title} (${s.artist_name}) -> ${s.ranking_log}`);
    });

    if (scoredCandidates.length < limit) {
      const trending = await this.getTrending(limit - scoredCandidates.length);
      const existingIds = new Set(scoredCandidates.map(s => s.song_id));
      const newTrending = trending.filter(t => !existingIds.has(t.song_id));
      return [...scoredCandidates, ...newTrending];
    }

    return scoredCandidates.slice(0, limit);
  }
}


module.exports = SongModel;

