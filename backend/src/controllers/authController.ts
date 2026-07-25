import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Basic input validators
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIX_DIGIT_NUMERIC = /^\d{6}$/; // exactly 6 numeric digits
const PHONE_REGEX = /^\d{10}$/; // basic 10-digit phone number (digits only)

function validateEmail(email: string) {
  return EMAIL_REGEX.test(email);
}

function validatePassword(pwd: string) {
  return SIX_DIGIT_NUMERIC.test(pwd);
}

function validatePhone(phone?: string) {
  if (!phone) return true; // optional
  return PHONE_REGEX.test(phone);
}
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    let { name, email, password, role, phone, region } = req.body;

    // Basic sanitization
    name = (name || '').trim();
    email = (email || '').trim().toLowerCase();
    password = (password || '').toString().trim();
    phone = phone ? String(phone).trim() : undefined;
    region = region ? String(region).trim() : undefined;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields: name, email, password, role.' });
    }

    if (!['citizen', 'developer', 'mp'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role selection.' });
    }

    // Validate formats
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password must be exactly 6 numeric digits.' });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ message: 'Phone number must be a 10-digit numeric value.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      region: region || 'Kolkata'
    });
    await newUser.save();

    // Create token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, role: newUser.role, name: newUser.name, region: newUser.region },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as any
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        region: newUser.region
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    let { email, password } = req.body;

    email = (email || '').trim().toLowerCase();
    password = (password || '').toString().trim();

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Basic format validation
    if (!validateEmail(email) || !validatePassword(password)) {
      return res.status(400).json({ message: 'Invalid email or password format.' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Create token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name, region: user.region },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as any
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        region: user.region
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    res.clearCookie('token');
    return res.json({ success: true, message: 'Successfully logged out.' });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    
    // Fetch full user profile
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
}
