// ============================================
// AUTHENTICATION & AUTHORIZATION SYSTEM
// ============================================

require('dotenv').config();

// ============================================
// ADMIN ACCOUNTS (từ environment variables)
// ============================================

const ADMIN_ACCOUNTS = {
    owner: {
        username: process.env.OWNER_USERNAME || 'owner',
        password: process.env.OWNER_PASSWORD || 'CHANGE_THIS_PASSWORD',
        role: 'owner'
    },
    admin1: {
        username: process.env.ADMIN1_USERNAME || 'admin1',
        password: process.env.ADMIN1_PASSWORD || 'CHANGE_THIS_PASSWORD',
        role: 'admin'
    },
    admin2: {
        username: process.env.ADMIN2_USERNAME || 'admin2',
        password: process.env.ADMIN2_PASSWORD || 'CHANGE_THIS_PASSWORD',
        role: 'admin'
    },
    admin3: {
        username: process.env.ADMIN3_USERNAME || 'admin3',
        password: process.env.ADMIN3_PASSWORD || 'CHANGE_THIS_PASSWORD',
        role: 'admin'
    }
};

// ============================================
// LOGIN ATTEMPTS TRACKING
// ============================================

const loginAttempts = {}; // { username: { count, lockUntil, lockCount } }
const blockedIPs = {}; // { ip: { reason, blockedAt, permanent } }
const accessRequests = []; // Admin access requests
const notifications = []; // Admin notifications
const pendingAdminLogins = {}; // { requestId: { username, ip, timestamp, status: 'pending'|'approved'|'denied' } }

// ============================================
// HELPER FUNCTIONS
// ============================================

function isAdmin(username) {
    return Object.values(ADMIN_ACCOUNTS).some(admin => admin.username === username);
}

function getAdminRole(username) {
    const admin = Object.values(ADMIN_ACCOUNTS).find(a => a.username === username);
    return admin ? admin.role : null;
}

function isOwner(username) {
    return ADMIN_ACCOUNTS.owner.username === username;
}

// Create admin login request
function createAdminLoginRequest(username, ip) {
    const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    pendingAdminLogins[requestId] = {
        requestId,
        username,
        ip,
        timestamp: new Date(),
        status: 'pending'
    };
    
    // Add notification for owner
    addNotification({
        type: 'ADMIN_LOGIN_REQUEST',
        message: `Admin ${username} is requesting to login`,
        details: {
            username,
            ip,
            requestId,
            timestamp: new Date()
        },
        timestamp: new Date(),
        requestId // Link to the request
    });
    
    console.log(`⏳ Admin login request created: ${username} from ${ip}`);
    
    return requestId;
}

// Approve admin login request
function approveAdminLogin(requestId) {
    if (pendingAdminLogins[requestId]) {
        pendingAdminLogins[requestId].status = 'approved';
        pendingAdminLogins[requestId].approvedAt = new Date();
        
        console.log(`✅ Admin login approved: ${pendingAdminLogins[requestId].username}`);
        
        return { success: true, request: pendingAdminLogins[requestId] };
    }
    return { success: false, message: 'Request not found' };
}

// Deny admin login request and ban IP
function denyAdminLogin(requestId, reason = 'Unauthorized access attempt') {
    if (pendingAdminLogins[requestId]) {
        const request = pendingAdminLogins[requestId];
        request.status = 'denied';
        request.deniedAt = new Date();
        
        // Ban the IP permanently
        blockIP(request.ip, reason, true);
        
        console.log(`❌ Admin login denied and IP banned: ${request.username} from ${request.ip}`);
        
        return { success: true, request };
    }
    return { success: false, message: 'Request not found' };
}

function checkLoginAttempts(username) {
    const attempts = loginAttempts[username];
    
    if (!attempts) return { allowed: true };
    
    // Check if locked
    if (attempts.lockUntil && Date.now() < attempts.lockUntil) {
        const remainingMinutes = Math.ceil((attempts.lockUntil - Date.now()) / 60000);
        return {
            allowed: false,
            locked: true,
            remainingMinutes
        };
    }
    
    // Reset if lock expired
    if (attempts.lockUntil && Date.now() >= attempts.lockUntil) {
        delete loginAttempts[username];
        return { allowed: true };
    }
    
    return { allowed: true };
}

function recordFailedLogin(username, ip = null) {
    if (!loginAttempts[username]) {
        loginAttempts[username] = { count: 0, lockCount: 0 };
    }
    
    loginAttempts[username].count++;
    
    // Lock after 5 failed attempts
    if (loginAttempts[username].count >= 5) {
        const lockCount = loginAttempts[username].lockCount || 0;
        const lockDuration = 10 * Math.pow(2, lockCount); // 10, 20, 40, 80 minutes...
        
        loginAttempts[username].lockUntil = Date.now() + (lockDuration * 60000);
        loginAttempts[username].lockCount = lockCount + 1;
        loginAttempts[username].count = 0;
        
        console.log(`🔒 Account ${username} locked for ${lockDuration} minutes${ip ? ` (IP: ${ip})` : ''}`);
        
        return { locked: true, duration: lockDuration, remainingAttempts: 0 };
    }
    
    return { locked: false, remainingAttempts: 5 - loginAttempts[username].count };
}

function resetLoginAttempts(username) {
    delete loginAttempts[username];
}

