import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/index.js';
import User from '../models/User.js';
import Provider from '../models/Provider.js';

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
};

export const authUser = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: 'Not authorized' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    req.userRole = 'user';
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized' });
  }
};

export const authProvider = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: 'Not authorized' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const provider = await Provider.findById(decoded.id);
    if (!provider) return res.status(401).json({ message: 'Provider not found' });
    req.provider = provider;
    req.userRole = 'provider';
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized' });
  }
};

export const authAny = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: 'Not authorized' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const [user, provider] = await Promise.all([
      User.findById(decoded.id),
      Provider.findById(decoded.id),
    ]);
    if (user) {
      req.user = user;
      req.userRole = 'user';
      return next();
    }
    if (provider) {
      req.provider = provider;
      req.userRole = 'provider';
      return next();
    }
    return res.status(401).json({ message: 'Not authorized' });
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized' });
  }
};