/**
 * Role Permissions Configuration
 * Now fetches permissions dynamically from backend
 */

import axios from '../services/api';

// Cache for role permissions
let permissionsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 0; // Disabled cache to avoid stale data issues

/**
 * Clear permissions cache
 */
export const clearPermissionsCache = () => {
    permissionsCache = null;
    cacheTimestamp = null;
};

/**
 * Fetch role permissions from backend
 */
export const fetchRolePermissions = async (forceRefresh = false) => {
    try {
        // Check cache first
        if (!forceRefresh && permissionsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
            return permissionsCache;
        }

        const { data } = await axios.get('/admin/roles');
        if (data.success) {
            const permissions = {};
            data.data.forEach(role => {
                permissions[role.name] = role.permissions || [];
            });
            
            permissionsCache = permissions;
            cacheTimestamp = Date.now();
            return permissions;
        }
        
        return {};
    } catch (error) {
        console.error('Failed to fetch role permissions:', error);
        // Return default fallback permissions
        return {
            admin: ['*'],
            developer: ['/', '/analytics', '/data-sources', '/api-endpoints', '/api-keys', '/profile'],
            user: ['/', '/analytics', '/profile']
        };
    }
};

/**
 * Check if a role has access to a path
 * @param {string} role - User role
 * @param {string} path - URL Path
 */
export const hasPermission = async (role, path) => {
    if (!role) return false;
    
    const permissions = await fetchRolePermissions();
    const allowed = permissions[role] || [];
    
    // Check for wildcard permission (admin)
    if (allowed.includes('*')) return true;
    
    // Check if path is in allowed list
    return allowed.includes(path);
};

/**
 * Synchronous version for immediate checks (uses cache)
 * Use this when you already fetched permissions
 */
export const hasPermissionSync = (role, path) => {
    if (!role) return false;
    
    if (!permissionsCache) {
        // Fallback to basic permissions if cache not loaded
        const fallback = {
            admin: ['*'],
            developer: ['/', '/analytics', '/data-sources', '/api-endpoints', '/api-keys', '/profile'],
            user: ['/', '/analytics', '/profile']
        };
        const allowed = fallback[role] || [];
        if (allowed.includes('*')) return true;
        return allowed.includes(path);
    }
    
    const allowed = permissionsCache[role] || [];
    
    // Check for wildcard permission (admin)
    if (allowed.includes('*')) return true;
    
    // Check if path is in allowed list
    return allowed.includes(path);
};

// Export for backward compatibility
export const ROLES = {
    ADMIN: 'admin',
    DEVELOPER: 'developer',
    USER: 'user'
};
