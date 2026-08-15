import mongoose from 'mongoose';
import { SLOT_STATUSES } from './ParkingLot.js';

const parkingSlotSchema = new mongoose.Schema(
  {
    parking: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingLot', required: true },
    slotNumber: { type: String, required: true },
    status: { type: String, enum: SLOT_STATUSES, default: 'AVAILABLE' },
    vehicleType: { type: String, enum: ['Car', 'Bike', 'EV', 'Any'], default: 'Any' },
  },
  { timestamps: true }
);

parkingSlotSchema.index({ parking: 1, slotNumber: 1 }, { unique: true });

export default mongoose.model('ParkingSlot', parkingSlotSchema);
