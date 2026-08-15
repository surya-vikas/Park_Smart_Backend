import User from '../models/User.js';
import Provider from '../models/Provider.js';
import bcrypt from 'bcryptjs';
import { signToken } from '../utils/token.js';
import { DEV_OTP } from '../config/index.js';

export const requestOtp = async (req, res, next) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ message: 'Mobile number is required' });
    const cleanMobile = mobile.trim();
    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      return res.status(400).json({ message: 'Enter a valid 10-digit mobile number' });
    }
    // Dev only: no real SMS. OTP is fixed.
    return res.json({ message: 'OTP sent successfully', devOtp: DEV_OTP });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) return res.status(400).json({ message: 'Mobile and OTP are required' });
    const cleanMobile = String(mobile).trim();
    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      return res.status(400).json({ message: 'Enter a valid 10-digit mobile number' });
    }

    if (String(otp).trim() !== DEV_OTP) {
      return res.status(400).json({ message: 'Invalid OTP. Use ' + DEV_OTP + ' in development.' });
    }

    let user = await User.findOne({ mobile: cleanMobile });
    if (!user) {
      user = await User.create({ mobile: cleanMobile });
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        mobile: user.mobile,
        avatar: user.avatar,
        wallet: user.wallet,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const user = req.user;
    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();
    res.json({
      _id: user._id,
      name: user.name,
      mobile: user.mobile,
      avatar: user.avatar,
      wallet: user.wallet,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      _id: user._id,
      name: user.name,
      mobile: user.mobile,
      avatar: user.avatar,
      wallet: user.wallet,
    });
  } catch (error) {
    next(error);
  }
};

export const registerProvider = async (req, res, next) => {
  try {
    const { name, mobile, email, password } = req.body;
    if (!name || !mobile || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const exists = await Provider.findOne({ $or: [{ email: email.toLowerCase() }, { mobile }] });
    if (exists) {
      return res.status(400).json({ message: 'Email or mobile already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const provider = await Provider.create({ name, mobile, email, password: hashed });
    const token = signToken(provider._id);
    res.status(201).json({
      token,
      provider: {
        _id: provider._id,
        name: provider.name,
        mobile: provider.mobile,
        email: provider.email,
        wallet: provider.wallet,
        bankDetails: provider.bankDetails || {},
      },
    });
  } catch (error) {
    next(error);
  }
};

export const loginProvider = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const provider = await Provider.findOne({ email: email.toLowerCase() });
    if (!provider) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, provider.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = signToken(provider._id);
    res.json({
      token,
      provider: {
        _id: provider._id,
        name: provider.name,
        mobile: provider.mobile,
        email: provider.email,
        wallet: provider.wallet,
        bankDetails: provider.bankDetails || {},
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProviderProfile = async (req, res, next) => {
  try {
    const { name, mobile, email, avatar, password } = req.body;
    const provider = req.provider;
    if (name) provider.name = name;
    if (mobile) provider.mobile = mobile;
    if (email) provider.email = email.toLowerCase();
    if (avatar !== undefined) provider.avatar = avatar;
    if (password) {
      if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
      provider.password = await bcrypt.hash(password, 10);
    }
    await provider.save();
    res.json({
      _id: provider._id,
      name: provider.name,
      mobile: provider.mobile,
      email: provider.email,
      avatar: provider.avatar,
      wallet: provider.wallet,
      bankDetails: provider.bankDetails || {},
    });
  } catch (error) {
    next(error);
  }
};

export const getProviderMe = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.provider._id);
    res.json({
      _id: provider._id,
      name: provider.name,
      mobile: provider.mobile,
      email: provider.email,
      avatar: provider.avatar,
      wallet: provider.wallet,
      bankDetails: provider.bankDetails || {},
    });
  } catch (error) {
    next(error);
  }
};