function isIPBlocked(ip) {
    const blocked = blockedIPs[ip];
    
    if (!blocked) return false;
    
    // Permanent block
    if (blocked.permanent) return true;
    
    // Temporary block (30 minutes)
    if (blocked.blockedUntil && Date.now() < blocked.blockedUntil) {
        return true;
    }
    
    // Expired temporary block
    if (blocked.blockedUntil && Date.now() >= blocked.blockedUntil) {
        delete blockedIPs[ip];
        return false;
    }
    
    return false;
}

function blockIP(ip, reason, permanent = false) {
    if (!blockedIPs[ip]) {
        blockedIPs[ip] = {
            reason,
            blockedAt: new Date(),
            permanent,
            blockedUntil: permanent ? null : Date.now() + (30 * 60000) // 30 minutes
        };
        
        console.log(`🚫 IP ${ip} blocked ${permanent ? 'permanently' : 'for 30 minutes'}: ${reason}`);
        
        // Add notification
        addNotification({
            type: 'IP_BLOCKED',
            message: `IP ${ip} blocked ${permanent ? 'permanently' : 'temporarily'}`,
            details: { ip, reason, permanent },
            timestamp: new Date()
        });
    } else if (!blockedIPs[ip].permanent && permanent) {
        // Upgrade to permanent block
        blockedIPs[ip].permanent = true;
        blockedIPs[ip].blockedUntil = null;
        
        console.log(`🚫 IP ${ip} upgraded to permanent block`);
    }
}

function createAccessRequest(username, ip) {
    const request = {
        id: Date.now().toString(),
        username,
        ip,
        requestedAt: new Date(),
        status: 'pending'
    };
    
    accessRequests.push(request);
    
    // Notify owner
    addNotification({
        type: 'ACCESS_REQUEST',
        message: `User ${username} requesting admin access`,
        details: request,
        timestamp: new Date()
    });
    
    return request;
}

function handleAccessRequest(requestId, approved, ownerUsername) {
    const request = accessRequests.find(r => r.id === requestId);
    
    if (!request) return { success: false, error: 'Request not found' };
    
    request.status = approved ? 'approved' : 'rejected';
    request.handledBy = ownerUsername;
    request.handledAt = new Date();
    
    if (!approved) {
        // Check if this is second rejection
        const previousRejections = accessRequests.filter(
            r => r.ip === request.ip && r.status === 'rejected'
        ).length;
        
        if (previousRejections >= 1) {
            // Second rejection - permanent block
            blockIP(request.ip, 'Multiple admin access rejections', true);
        } else {
            // First rejection - 30 minute block
            blockIP(request.ip, 'Admin access rejected', false);
        }
    }
    
    return { success: true, request };
}

function addNotification(notification) {
    notifications.unshift(notification);
    
    // Keep only last 100 notifications
    if (notifications.length > 100) {
        notifications.pop();
    }
}

function getPredefinedAdmins() {
    return Object.values(ADMIN_ACCOUNTS).reduce((acc, admin) => {
        acc[admin.username] = {
            username: admin.username,
            password: admin.password,
            role: admin.role,
            isAdmin: true,
            isOwner: admin.role === 'owner',
            createdAt: new Date('2024-01-01'),
            lastActivity: new Date(),
            uploadedFiles: []
        };
        return acc;
    }, {});
}

function authenticateUser(username, password, usersDatabase) {
    // Check admin accounts first
    const admin = Object.values(ADMIN_ACCOUNTS).find(a => a.username === username);
    
    if (admin) {
        if (admin.password === password) {
            return {
                success: true,
                isAdmin: true,
                user: {
                    username: admin.username,
                    role: admin.role,
                    createdAt: new Date('2024-01-01'),
                    isAdmin: true
                }
            };
        } else {
            return {
                success: false,
                message: 'Invalid password'
            };
        }
    }
    
    // Check regular users
    const user = usersDatabase[username];
    
    if (!user) {
        return {
            success: false,
            message: 'User not found'
        };
    }
    
    if (user.password !== password) {
        return {
            success: false,
            message: 'Invalid password'
        };
    }
    
    return {
        success: true,
        isAdmin: false,
        user: {
            username: user.username,
            createdAt: user.createdAt,
            isAdmin: false
        }
    };
}

// Check if admin login is approved
function checkAdminLoginStatus(requestId) {
    return pendingAdminLogins[requestId] || null;
}

// Get all pending admin login requests
function getPendingAdminLogins() {
    return Object.values(pendingAdminLogins).filter(req => req.status === 'pending');
}

// Get admin access requests (legacy - for backward compatibility)
function getAdminAccessRequests() {
    return accessRequests;
}

// Handle admin access request (legacy - for backward compatibility)
function handleAdminAccessRequest(requestId, approved, ownerUsername) {
    return handleAccessRequest(requestId, approved, ownerUsername);
}

// Get owner notifications (legacy - for backward compatibility)
function getOwnerNotifications() {
    return notifications;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    isAdmin,
    getAdminRole,
    checkLoginAttempts,
    recordFailedLogin,
    resetLoginAttempts,
    isIPBlocked,
    blockIP,
    createAccessRequest,
    handleAccessRequest,
    getAccessRequests: () => accessRequests,
    getNotifications: () => notifications,
    getBlockedIPs: () => blockedIPs,
    addNotification,
    getPredefinedAdmins,
    authenticateUser,
    isOwner,
    createAdminLoginRequest,
    approveAdminLogin,
    denyAdminLogin,
    checkAdminLoginStatus,
    getPendingAdminLogins,
    getAdminAccessRequests,
    handleAdminAccessRequest,
    getOwnerNotifications
};
