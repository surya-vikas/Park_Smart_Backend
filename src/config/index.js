import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/parksmart';
export const JWT_SECRET = process.env.JWT_SECRET || 'parksmart_dev_secret_change_me';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const DEV_OTP = process.env.DEV_OTP || '123456';
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
