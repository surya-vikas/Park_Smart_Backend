import ParkingLot from '../models/ParkingLot.js';
import ParkingSlot from '../models/ParkingSlot.js';
import Booking from '../models/Booking.js';

const RADIUS_KM = 6371;

const degToRad = (deg) => (deg * Math.PI) / 180;

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const dLat = degToRad(lat2 - lat1);
  const dLon = degToRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const attachAvailability = async (lots) => {
  const ids = lots.map((l) => l._id);
  const bookings = await Booking.find({
    parking: { $in: ids },
    status: { $in: ['UPCOMING', 'OCCUPIED'] },
  }).select('parking slot status');
  const now = new Date();

  const bookedNow = new Map();
  for (const b of bookings) {
    const parked = b.status === 'OCCUPIED' || (b.startTime <= now && b.endTime > now);
    const key = String(b.parking);
    bookedNow.set(key, (bookedNow.get(key) || 0) + (parked ? 1 : 0));
  }

  return lots.map((lot) => {
    const active = bookedNow.get(String(lot._id)) || 0;
    const available = Math.max(0, lot.totalSlots - active);
    return { ...lot.toObject(), availableSlots: available };
  });
};

// ---- Public / user endpoints ----

export const searchParking = async (req, res, next) => {
  try {
    const { q, city, area, lat, lon, priceMax, priceMin, vehicleType, sort, slotsAvailable } = req.query;

    const filter = { active: true };
    if (q) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [{ name: regex }, { address: regex }, { area: regex }, { city: regex }];
    }
    if (city) filter.city = new RegExp(city.trim(), 'i');
    if (area) filter.area = new RegExp(area.trim(), 'i');
    if (priceMax) filter.pricePerHour = { ...(filter.pricePerHour || {}), $lte: Number(priceMax) };
    if (priceMin) filter.pricePerHour = { ...(filter.pricePerHour || {}), $gte: Number(priceMin) };

    let lots = await ParkingLot.find(filter);

    if (slotsAvailable === 'true' || slotsAvailable === '1') {
      lots = await attachAvailability(lots);
      lots = lots.filter((l) => l.availableSlots > 0);
    } else {
      lots = await attachAvailability(lots);
    }

    if (lat && lon) {
      const latN = Number(lat);
      const lonN = Number(lon);
      lots = lots.map((l) => ({
        ...l,
        distanceKm: Number(haversineKm(latN, lonN, l.latitude, l.longitude).toFixed(2)),
      }));
    }

    if (sort === 'nearest' && lat && lon) {
      lots.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sort === 'cheapest') {
      lots.sort((a, b) => a.pricePerHour - b.pricePerHour);
    } else if (sort === 'rating') {
      lots.sort((a, b) => b.rating - a.rating);
    } else {
      lots.sort((a, b) => b.createdAt - a.createdAt);
    }

    res.json(lots);
  } catch (error) {
    next(error);
  }
};

export const getParkingById = async (req, res, next) => {
  try {
    const lot = await ParkingLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ message: 'Parking not found' });
    const [enriched] = await attachAvailability([lot]);
    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

// ---- Provider endpoints ----

export const createParking = async (req, res, next) => {
  try {
    const {
      name, description, address, city, area,
      latitude, longitude, contactNumber, totalSlots,
      pricePerHour, openingTime, closingTime, facilities, image,
    } = req.body;

    if (!name || !address || !city || latitude === undefined || longitude === undefined || !totalSlots || pricePerHour === undefined) {
      return res.status(400).json({ message: 'Required fields: name, address, city, latitude, longitude, totalSlots, pricePerHour' });
    }

    const lot = await ParkingLot.create({
      provider: req.provider._id,
      name: name.trim(),
      description: description || '',
      address: address.trim(),
      city: city.trim(),
      area: area || '',
      latitude: Number(latitude),
      longitude: Number(longitude),
      contactNumber: contactNumber || '',
      totalSlots: Number(totalSlots),
      pricePerHour: Number(pricePerHour),
      openingTime: openingTime || '06:00',
      closingTime: closingTime || '23:00',
      facilities: Array.isArray(facilities) ? facilities : [],
      image: image || '',
    });

    const slots = [];
    for (let i = 1; i <= lot.totalSlots; i++) {
      slots.push({ parking: lot._id, slotNumber: `A${String(i).padStart(2, '0')}` });
    }
    await ParkingSlot.insertMany(slots);

    res.status(201).json(lot);
  } catch (error) {
    next(error);
  }
};

