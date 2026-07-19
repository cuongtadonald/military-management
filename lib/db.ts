import sql from 'mssql';

const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'QlyQuanLuc',
  user: process.env.DB_USER || 'quanluc',
  password: process.env.DB_PASSWORD || '',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let pool: sql.ConnectionPool | null = null;

export async function getPool() {
  if (!pool) {
    try {
      console.log('Dang ket noi den SQL Server...');
      console.log('Server:', dbConfig.server);
      console.log('Database:', dbConfig.database);
      console.log('Port:', dbConfig.port);

      pool = await sql.connect(dbConfig);
      console.log('✅ Ket noi SQL Server thanh cong! TVC222');
    } catch (error) {
      console.error('❌ Loi ket noi SQL Server:', error);
      throw error;
    }
  }
  return pool;
}

export default sql;