const db = require('./src/config/database');

async function fixOrphanedRevenueSharing() {
  try {
    console.log('Starting to fix orphaned revenue_sharing records...');
    
    // 1. Find revenue_sharing records with null transaction_id
    const [orphans] = await db.execute(
      `SELECT rs.sharing_id, rs.artist_id, rs.artist_share, rs.created_at, a.user_id
       FROM revenue_sharing rs
       JOIN artists a ON rs.artist_id = a.artist_id
       WHERE rs.share_type = 'premium_stream' AND rs.transaction_id IS NULL`
    );
    
    console.log(`Found ${orphans.length} orphaned records.`);
    
    for (const orphan of orphans) {
      // 2. Find matching transaction
      // Criteria: user_id matches artist's user_id, type is 'revenue', amount matches, 
      // and created_at is very close (within 1 minute)
      const [matches] = await db.execute(
        `SELECT transaction_id FROM transactions 
         WHERE user_id = ? AND type = 'revenue' AND amount = ?
         AND ABS(TIMESTAMPDIFF(SECOND, created_at, ?)) < 60
         LIMIT 1`,
        [orphan.user_id, orphan.artist_share, orphan.created_at]
      );
      
      if (matches.length > 0) {
        const transactionId = matches[0].transaction_id;
        console.log(`Linking sharing ${orphan.sharing_id} to transaction ${transactionId}`);
        await db.execute(
          'UPDATE revenue_sharing SET transaction_id = ? WHERE sharing_id = ?',
          [transactionId, orphan.sharing_id]
        );
      } else {
        console.log(`No match found for sharing ${orphan.sharing_id} (Artist: ${orphan.artist_id}, Amount: ${orphan.artist_share})`);
      }
    }
    
    console.log('Cleanup finished.');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing orphans:', error);
    process.exit(1);
  }
}

fixOrphanedRevenueSharing();
