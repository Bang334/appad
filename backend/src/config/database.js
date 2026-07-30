const { Pool, types } = require('pg');
require('./environment');

types.setTypeParser(20, (value) => Number.parseInt(value, 10));
types.setTypeParser(1700, (value) => Number.parseFloat(value));

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  options: '-c search_path=public -c timezone=Asia/Ho_Chi_Minh',
  max: Number.parseInt(process.env.DB_POOL_MAX, 10) || 10,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
});

function convertPlaceholders(sql) {
  let output = '';
  let parameterIndex = 1;
  let quote = null;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const previousCharacter = sql[index - 1];

    if (quote) {
      output += character;
      if (character === quote && previousCharacter !== '\\') {
        quote = null;
      }
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      output += character;
      continue;
    }

    if (character === '?') {
      output += `$${parameterIndex}`;
      parameterIndex += 1;
      continue;
    }

    output += character;
  }

  return output;
}

function prepareSql(mysqlSql) {
  let postgresSql = convertPlaceholders(mysqlSql);
  postgresSql = postgresSql.replaceAll('`', '"');

  if (
    /^\s*INSERT\s+/i.test(postgresSql) &&
    !/\bRETURNING\b/i.test(postgresSql)
  ) {
    postgresSql = `${postgresSql.trim().replace(/;$/, '')} RETURNING *`;
  }

  return postgresSql;
}

function findInsertedId(row) {
  if (!row) {
    return 0;
  }

  const idColumn = Object.keys(row).find(
    (column) => column === 'id' || column.endsWith('_id')
  );
  return idColumn ? row[idColumn] : 0;
}

function toMysqlCompatibleResult(result, sql) {
  if (/^\s*SELECT\b|^\s*WITH\b/i.test(sql)) {
    return [result.rows, result.fields];
  }

  return [
    {
      insertId: findInsertedId(result.rows[0]),
      affectedRows: result.rowCount,
      changedRows: result.rowCount,
      rows: result.rows,
    },
    result.fields,
  ];
}

function mapPostgresError(error) {
  const postgresCode = error.code;
  const mysqlCodes = {
    23505: 'ER_DUP_ENTRY',
    23503: 'ER_NO_REFERENCED_ROW_2',
    23502: 'ER_BAD_NULL_ERROR',
    '22P02': 'ER_TRUNCATED_WRONG_VALUE',
  };

  if (mysqlCodes[postgresCode]) {
    error.postgresCode = postgresCode;
    error.code = mysqlCodes[postgresCode];
  }

  return error;
}

function createExecutor(client) {
  const run = async (sql, params = []) => {
    const postgresSql = prepareSql(sql);
    const normalizedParams = params.map((value) =>
      value === undefined ? null : value
    );

    try {
      const result = await client.query(postgresSql, normalizedParams);
      return toMysqlCompatibleResult(result, postgresSql);
    } catch (error) {
      throw mapPostgresError(error);
    }
  };

  return {
    query: run,
    execute: run,
  };
}

const executor = createExecutor(pool);

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

module.exports = {
  ...executor,

  async getConnection() {
    const client = await pool.connect();
    const connectionExecutor = createExecutor(client);

    return {
      ...connectionExecutor,
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      release: () => client.release(),
    };
  },

  end: () => pool.end(),
};
