/**
 * JWT Service
 * Handles JWT token generation, validation, and refresh
 * Used for admin panel authentication
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/environment');
const db = require('../config/database');
const logger = require('../utils/logger').createModuleLogger('JWTService');
const { AuthenticationError } = require('../utils/errors');
const encryptionService = require('./encryption.service');

class JWTService {
  constructor() {
    this.jwtSecret = config.jwt.secret;
    this.jwtExpiry = config.jwt.expiry;
    this.refreshSecret = config.jwt.refreshSecret;
    this.refreshExpiry = config.jwt.refreshExpiry;
  }

  /**
   * Generate access token
   * @param {Object} user - User object
   * @returns {string} - JWT token
   */
  generateAccessToken(user) {
    try {
      const payload = {
        sub: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        two_factor_enabled: !!user.two_factor_enabled,
        type: 'access'
      };

      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiry,
        issuer: 'multi-db-api',
        audience: 'multi-db-api-admin'
      });

      logger.debug(`Access token generated for user: ${user.username}`);

      return token;
    } catch (error) {
      logger.error('Failed to generate access token:', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Generate refresh token
   * @param {Object} user - User object
   * @returns {Promise<string>} - Refresh token
   */
  async generateRefreshToken(user) {
    try {
      // Generate random token
      const token = encryptionService.generateRandom(64);
      const tokenHash = encryptionService.hash(token);

      // Calculate expiry date
      const expiresAt = this.calculateExpiry(this.refreshExpiry);

      // Store in database
      await db.execute(`
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES (?, ?, ?)
      `, [user.id, tokenHash, expiresAt.toISOString()]);

      logger.debug(`Refresh token generated for user: ${user.username}`);

      return token;
    } catch (error) {
      logger.error('Failed to generate refresh token:', error);
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} user - User object
   * @returns {Promise<Object>} - {accessToken, refreshToken}
   */
  async generateTokens(user) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiry(this.jwtExpiry)
    };
  }

  /**
   * Verify access token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded token payload
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'multi-db-api',
        audience: 'multi-db-api-admin'
      });

      if (decoded.type !== 'access') {
        throw new AuthenticationError('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify and use refresh token
   * @param {string} token - Refresh token
   * @returns {Promise<Object>} - User object
   */
  async verifyRefreshToken(token) {
    try {
      const tokenHash = encryptionService.hash(token);

      // Find token in database
      const result = await db.queryOne(`
        SELECT rt.*, u.*
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token_hash = ?
          AND rt.revoked_at IS NULL
          AND rt.expires_at > datetime('now')
      `, [tokenHash]);

      if (!result) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      // Check if user is active
      if (!result.is_active) {
        throw new AuthenticationError('User account is disabled');
      }

      return {
        id: result.user_id,
        username: result.username,
        email: result.email,
        role: result.role,
        two_factor_enabled: result.two_factor_enabled
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error('Failed to verify refresh token:', error);
      throw new AuthenticationError('Token verification failed');
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} - New tokens
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token and get user
      const user = await this.verifyRefreshToken(refreshToken);

      // Generate new access token
      const accessToken = this.generateAccessToken(user);

      logger.info(`Access token refreshed for user: ${user.username}`);

      return {
        accessToken,
        expiresIn: this.parseExpiry(this.jwtExpiry)
      };
    } catch (error) {
      logger.error('Failed to refresh access token:', error);
      throw error;
    }
  }

  /**
   * Revoke a refresh token
   * @param {string} token - Refresh token
   * @returns {Promise<boolean>}
   */
  async revokeRefreshToken(token) {
    try {
      const tokenHash = encryptionService.hash(token);

      const result = await db.execute(`
        UPDATE refresh_tokens
        SET revoked_at = datetime('now')
        WHERE token_hash = ?
      `, [tokenHash]);

      logger.info(`Refresh token revoked (affected: ${result.changes})`);

      return result.changes > 0;
    } catch (error) {
      logger.error('Failed to revoke refresh token:', error);
      throw error;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} - Number of tokens revoked
   */
  async revokeAllUserTokens(userId) {
    try {
      const result = await db.execute(`
        UPDATE refresh_tokens
        SET revoked_at = datetime('now')
        WHERE user_id = ?
          AND revoked_at IS NULL
      `, [userId]);

      logger.info(`All refresh tokens revoked for user ID: ${userId} (count: ${result.changes})`);

      return result.changes;
    } catch (error) {
      logger.error('Failed to revoke user tokens:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired tokens
   * @returns {Promise<number>} - Number of tokens deleted
   */
  async cleanupExpiredTokens() {
    try {
      const result = await db.execute(`
        DELETE FROM refresh_tokens
        WHERE expires_at < datetime('now')
          OR revoked_at IS NOT NULL
      `);

      logger.info(`Expired refresh tokens cleaned up (count: ${result.changes})`);

      return result.changes;
    } catch (error) {
      logger.error('Failed to cleanup expired tokens:', error);
      throw error;
    }
  }

  /**
   * Decode token without verification (for inspection)
   * @param {string} token - JWT token
   * @returns {Object|null} - Decoded payload
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate expiry date from expiry string
   * @param {string} expiryString - Expiry string (e.g., '24h', '7d')
   * @returns {Date}
   */
  calculateExpiry(expiryString) {
    const match = expiryString.match(/^(\d+)([smhd])$/);

    if (!match) {
      throw new Error('Invalid expiry format');
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const now = new Date();

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        throw new Error('Invalid expiry unit');
    }
  }

  /**
   * Parse expiry string to seconds
   * @param {string} expiryString - Expiry string
   * @returns {number} - Seconds
   */
  parseExpiry(expiryString) {
    const match = expiryString.match(/^(\d+)([smhd])$/);

    if (!match) {
      return 3600; // Default: 1 hour
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 3600;
    }
  }
}

// Export singleton instance
module.exports = new JWTService();
