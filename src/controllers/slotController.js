import ParkingLot from '../models/ParkingLot.js';
import ParkingSlot from '../models/ParkingSlot.js';
import Booking from '../models/Booking.js';

const ensureOwner = async (parkingId, providerId) => {
  const lot = await ParkingLot.findById(parkingId);
  if (!lot) return { error: 'Parking not found', status: 404 };
  if (String(lot.provider) !== String(providerId)) {
    return { error: 'Not authorized to manage this parking', status: 403 };
  }
  return { lot };
};

export const getSlotsByParking = async (req, res, next) => {
  try {
    const check = await ensureOwner(req.params.id, req.provider._id);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const slots = await ParkingSlot.find({ parking: req.params.id }).sort({ slotNumber: 1 });
    res.json(slots);
  } catch (error) {
    next(error);
  }
};

export const setSlotStatus = async (req, res, next) => {
  try {
    const { slotId, status } = req.body;
    if (!['AVAILABLE', 'MAINTENANCE'].includes(status)) {
      return res.status(400).json({ message: 'Status must be AVAILABLE or MAINTENANCE' });
    }

    const slot = await ParkingSlot.findById(slotId);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });

    const check = await ensureOwner(String(slot.parking), req.provider._id);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const now = new Date();
    if (status === 'AVAILABLE') {
      const active = await Booking.exists({
        slot: slot._id,
        status: { $in: ['UPCOMING', 'OCCUPIED'] },
      });
      if (active) {
        return res.status(400).json({ message: 'Cannot make an actively booked slot available' });
      }
      slot.status = 'AVAILABLE';
    } else {
      const parked = await Booking.exists({
        slot: slot._id,
        status: { $in: ['UPCOMING', 'OCCUPIED'] },
        startTime: { $lte: now },
        endTime: { $gt: now },
      });
      if (parked) {
        return res.status(400).json({ message: 'Cannot put an actively occupied slot in maintenance' });
      }
      slot.status = 'MAINTENANCE';
    }

    await slot.save();
    res.json(slot);
  } catch (error) {
    next(error);
  }
};

export const markMaintenance = async (req, res, next) => {
  try {
    const slot = await ParkingSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    const check = await ensureOwner(String(slot.parking), req.provider._id);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const now = new Date();
    const parked = await Booking.exists({
      slot: slot._id,
      status: { $in: ['UPCOMING', 'OCCUPIED'] },
      startTime: { $lte: now },
      endTime: { $gt: now },
    });
    if (parked) return res.status(400).json({ message: 'Cannot mark an actively occupied slot as maintenance' });

    slot.status = 'MAINTENANCE';
    await slot.save();
    res.json(slot);
  } catch (error) {
    next(error);
  }
};

export const makeAvailable = async (req, res, next) => {
  try {
    const slot = await ParkingSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    const check = await ensureOwner(String(slot.parking), req.provider._id);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const active = await Booking.exists({
      slot: slot._id,
      status: { $in: ['UPCOMING', 'OCCUPIED'] },
    });
    if (active) return res.status(400).json({ message: 'Cannot make an actively booked slot available' });

    slot.status = 'AVAILABLE';
    await slot.save();
    res.json(slot);
  } catch (error) {
    next(error);
  }
};