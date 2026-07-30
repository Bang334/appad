const db = require('./src/config/database');

async function testConnection() {
  try {
    const [rows] = await db.query(`
      SELECT
        current_database() AS database_name,
        current_user AS user_name,
        current_schema() AS schema_name,
        NOW() AS server_time
    `);

    console.log('Kết nối Supabase PostgreSQL thành công!');
    console.table(rows);
  } catch (error) {
    console.error('Kết nối Supabase PostgreSQL thất bại:', error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

testConnection();
