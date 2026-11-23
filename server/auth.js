/**
 * auth.js — JWT-based authentication and authorization.
 * Enterprise production: token-based auth with role-based access control.
 */
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'amaya-nspector-default-secret-change-in-production';
const TOKEN_EXPIRY_MS = parseInt(process.env.TOKEN_EXPIRY_MS || '86400000', 10); // 24h default

// In-memory user store (replace with DB in production)
const users = new Map();
const roles = {
  admin: ['read', 'write', 'delete', 'sync', 'export', 'manage_users'],
  operator: ['read', 'write', 'sync'],
  viewer: ['read'],
};

// Default admin user (change in production via env)
const defaultAdmin = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin',
  role: 'admin',
};
users.set(defaultAdmin.username, { ...defaultAdmin, createdAt: new Date().toISOString() });

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

function generateToken(user) {
  const payload = {
    username: user.username,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + TOKEN_EXPIRY_MS,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Allow anonymous access with viewer role (read-only)
    req.user = { username: 'anonymous', role: 'viewer' };
    return next();
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token', requestId: req.requestId });
  }
  req.user = payload;
  next();
}

function authorize(permission) {
  return (req, res, next) => {
    const user = req.user || { role: 'viewer' };
    const userRole = roles[user.role] || [];
    if (!userRole.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions', requestId: req.requestId });
    }
    next();
  };
}

function login(username, password) {
  const user = users.get(username);
  if (!user) return null;
  if (hashPassword(password) !== hashPassword(user.password)) return null;
  return { token: generateToken(user), user: { username: user.username, role: user.role } };
}

function register(username, password, role = 'viewer') {
  if (users.has(username)) return { error: 'User already exists' };
  if (!roles[role]) return { error: 'Invalid role' };
  const user = { username, password, role, createdAt: new Date().toISOString() };
  users.set(username, user);
  return { token: generateToken(user), user: { username, role } };
}

module.exports = {
  authenticate,
  authorize,
  login,
  register,
  verifyToken,
  hashPassword,
  roles,
  users,
};