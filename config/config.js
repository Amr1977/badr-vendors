// =====================================================
// CONFIGURATION FOR VENDORS MICROSERVICE
// Centralizes all environment variables and settings
// =====================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Base configuration
const config = {
  // Application
  app: {
    name: 'BADR Vendors Microservice',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3001,
    host: process.env.HOST || 'localhost',
    isDevelopment,
    isProduction,
    isTest,
  },

  // Database (PostgreSQL)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'badr_dp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'yourpassword',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
    connectionString: null, // Will be built dynamically
  },

  // Authentication Service
  auth: {
    serviceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3000',
    validateEndpoint: '/auth/validate',
    timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT) || 5000,
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_here',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },

  // File Upload
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760, // 10MB
    allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/webp').split(','),
    destination: process.env.UPLOAD_DESTINATION || './uploads',
    tempDestination: process.env.UPLOAD_TEMP_DESTINATION || './temp',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: parseInt(process.env.REDIS_DB) || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    filePath: process.env.LOG_FILE_PATH || './logs',
    maxSize: parseInt(process.env.LOG_MAX_SIZE) || 10485760, // 10MB
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
    message: 'Too many requests from this IP, please try again later.',
  },

  // CORS
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001').split(','),
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },

  // Security
  security: {
    helmet: {
      enabled: process.env.HELMET_ENABLED !== 'false',
      contentSecurityPolicy: process.env.HELMET_CONTENT_SECURITY_POLICY === 'true',
      crossOriginResourcePolicy: process.env.HELMET_CROSS_ORIGIN_RESOURCE_POLICY || 'same-site',
    },
    bcrypt: {
      saltRounds: 12,
    },
  },

  // Webhooks
  webhooks: {
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT) || 10000,
    maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY) || 1000,
  },

  // Business Logic
  business: {
    minimumOrderAmount: parseFloat(process.env.MINIMUM_ORDER_AMOUNT) || 5.00,
    maximumDeliveryRadius: parseInt(process.env.MAXIMUM_DELIVERY_RADIUS) || 50000, // meters
    defaultPaginationLimit: parseInt(process.env.DEFAULT_PAGINATION_LIMIT) || 20,
    maxPaginationLimit: parseInt(process.env.MAX_PAGINATION_LIMIT) || 100,
  },

  // External Services
  external: {
    googleMaps: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY || null,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || null,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
    },
  },

  // Monitoring
  monitoring: {
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT) || 9090,
  },

  // Development
  development: {
    debug: process.env.DEBUG === 'true',
    reloadOnChange: process.env.RELOAD_ON_CHANGE === 'true',
    enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
    swaggerUrl: process.env.SWAGGER_URL || '/docs',
  },
};

// Build database connection string
config.database.connectionString = `postgresql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.name}`;

// Build auth service full URL
config.auth.fullValidateUrl = `${config.auth.serviceUrl}${config.auth.validateEndpoint}`;

// Validation functions
config.isValid = () => {
  const required = [
    'database.host',
    'database.name',
    'database.user',
    'database.password',
    'auth.serviceUrl',
  ];

  for (const field of required) {
    const value = field.split('.').reduce((obj, key) => obj?.[key], config);
    if (!value || value === 'yourpassword' || value === 'your_jwt_secret_here') {
      console.warn(`⚠️  Warning: ${field} is not properly configured`);
    }
  }

  return true;
};

// Get configuration for specific environment
config.getForEnvironment = (env) => {
  const envConfig = { ...config };
  
  if (env === 'test') {
    envConfig.database.name = `${envConfig.database.name}_test`;
    envConfig.logging.level = 'error';
    envConfig.rateLimit.maxRequests = 1000; // Higher limit for tests
  }
  
  return envConfig;
};

// Export configuration
export default config;
