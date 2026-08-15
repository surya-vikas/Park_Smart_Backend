import mongoose from 'mongoose';

export const VEHICLE_TYPES = ['Car', 'Bike', 'EV'];

const vehicleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicleType: { type: String, enum: VEHICLE_TYPES, required: true },
    vehicleNumber: { type: String, required: true, trim: true, uppercase: true },
    nickname: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Vehicle', vehicleSchema);