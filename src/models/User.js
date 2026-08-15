import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: 'ParkSmart User' },
    mobile: { type: String, required: true, unique: true, trim: true },
    avatar: { type: String, default: '' },
    wallet: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