export const getMyParking = async (req, res, next) => {
  try {
    const lots = await ParkingLot.find({ provider: req.provider._id }).sort({ createdAt: -1 });
    const enriched = await attachAvailability(lots);
    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

export const updateParking = async (req, res, next) => {
  try {
    const lot = await ParkingLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ message: 'Parking not found' });
    if (String(lot.provider) !== String(req.provider._id)) {
      return res.status(403).json({ message: 'Not authorized to modify this parking' });
    }

    const { name, description, address, city, area, contactNumber, pricePerHour, openingTime, closingTime, facilities, image, active } = req.body;

    if (name !== undefined) lot.name = name;
    if (description !== undefined) lot.description = description;
    if (address !== undefined) lot.address = address;
    if (city !== undefined) lot.city = city;
    if (area !== undefined) lot.area = area;
    if (contactNumber !== undefined) lot.contactNumber = contactNumber;
    if (pricePerHour !== undefined) lot.pricePerHour = Number(pricePerHour);
    if (openingTime !== undefined) lot.openingTime = openingTime;
    if (closingTime !== undefined) lot.closingTime = closingTime;
    if (facilities !== undefined) lot.facilities = Array.isArray(facilities) ? facilities : [];
    if (image !== undefined) lot.image = image;
    if (active !== undefined) lot.active = Boolean(active);

    await lot.save();
    res.json(lot);
  } catch (error) {
    next(error);
  }
};

export const deleteParking = async (req, res, next) => {
  try {
    const lot = await ParkingLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ message: 'Parking not found' });
    if (String(lot.provider) !== String(req.provider._id)) {
      return res.status(403).json({ message: 'Not authorized to modify this parking' });
    }
    const activeBookings = await Booking.countDocuments({
      parking: lot._id,
      status: { $in: ['UPCOMING', 'OCCUPIED'] },
    });
    if (activeBookings > 0) {
      return res.status(400).json({ message: 'Cannot delete parking with active bookings' });
    }
    await ParkingSlot.deleteMany({ parking: lot._id });
    await ParkingLot.deleteOne({ _id: lot._id });
    res.json({ message: 'Parking deleted' });
  } catch (error) {
    next(error);
  }
};

export const getProviderStats = async (req, res, next) => {
  try {
    const providerId = req.provider._id;
    const lotIds = (await ParkingLot.find({ provider: providerId }).select('_id')).map((l) => l._id);

    const parkingCount = lotIds.length;
    const bookings = await Booking.find({ provider: providerId });
    const upcoming = bookings.filter((b) => b.status === 'UPCOMING').length;
    const occupied = bookings.filter((b) => b.status === 'OCCUPIED').length;
    const completed = bookings.filter((b) => b.status === 'COMPLETED').length;
    const cancelled = bookings.filter((b) => b.status === 'CANCELLED').length;
    const totalRevenue = bookings
      .filter((b) => b.status === 'COMPLETED' || b.status === 'OCCUPIED')
      .reduce((sum, b) => sum + b.amount, 0);

    const slotDocs = await ParkingSlot.find({ parking: { $in: lotIds } });
    const slotCounts = slotDocs.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      parkingCount,
      bookings: { upcoming, occupied, completed, cancelled, total: bookings.length },
      totalRevenue,
      slots: {
        total: slotDocs.length,
        available: slotCounts['AVAILABLE'] || 0,
        booked: slotCounts['BOOKED'] || 0,
        occupied: slotCounts['OCCUPIED'] || 0,
        maintenance: slotCounts['MAINTENANCE'] || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};