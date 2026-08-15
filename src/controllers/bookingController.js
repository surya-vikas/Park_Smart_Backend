import Booking from '../models/Booking.js';
import ParkingLot from '../models/ParkingLot.js';
import ParkingSlot from '../models/ParkingSlot.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { DEV_OTP } from '../config/index.js';
import { emitParkingUpdate } from '../utils/io.js';

const MIN_DURATION_MIN = 30;
const MAX_DURATION_MIN = 24 * 60;

const round2 = (n) => Math.round(n * 100) / 100;

const recomputeSlotStatus = async (slotId) => {
  const occupied = await Booking.exists({
    slot: slotId,
    status: 'OCCUPIED',
  });
  if (occupied) return 'OCCUPIED';

  const upcoming = await Booking.exists({
    slot: slotId,
    status: 'UPCOMING',
  });
  if (upcoming) return 'BOOKED';

  return 'AVAILABLE';
};

const genBookingId = async () => {
  let id = '';
  do {
    id = `PS${Math.floor(100000 + Math.random() * 900000)}`;
  } while (await Booking.exists({ bookingId: id }));
  return id;
};

const genEntryOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export const previewBooking = async (req, res, next) => {
  try {
    const { parkingId, slotId, vehicleId, startTime, durationMinutes } = req.body;

    const parking = await ParkingLot.findById(parkingId);
    if (!parking) return res.status(404).json({ message: 'Parking not found' });

    const slot = await ParkingSlot.findById(slotId);
    if (!slot || String(slot.parking) !== String(parking._id)) {
      return res.status(400).json({ message: 'Invalid slot for this parking' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || String(vehicle.user) !== String(req.user._id)) {
      return res.status(400).json({ message: 'Invalid vehicle' });
    }

    const dur = Math.round(Number(durationMinutes));
    if (!dur || dur < MIN_DURATION_MIN || dur > MAX_DURATION_MIN) {
      return res.status(400).json({ message: `Duration must be between ${MIN_DURATION_MIN} minutes and 24 hours` });
    }

    const start = new Date(startTime);
    if (isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid start time' });
    const startFloor = new Date(Math.floor(start.getTime() / 60000) * 60000);
    const end = new Date(startFloor.getTime() + dur * 60000);

    if (startFloor < new Date(Date.now() - 5 * 60000)) {
      return res.status(400).json({ message: 'Start time cannot be in the past' });
    }

    const amount = Math.round((dur / 60) * parking.pricePerHour);

    res.json({
      parking: { _id: parking._id, name: parking.name, pricePerHour: parking.pricePerHour },
      slot: { _id: slot._id, slotNumber: slot.slotNumber },
      vehicle: { _id: vehicle._id, vehicleNumber: vehicle.vehicleNumber, vehicleType: vehicle.vehicleType },
      startTime: startFloor,
      endTime: end,
      durationMinutes: dur,
      amount,
    });
  } catch (error) {
    next(error);
  }
};

export const confirmBooking = async (req, res, next) => {
  try {
    const { parkingId, slotId, vehicleId, startTime, durationMinutes, otp } = req.body;

    if (String(otp || '').trim() !== DEV_OTP) {
      return res.status(400).json({ message: 'Invalid OTP. Use ' + DEV_OTP + ' in development.' });
    }

    const parking = await ParkingLot.findById(parkingId);
    if (!parking) return res.status(404).json({ message: 'Parking not found' });
    if (!parking.active) return res.status(400).json({ message: 'Parking is not accepting bookings' });

    const slot = await ParkingSlot.findById(slotId);
    if (!slot || String(slot.parking) !== String(parking._id)) {
      return res.status(400).json({ message: 'Invalid slot for this parking' });
    }
    if (slot.status === 'MAINTENANCE') {
      return res.status(400).json({ message: 'This slot is under maintenance' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || String(vehicle.user) !== String(req.user._id)) {
      return res.status(400).json({ message: 'Invalid vehicle' });
    }

    const dur = Math.round(Number(durationMinutes));
    if (!dur || dur < MIN_DURATION_MIN || dur > MAX_DURATION_MIN) {
      return res.status(400).json({ message: `Duration must be between ${MIN_DURATION_MIN} minutes and 24 hours` });
    }

    const start = new Date(startTime);
    if (isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid start time' });
    const startFloor = new Date(Math.floor(start.getTime() / 60000) * 60000);
    const end = new Date(startFloor.getTime() + dur * 60000);

    if (startFloor < new Date(Date.now() - 5 * 60000)) {
      return res.status(400).json({ message: 'Start time cannot be in the past' });
    }

    const now = new Date();
    const conflict = await Booking.findOne({
      slot: slot._id,
      status: { $in: ['UPCOMING', 'OCCUPIED'] },
      $expr: {
        $and: [
          { $lt: ['$startTime', end] },
          { $gt: ['$endTime', startFloor] },
        ],
      },
    });

    if (conflict) {
      return res.status(409).json({ message: 'Slot is already booked for the selected time' });
    }

    if (slot.status === 'OCCUPIED') {
      const parked = await Booking.exists({
        slot: slot._id,
        status: 'OCCUPIED',
        $expr: { $and: [{ $lt: ['$startTime', end] }, { $gt: ['$endTime', startFloor] }] },
      });
      if (parked) return res.status(409).json({ message: 'Slot is currently occupied' });
    }

    const amount = Math.round((dur / 60) * parking.pricePerHour);

    if (!req.user.wallet || req.user.wallet < amount) {
      const shortfall = round2(amount - (req.user.wallet || 0));
      return res
        .status(400)
        .json({ message: `Insufficient wallet balance. Add ₹${shortfall} or more and try again.` });
    }

    const booking = await Booking.create({
      bookingId: await genBookingId(),
      user: req.user._id,
      parking: parking._id,
      provider: parking.provider,
      slot: slot._id,
      slotNumber: slot.slotNumber,
      vehicle: vehicle._id,
      vehicleNumber: vehicle.vehicleNumber,
      startTime: startFloor,
      endTime: end,
      durationHours: Number((dur / 60).toFixed(2)),
      amount,
      paymentMethod: 'wallet',
      status: 'UPCOMING',
      entryOtp: genEntryOtp(),
    });

    req.user.wallet = round2(req.user.wallet - amount);
    await req.user.save();

    const provider = await Provider.findById(parking.provider);
    if (provider) {
      provider.wallet = round2(provider.wallet + amount);
      await provider.save();
    }

    await WalletTransaction.create([
      {
        ownerType: 'user',
        owner: req.user._id,
        type: 'PAYMENT',
        amount,
        balanceAfter: req.user.wallet,
        booking: booking._id,
        note: `Payment for ${booking.bookingId} · ${parking.name}`,
      },
      {
        ownerType: 'provider',
        owner: parking.provider,
        type: 'EARNING',
        amount,
        balanceAfter: provider ? provider.wallet : amount,
        booking: booking._id,
        note: `Earning from ${booking.bookingId}`,
      },
    ]);

    slot.status = await recomputeSlotStatus(slot._id);
    await slot.save();

    emitParkingUpdate(parking._id);

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;
    const bookings = await Booking.find(filter)
      .populate('parking', 'name address city area latitude longitude image pricePerHour')
      .populate('slot', 'slotNumber')
      .populate('vehicle', 'vehicleNumber vehicleType')
      .sort({ startTime: -1 });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

export const getProviderBookings = async (req, res, next) => {
  try {
    const { status, parkingId } = req.query;
    const filter = { provider: req.provider._id };
    if (parkingId) filter.parking = parkingId;
    if (status) filter.status = status;
    const bookings = await Booking.find(filter)
      .populate('user', 'name mobile')
      .populate('parking', 'name')
      .populate('vehicle', 'vehicleNumber vehicleType')
      .sort({ startTime: -1 });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name mobile')
      .populate('parking')
      .populate('slot', 'slotNumber')
      .populate('vehicle', 'vehicleNumber vehicleType');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isUser = req.user && String(booking.user._id) === String(req.user._id);
    const isProvider = req.provider && String(booking.provider) === String(req.provider._id);
    if (!isUser && !isProvider) return res.status(403).json({ message: 'Not authorized' });
    res.json(booking);
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (booking.status !== 'UPCOMING') {
      return res.status(400).json({ message: 'Only upcoming bookings can be cancelled' });
    }

    booking.status = 'CANCELLED';
    await booking.save();

    if (booking.paymentMethod === 'wallet') {
      const user = await User.findById(booking.user);
      const provider = await Provider.findById(booking.provider);
      if (user) {
        user.wallet = round2(user.wallet + booking.amount);
        await user.save();
      }
      if (provider) {
        provider.wallet = Math.max(0, round2(provider.wallet - booking.amount));
        await provider.save();
      }
      await WalletTransaction.create([
        {
          ownerType: 'user',
          owner: booking.user,
          type: 'REFUND',
          amount: booking.amount,
          balanceAfter: user ? user.wallet : booking.amount,
          booking: booking._id,
          note: `Refund for ${booking.bookingId}`,
        },
        {
          ownerType: 'provider',
          owner: booking.provider,
          type: 'REFUND',
          amount: booking.amount,
          balanceAfter: provider ? provider.wallet : 0,
          booking: booking._id,
          note: `Refund reversed for ${booking.bookingId}`,
        },
      ]);
    }

    const slot = await ParkingSlot.findById(booking.slot);
    if (slot) {
      slot.status = await recomputeSlotStatus(slot._id);
      await slot.save();
    }

    emitParkingUpdate(booking.parking);

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

export const checkIn = async (req, res, next) => {
  try {
    const { bookingId, entryOtp } = req.body;
    if (!bookingId && !entryOtp) {
      return res.status(400).json({ message: 'Enter booking ID or entry OTP' });
    }

    const query = bookingId
      ? { $or: [{ bookingId: String(bookingId).trim().toUpperCase() }, { entryOtp: String(bookingId).trim() }] }
      : { entryOtp: String(entryOtp).trim() };

    const booking = await Booking.findOne(query);
    if (!booking) return res.status(404).json({ message: 'No booking found' });
    if (String(booking.provider) !== String(req.provider._id)) {
      return res.status(403).json({ message: 'Booking belongs to another provider' });
    }

    if (entryOtp && String(entryOtp).trim() !== booking.entryOtp) {
      return res.status(400).json({ message: 'Invalid entry OTP' });
    }

    if (booking.status === 'OCCUPIED') {
      return res.status(400).json({ message: 'Booking already checked in' });
    }
    if (booking.status !== 'UPCOMING') {
      return res.status(400).json({ message: `Cannot check in a ${booking.status} booking` });
    }
    if (new Date() > booking.endTime) {
      return res.status(400).json({ message: 'Booking window has ended' });
    }

    booking.status = 'OCCUPIED';
    booking.checkInTime = new Date();
    await booking.save();

    const slot = await ParkingSlot.findById(booking.slot);
    if (slot) {
      slot.status = 'OCCUPIED';
      await slot.save();
    }

    emitParkingUpdate(booking.parking);

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findOne({ bookingId: String(bookingId).trim().toUpperCase() });
    if (!booking) return res.status(404).json({ message: 'No booking found' });
    if (String(booking.provider) !== String(req.provider._id)) {
      return res.status(403).json({ message: 'Booking belongs to another provider' });
    }
    if (booking.status !== 'OCCUPIED') {
      return res.status(400).json({ message: 'Only an occupied booking can be checked out' });
    }

    booking.status = 'COMPLETED';
    booking.checkOutTime = new Date();
    await booking.save();

    const slot = await ParkingSlot.findById(booking.slot);
    if (slot) {
      slot.status = await recomputeSlotStatus(slot._id);
      await slot.save();
    }

    emitParkingUpdate(booking.parking);

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

export const scanBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: 'Enter booking ID or entry OTP' });

    const booking = await Booking.findOne({
      $or: [{ bookingId: String(bookingId).trim().toUpperCase() }, { entryOtp: String(bookingId).trim() }],
    });
    if (!booking) return res.status(404).json({ message: 'No booking found' });
    if (String(booking.provider) !== String(req.provider._id)) {
      return res.status(403).json({ message: 'QR belongs to another provider' });
    }

    let action;
    if (booking.status === 'UPCOMING') {
      if (new Date() > booking.endTime) {
        return res.status(400).json({ message: 'Booking window has ended' });
      }
      booking.status = 'OCCUPIED';
      booking.checkInTime = new Date();
      action = 'checked in';

      const slot = await ParkingSlot.findById(booking.slot);
      if (slot) {
        slot.status = 'OCCUPIED';
        await slot.save();
      }
    } else if (booking.status === 'OCCUPIED') {
      booking.status = 'COMPLETED';
      booking.checkOutTime = new Date();
      action = 'checked out';

      const slot = await ParkingSlot.findById(booking.slot);
      if (slot) {
        slot.status = await recomputeSlotStatus(slot._id);
        await slot.save();
      }
    } else {
      return res.status(400).json({ message: `Cannot scan a ${booking.status} booking` });
    }

    await booking.save();
    emitParkingUpdate(booking.parking);

    res.json({ ...booking.toObject(), action });
  } catch (error) {
    next(error);
  }
};