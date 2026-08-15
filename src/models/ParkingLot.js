import mongoose from 'mongoose';

export const FACILITY_OPTIONS = ['CCTV', 'Security', 'Covered', 'EV Charging', '24x7'];
export const SLOT_STATUSES = ['AVAILABLE', 'BOOKED', 'OCCUPIED', 'MAINTENANCE'];

const parkingLotSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    area: { type: String, default: '', trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    contactNumber: { type: String, default: '' },
    totalSlots: { type: Number, required: true, min: 1 },
    pricePerHour: { type: Number, required: true, min: 0 },
    openingTime: { type: String, default: '06:00' },
    closingTime: { type: String, default: '23:00' },
    facilities: { type: [String], default: [] },
    image: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

parkingLotSchema.index({ city: 1, area: 1 });
parkingLotSchema.index({ latitude: 1, longitude: 1 });

export default mongoose.model('ParkingLot', parkingLotSchema);
