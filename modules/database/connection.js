// =====================================================
// DATABASE CONNECTION MODULE FOR VENDORS MICROSERVICE
// Handles PostgreSQL connections with connection pooling
// =====================================================

import pg from 'pg';
import config from '../../config/config.js';
import logger from '../../utils/logger.js';

const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl,
  max: config.database.maxConnections,
  idleTimeoutMillis: config.database.idleTimeout,
  connectionTimeoutMillis: config.database.connectionTimeout,
  
  // Connection pool settings
  allowExitOnIdle: false,
  maxUses: 7500, // Close connections after 7500 queries
  
  // Application name for monitoring
  application_name: 'badr-vendors-microservice',
});

// Event listeners for pool management
pool.on('connect', (client) => {
  logger.info('New database client connected', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
});

pool.on('acquire', (client) => {
  logger.debug('Client acquired from pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
});

pool.on('release', (client) => {
  logger.debug('Client released back to pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
});

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', {
    error: err.message,
    stack: err.stack,
    clientId: client?.processID,
  });
});

pool.on('remove', (client) => {
  logger.info('Client removed from pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
});

// Health check function
export const checkDatabaseHealth = async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return { healthy: true, message: 'Database connection is healthy' };
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Database health check failed', {
      error: error.message,
      stack: error.stack,
    });
    return { 
      healthy: false, 
      message: 'Database connection failed',
      error: error.message 
    };
  }
};

// Get pool statistics
export const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
};

// Graceful shutdown
export const closePool = async () => {
  try {
    logger.info('Closing database connection pool...');
    await pool.end();
    logger.info('Database connection pool closed successfully');
  } catch (error) {
    logger.error('Error closing database connection pool', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Transaction helper
export const withTransaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Query helper with automatic client management
export const query = async (text, params = []) => {
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Database query executed', {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      rowCount: result.rowCount,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    logger.error('Database query failed', {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params: params.length > 0 ? params : undefined,
      duration: `${duration}ms`,
      error: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    });
    
    throw error;
  }
};

// Export the pool and helper functions
export default pool;
export { 
  checkDatabaseHealth, 
  getPoolStats, 
  closePool, 
  withTransaction,
  query 
};
