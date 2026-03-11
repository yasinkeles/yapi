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
            seller: [
                '/seller/dashboard',
                '/seller/profile',
                '/seller/storefront-designer',
                '/seller/products',
                '/seller/orders',
                '/seller/campaigns',
                '/seller/analytics'
            ],
            customer: [
                '/app/dashboard',
                '/app/profile',
                '/app/catalog',
                '/app/cart',
                '/app/orders'
            ]
        };
    }
};

const pathAllowed = (allowed, path) => {
    if (!allowed || allowed.length === 0) return false;
    if (allowed.includes('*')) return true;
    // Exact match
    if (allowed.includes(path)) return true;
    // Wildcard prefix support: entries ending with /* match path prefix
    return allowed.some((entry) => entry.endsWith('/*') && path.startsWith(entry.slice(0, -2)));
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
    return pathAllowed(allowed, path);
};

/**
 * Synchronous version for immediate checks (uses cache)
 * Use this when you already fetched permissions
 */
export const hasPermissionSync = (role, path) => {
    if (!role) return false;
    const fallback = {
        admin: ['*'],
        seller: [
            '/seller/dashboard',
            '/seller/profile',
            '/seller/storefront-designer',
            '/seller/products',
            '/seller/orders',
            '/seller/campaigns',
            '/seller/analytics'
        ],
        customer: [
            '/app/dashboard',
            '/app/profile',
            '/app/catalog',
            '/app/cart',
            '/app/orders'
        ]
    };
    const allowed = (permissionsCache && permissionsCache[role]) || fallback[role] || [];
    return pathAllowed(allowed, path);
};

// Export for backward compatibility
export const ROLES = {
    ADMIN: 'admin',
    SELLER: 'seller',
    CUSTOMER: 'customer'
};
