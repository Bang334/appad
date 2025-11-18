require('dotenv').config();
const db = require('./src/config/database');

async function test() {
  try {
    console.log('Testing MySQL connection...');
    
    // Test query with parseInt
    const [rows] = await db.execute(
      'SELECT * FROM songs ORDER BY listen_count DESC LIMIT ?',
      [parseInt(10)]
    );
    
    console.log('✅ Query successful!');
    console.log(`Found ${rows.length} songs`);
    console.log('First song:', rows[0]?.title);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('SQL:', error.sql);
    process.exit(1);
  }
}

test();

