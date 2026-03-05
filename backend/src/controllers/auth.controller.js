/**
 * Auth Controller
 * Handles authentication and authorization
 */

const UserModel = require('../models/User');
const jwtService = require('../services/jwt.service');
const { successResponse, errorResponse } = require('../utils/response');
const { AuthenticationError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger').createModuleLogger('AuthController');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

class AuthController {
  /**
   * User login
   * @route POST /admin/login
   */
  async login(req, res, next) {
    try {
      let { username, password } = req.body;

      try {
        require('fs').appendFileSync('c:/api/backend/auth_debug.log', `${new Date().toISOString()} - Login attempt: ${username} (IP: ${req.ip})\n`);
      } catch (e) { }

      logger.info(`Login attempt - IP: ${req.ip}, Username: '${username}'`);

      if (!username || !password) {
        throw new ValidationError('Username and password are required');
      }

      // Trim inputs
      username = username.trim();
      password = password.trim();

      // Verify credentials
      const user = await UserModel.verifyPassword(username, password);

      if (!user) {
        logger.warn(`Login failed for username: ${username}`);
        throw new AuthenticationError('Invalid username or password');
      }

      // 2FA Check
      if (user.two_factor_enabled) {
        const { twoFactorCode } = req.body;

        if (!twoFactorCode) {
          // Tell frontend that 2FA is required
          return res.status(200).json({
            require2fa: true,
            username: user.username
          });
        }

        // Verify 2FA code
        try {
          // Fetch secret explicitly as it is stripped from user object
          const userWithSecret = await UserModel.findByIdWithSecret(user.id);
          
          console.log(`[2FA Debug] User: ${user.username}, Secret Length: ${userWithSecret?.two_factor_secret?.length}, Token: ${twoFactorCode}`);

          let verified = speakeasy.totp.verify({
            secret: userWithSecret.two_factor_secret,
            encoding: 'base32',
            token: twoFactorCode,
            window: 2 // Increased window further to 2 (1 minute drift) for testing
          });
          
          console.log(`[2FA Debug] Verification Result: ${verified}`);

          if (!verified) {
            // Check if it's a recovery code
            const recoveryCodes = JSON.parse(userWithSecret.two_factor_recovery_codes || '[]');
            if (recoveryCodes.includes(twoFactorCode)) {
                verified = true;
                logger.info(`Recovery code used for user: ${user.username}`);
                
                // Remove used code (burn it)
                const newCodes = recoveryCodes.filter(c => c !== twoFactorCode);
                await UserModel.update(user.id, {
                    two_factor_recovery_codes: JSON.stringify(newCodes)
                });
            }
          }

          if (!verified) {
            throw new AuthenticationError('Invalid 2FA verification code');
          }
        } catch (err) {
            // Handle missing user secret or other speakeasy errors
            logger.error('2FA Verification error', err);
            throw new AuthenticationError('Invalid 2FA verification code');
        }
      }

      // Generate tokens
      const { accessToken, refreshToken, expiresIn } = await jwtService.generateTokens(user);

      logger.info(`User logged in: ${user.username}`);

      return successResponse(res, {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          two_factor_enabled: !!user.two_factor_enabled
        },
        accessToken,
        refreshToken,
        expiresIn
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * @route POST /admin/refresh
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      // Refresh access token
      const { accessToken, expiresIn } = await jwtService.refreshAccessToken(refreshToken);

      return successResponse(res, {
        accessToken,
        expiresIn
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   * @route POST /admin/logout
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Revoke refresh token
        await jwtService.revokeRefreshToken(refreshToken);
      }

      logger.info(`User logged out: ${req.user?.username}`);

      return successResponse(res, {
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user info
   * @route GET /admin/me
   */
  async me(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      return successResponse(res, user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Username
   * @route POST /admin/update-username
   */
  async updateUsername(req, res, next) {
    try {
      const { newUsername, password } = req.body;

      if (!newUsername || !password) {
        throw new ValidationError('New username and current password are required');
      }

      // Verify password
      const user = await UserModel.verifyPassword(req.user.username, password);
      if (!user) {
        throw new AuthenticationError('Invalid password');
      }

      // Check if new username is taken
      const existing = await UserModel.findByUsername(newUsername);
      if (existing) {
        throw new ValidationError('Username is already taken');
      }

      // Update username
      await UserModel.update(req.user.id, { 
        username: newUsername 
      });

      // Revoke tokens because token contains username
      await jwtService.revokeAllUserTokens(req.user.id);

      return successResponse(res, {
        message: 'Username updated successfully. Please log in again.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Email
   * @route POST /admin/update-email
   */
  async updateEmail(req, res, next) {
    try {
      const { newEmail, password } = req.body;

      if (!newEmail || !password) {
        throw new ValidationError('New email and current password are required');
      }

      // Verify password
      const user = await UserModel.verifyPassword(req.user.username, password);
      if (!user) {
        throw new AuthenticationError('Invalid password');
      }

      // Check if new email is taken
      const existing = await UserModel.findByEmail(newEmail);
      if (existing) {
        throw new ValidationError('Email is already registered');
      }

      // Update email
      await UserModel.update(req.user.id, { 
        email: newEmail 
      });

      return successResponse(res, {
        message: 'Email updated successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   * @route POST /admin/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new ValidationError('Current password and new password are required');
      }

      // Verify current password
      const user = await UserModel.verifyPassword(req.user.username, currentPassword);

      if (!user) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Update password
      await UserModel.update(req.user.id, { password: newPassword });

      // Revoke all refresh tokens for security
      await jwtService.revokeAllUserTokens(req.user.id);

      logger.info(`Password changed for user: ${req.user.username}`);

      return successResponse(res, {
        message: 'Password changed successfully. Please log in again.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Setup Two-Factor Authentication
   * Helper to generate secret and QR code
   * @route POST /admin/2fa/setup
   */
  async setupTwoFactor(req, res, next) {
    try {
      const secret = speakeasy.generateSecret({
        name: `Yapi (${req.user.username})`
      });

      // Generate QR Code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // We DON'T save the secret yet. Client must verify it first.
      // But we need to save it temporarily or send it to client to send back.
      // Easiest is to send it to client, and client sends it back with the verification code.
      // OR securely, save it to DB but keep enabled=false.
      
      // Let's save it to DB but enabled=false
      // Generate Recovery Codes
      const recoveryCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));

      // Let's save it to DB but enabled=false
      await UserModel.update(req.user.id, {
        two_factor_secret: secret.base32,
        two_factor_recovery_codes: JSON.stringify(recoveryCodes),
        two_factor_enabled: 0 // Not enabled yet
      });

      return successResponse(res, {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        recoveryCodes
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify and Enable 2FA
   * @route POST /admin/2fa/verify
   */
  async verifyTwoFactor(req, res, next) {
    try {
      const { token } = req.body; // User's 6 digit code
      
      // We need the secret from DB (it was saved in setup step)
      // Since we filtered it out in findById, we need to fetch it explicitly via DB query directly 
      // or use a specialized model method. 
      // Accessing DB directly here for simplicity as UserModel filters it.
      const db = require('../config/database');
      const userSensitive = await db.queryOne('SELECT two_factor_secret FROM users WHERE id = ?', [req.user.id]);

      if (!userSensitive || !userSensitive.two_factor_secret) {
        throw new ValidationError('2FA setup not initialized');
      }

      const verified = speakeasy.totp.verify({
        secret: userSensitive.two_factor_secret,
        encoding: 'base32',
        token
      });

      if (!verified) {
        throw new AuthenticationError('Invalid verification code');
      }

      // Enable 2FA
      await UserModel.update(req.user.id, {
        two_factor_enabled: 1
      });

      logger.info(`2FA enabled for user: ${req.user.username}`);

      return successResponse(res, {
        message: 'Two-factor authentication enabled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable 2FA
   * @route POST /admin/2fa/disable
   */
  async disableTwoFactor(req, res, next) {
    try {
      const { password } = req.body;
      
      if (!password) {
        throw new ValidationError('Password is required to disable 2FA');
      }

      // Verify password again for security
      const user = await UserModel.verifyPassword(req.user.username, password);
      
      if (!user) {
        throw new AuthenticationError('Invalid password');
      }

      await UserModel.update(req.user.id, {
        two_factor_enabled: 0,
        two_factor_secret: null
      });

      logger.info(`2FA disabled for user: ${req.user.username}`);

      return successResponse(res, {
        message: 'Two-factor authentication disabled'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
