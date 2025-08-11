// =====================================================
// AUTHENTICATION MIDDLEWARE FOR VENDORS MICROSERVICE
// Integrates with auth microservice for token validation
// =====================================================

import axios from 'axios';
import logger from '../utils/logger.js';

// Configuration for auth microservice
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
const AUTH_VALIDATE_ENDPOINT = `${AUTH_SERVICE_URL}/auth/validate`;

/**
 * Middleware to validate JWT tokens by calling the auth microservice
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization header required',
        message: 'Bearer token is required in Authorization header'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        error: 'Token required',
        message: 'JWT token is required'
      });
    }

    // Call auth microservice to validate token
    try {
      const response = await axios.post(AUTH_VALIDATE_ENDPOINT, { token }, {
        timeout: 5000, // 5 second timeout
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'badr-vendors-microservice/1.0'
        }
      });

      if (response.status === 200 && response.data.valid) {
        // Token is valid, attach user info to request
        req.user = {
          uid: response.data.payload.uid,
          role: response.data.payload.role,
          tokenPayload: response.data.payload
        };
        
        logger.info('Token validation successful', {
          uid: req.user.uid,
          role: req.user.role,
          endpoint: req.originalUrl
        });
        
        next();
      } else {
        // Token validation failed
        logger.warn('Token validation failed', {
          token: token.substring(0, 20) + '...',
          response: response.data
        });
        
        return res.status(401).json({
          error: 'Invalid token',
          message: response.data.message || 'Token validation failed'
        });
      }

    } catch (authServiceError) {
      // Handle auth service communication errors
      if (authServiceError.code === 'ECONNREFUSED') {
        logger.error('Auth service unavailable', {
          url: AUTH_VALIDATE_ENDPOINT,
          error: authServiceError.message
        });
        
        return res.status(503).json({
          error: 'Authentication service unavailable',
          message: 'Unable to validate token at this time'
        });
      }
      
      if (authServiceError.response) {
        // Auth service returned an error response
        logger.warn('Auth service validation error', {
          status: authServiceError.response.status,
          data: authServiceError.response.data
        });
        
        return res.status(authServiceError.response.status).json({
          error: 'Token validation failed',
          message: authServiceError.response.data.message || 'Token validation failed'
        });
      }
      
      // Other network or timeout errors
      logger.error('Auth service communication error', {
        error: authServiceError.message,
        url: AUTH_VALIDATE_ENDPOINT
      });
      
      return res.status(500).json({
        error: 'Authentication service error',
        message: 'Unable to validate token due to service error'
      });
    }

  } catch (error) {
    logger.error('Token validation middleware error', {
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Token validation failed due to internal error'
    });
  }
};

/**
 * Role-based access control middleware
 * @param {string|Array} requiredRoles - Required role(s) for access
 * @returns {Function} Express middleware function
 */
export const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to access this resource'
      });
    }

    const userRole = req.user.role;
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    if (!roles.includes(userRole)) {
      logger.warn('Insufficient permissions', {
        uid: req.user.uid,
        userRole,
        requiredRoles: roles,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Access denied. Required role(s): ${roles.join(', ')}`
      });
    }

    logger.info('Role-based access granted', {
      uid: req.user.uid,
      role: userRole,
      endpoint: req.originalUrl
    });
    
    next();
  };
};

/**
 * Vendor-specific access control middleware
 * Ensures user can only access their own vendor data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const requireVendorAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to access this resource'
      });
    }

    // Only vendors can access vendor-specific endpoints
    if (req.user.role !== 'vendor') {
      return res.status(403).json({
        error: 'Vendor access required',
        message: 'This endpoint is only accessible to vendors'
      });
    }

    // For endpoints that require vendor ID, ensure user owns the vendor
    const vendorId = req.params.vendorId || req.body.vendorId;
    if (vendorId) {
      // TODO: Implement vendor ownership verification
      // This will be implemented when we update the vendor.js application code
      logger.info('Vendor access granted', {
        uid: req.user.uid,
        vendorId,
        endpoint: req.originalUrl
      });
    }

    next();
  } catch (error) {
    logger.error('Vendor access control error', {
      error: error.message,
      uid: req.user?.uid
    });
    
    return res.status(500).json({
      error: 'Access control error',
      message: 'Unable to verify vendor access at this time'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is provided, but doesn't require it
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user info
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    // Try to validate token, but don't fail if it's invalid
    try {
      const response = await axios.post(AUTH_VALIDATE_ENDPOINT, { token }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'badr-vendors-microservice/1.0'
        }
      });

      if (response.status === 200 && response.data.valid) {
        req.user = {
          uid: response.data.payload.uid,
          role: response.data.payload.role,
          tokenPayload: response.data.payload
        };
        
        logger.info('Optional authentication successful', {
          uid: req.user.uid,
          role: req.user.role
        });
      }
    } catch (error) {
      // Token validation failed, but that's OK for optional auth
      logger.debug('Optional authentication failed', {
        error: error.message
      });
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error', {
      error: error.message
    });
    next(); // Continue even if there's an error
  }
};

export default {
  validateToken,
  requireRole,
  requireVendorAccess,
  optionalAuth
};
