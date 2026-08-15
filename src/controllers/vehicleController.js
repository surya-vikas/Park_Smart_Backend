import Vehicle from '../models/Vehicle.js';
import { VEHICLE_TYPES } from '../models/Vehicle.js';

export const getMyVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (error) {
    next(error);
  }
};

export const addVehicle = async (req, res, next) => {
  try {
    const { vehicleType, vehicleNumber, nickname } = req.body;
    if (!vehicleType || !vehicleNumber) {
      return res.status(400).json({ message: 'Vehicle type and number are required' });
    }
    if (!VEHICLE_TYPES.includes(vehicleType)) {
      return res.status(400).json({ message: 'Invalid vehicle type' });
    }

    const exists = await Vehicle.findOne({ user: req.user._id, vehicleNumber: vehicleNumber.trim().toUpperCase() });
    if (exists) return res.status(400).json({ message: 'Vehicle number already added' });

    const vehicle = await Vehicle.create({
      user: req.user._id,
      vehicleType,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      nickname: nickname || '',
    });
    res.status(201).json(vehicle);
  } catch (error) {
    next(error);
  }
};

export const updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    if (String(vehicle.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { vehicleType, vehicleNumber, nickname } = req.body;
    if (vehicleType) vehicle.vehicleType = vehicleType;
    if (vehicleNumber) vehicle.vehicleNumber = vehicleNumber.trim().toUpperCase();
    if (nickname !== undefined) vehicle.nickname = nickname;
    await vehicle.save();
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

export const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    if (String(vehicle.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await vehicle.deleteOne();
    res.json({ message: 'Vehicle deleted' });
  } catch (error) {
    next(error);
  }
};