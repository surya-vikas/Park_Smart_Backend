let io = null;

export const initIO = (instance) => {
  io = instance;
};

export const emitParkingUpdate = (parkingId) => {
  if (!io) return;
  io.emit('parking:update', { parkingId: String(parkingId) });
};