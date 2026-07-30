const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Client } = require('pg');
require('../src/config/environment');

const TABLES = [
  'users',
  'artists',
  'genres',
  'albums',
  'songs',
  'playlists',
  'playlist_songs',
  'favorites',
  'follows',
  'comments',
  'listening_history',
  'notifications',
  'purchased_songs',
  'purchased_albums',
  'transactions',
  'artist_memberships',
  'premium_listening_stats',
  'reports',
  'artist_withdrawals',
  'revenue_sharing',
];

const ID_COLUMNS = {
  users: 'user_id',
  artists: 'artist_id',
  genres: 'genre_id',
  albums: 'album_id',
  songs: 'song_id',
  playlists: 'playlist_id',
  comments: 'comment_id',
  listening_history: 'history_id',
  notifications: 'notification_id',
  purchased_songs: 'purchase_id',
  purchased_albums: 'purchase_id',
  transactions: 'transaction_id',
  artist_memberships: 'membership_id',
  premium_listening_stats: 'id',
  reports: 'report_id',
  artist_withdrawals: 'withdrawal_id',
  revenue_sharing: 'sharing_id',
};

const NULL_DEFAULTS = {
  users: {
    role: 'user',
    is_banned: 0,
    is_premium: 0,
    balance: 0,
  },
  artists: {
    total_earned: 0,
    total_withdrawn: 0,
    balance: 0,
    wallet_balance: 0,
    membership_price: 0,
    membership_duration_days: 30,
  },
  albums: {
    is_premium: 0,
    price: 0,
  },
  songs: {
    listen_count: 0,
    average_rating: 0,
    is_premium: 0,
    price: 0,
    status: 1,
  },
  playlists: {
    is_public: 0,
  },
  playlist_songs: {
    order: 0,
  },
  listening_history: {
    count: 1,
    total_duration: 0,
    completed_count: 0,
    is_premium_stream: 0,
  },
  notifications: {
    is_read: 0,
  },
  artist_memberships: {
    price_paid: 0,
    status: 'active',
  },
  premium_listening_stats: {
    listen_count: 0,
    total_duration: 0,
    completed_count: 0,
  },
  reports: {
    report_type: 'other',
    status: 'pending',
  },
  artist_withdrawals: {
    fee: 0,
    status: 'pending',
  },
  revenue_sharing: {
    total_amount: 0,
    artist_share: 0,
    artist_percentage: 70,
    platform_share: 0,
    platform_percentage: 30,
    stream_count: 0,
    listen_duration: 0,
    is_paid_to_artist: 0,
  },
};

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteMysqlIdentifier(identifier) {
  return `\`${identifier.replaceAll('`', '``')}\``;
}

function normalizeValue(table, column, value) {
  if (value !== null && value !== undefined) {
    return value;
  }

  return NULL_DEFAULTS[table]?.[column] ?? value;
}

async function getSourceColumns(mysqlConnection, table) {
  const [rows] = await mysqlConnection.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [process.env.DB_NAME, table]
  );

  return rows.map((row) => row.COLUMN_NAME);
}

async function getTargetColumns(postgresClient, table) {
  const result = await postgresClient.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  );

  return result.rows.map((row) => row.column_name);
}

async function assertTargetIsEmpty(postgresClient) {
  const nonEmptyTables = [];

  for (const table of TABLES) {
    const result = await postgresClient.query(
      `SELECT EXISTS (SELECT 1 FROM ${quoteIdentifier(table)} LIMIT 1) AS has_rows`
    );

    if (result.rows[0].has_rows) {
      nonEmptyTables.push(table);
    }
  }

  if (nonEmptyTables.length > 0) {
    throw new Error(
      `Supabase đã có dữ liệu trong các bảng: ${nonEmptyTables.join(', ')}. ` +
        'Dừng migration để tránh ghi trùng.'
    );
  }
}

async function migrateTable(mysqlConnection, postgresClient, table) {
  const [sourceRows] = await mysqlConnection.query(
    `SELECT * FROM ${quoteMysqlIdentifier(table)}`
  );

  if (sourceRows.length === 0) {
    console.log(`- ${table}: 0 bản ghi`);
    return 0;
  }

  const sourceColumns = await getSourceColumns(mysqlConnection, table);
  const targetColumns = new Set(await getTargetColumns(postgresClient, table));
  const sharedColumns = sourceColumns.filter((column) => targetColumns.has(column));
  const columnSql = sharedColumns.map(quoteIdentifier).join(', ');
  const placeholders = sharedColumns.map((_, index) => `$${index + 1}`).join(', ');
  const insertSql = `INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES (${placeholders})`;

  for (const row of sourceRows) {
    const values = sharedColumns.map((column) =>
      normalizeValue(table, column, row[column])
    );
    await postgresClient.query(insertSql, values);
  }

  console.log(`- ${table}: ${sourceRows.length} bản ghi`);
  return sourceRows.length;
}

async function resetIdentitySequences(postgresClient) {
  for (const [table, idColumn] of Object.entries(ID_COLUMNS)) {
    await postgresClient.query(
      `SELECT setval(
         pg_get_serial_sequence($1, $2),
         COALESCE((SELECT MAX(${quoteIdentifier(idColumn)}) FROM ${quoteIdentifier(table)}), 1),
         EXISTS (SELECT 1 FROM ${quoteIdentifier(table)})
       )`,
      [table, idColumn]
    );
  }
}

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu DATABASE_URL trong backend/.env');
  }

  const mysqlConnection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    dateStrings: false,
  });

  const postgresClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  try {
    await postgresClient.connect();

    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, '..', 'src', 'database', 'schema.sql'),
      'utf8'
    );
    await postgresClient.query(schemaSql);
    await assertTargetIsEmpty(postgresClient);

    await postgresClient.query('BEGIN');
    let totalRows = 0;

    try {
      for (const table of TABLES) {
        totalRows += await migrateTable(mysqlConnection, postgresClient, table);
      }

      await resetIdentitySequences(postgresClient);
      await postgresClient.query('COMMIT');
      console.log(`Migration hoàn tất: ${totalRows} bản ghi đã được chuyển.`);
    } catch (error) {
      await postgresClient.query('ROLLBACK');
      throw error;
    }
  } finally {
    await mysqlConnection.end();
    await postgresClient.end();
  }
}

migrate().catch((error) => {
  console.error('Migration thất bại:', error.message);
  process.exitCode = 1;
});
