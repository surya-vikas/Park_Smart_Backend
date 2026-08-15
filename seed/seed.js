import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import Provider from '../src/models/Provider.js';
import ParkingLot from '../src/models/ParkingLot.js';
import ParkingSlot from '../src/models/ParkingSlot.js';
import Vehicle from '../src/models/Vehicle.js';
import Booking from '../src/models/Booking.js';
import Review from '../src/models/Review.js';
import WalletTransaction from '../src/models/WalletTransaction.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/parksmart';

const day = 86400000;

const slotLetters = ['A', 'B', 'C'];

const makeSlotNumbers = (total) => {
  const nums = [];
  let idx = 0;
  while (nums.length < total) {
    const letter = slotLetters[Math.floor(idx / 25)];
    const num = (idx % 25) + 1;
    nums.push(`${letter}${String(num).padStart(2, '0')}`);
    idx++;
  }
  return nums;
};

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const PHOTOS = [
  'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=900&q=70',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=900&q=70',
  'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=900&q=70',
  'https://images.unsplash.com/photo-1470224114660-3f6686c562eb?w=900&q=70',
  'https://images.unsplash.com/photo-1570126618953-d437176e8c79?w=900&q=70',
  'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=900&q=70',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=70',
  'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=900&q=70',
  'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=900&q=70',
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=70',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&q=70',
  'https://images.unsplash.com/photo-1493238792000-8113da705763?w=900&q=70',
  'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=900&q=70',
  'https://images.unsplash.com/photo-1558603668-6570496b66f8?w=900&q=70',
  'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=900&q=70',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=70',
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=70',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=900&q=70',
  'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=900&q=70',
  'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=900&q=70',
  'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=900&q=70',
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=900&q=70',
  'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=900&q=70',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=70',
];

const NAME_LABELS = [
  'Smart Parking', 'Central Parking', 'Metro Parking', 'Market Parking', 'Tower Parking',
  'Plaza Parking', 'City Parking', 'Lakeview Parking', 'Secure Parking', 'Express Parking',
  'Prime Parking', 'Grand Parking', 'Sunrise Parking', 'Galaxy Parking', 'Skyline Parking',
  'Green Parking', 'Royal Parking', 'Comfort Parking', 'Eazy Parking', 'Urban Parking',
  'Lotus Parking', 'Classic Parking', 'Silver Parking', 'Golden Parking', 'Nova Parking',
];

const LANDMARKS = [
  'Metro Station', 'Bus Depot', 'Market Yard', 'RTO Office', 'Lake View', 'Shopping Mall',
  'Petrol Bunk', 'Community Hall', 'District Hospital', 'Railway Station', 'IT Park',
  'Temple', 'Restaurant Zone', 'Supermarket', 'Cinema Hall',
];

const DESCRIPTIONS = [
  'Spacious multi-level parking with CCTV monitoring and 24x7 security. Easy entry and exit.',
  'Open-air guarded parking, well lit and secure throughout the day. Ideal for daily commuters.',
  'Convenient parking close to the market with wide slots and quick check-in process.',
  'Premium covered parking with valet assistance on weekends and reserved bays available.',
  'Budget-friendly parking with security guards and CCTV coverage around the clock.',
  'Modern parking facility with EV charging points, CCTV and a dedicated two-wheeler zone.',
  'Well-maintained parking with clear signage, speed breakers and round-the-clock staff.',
  'Secure multi-storey parking near the metro. Clean, covered and camera-monitored.',
  'Hassle-free parking with plenty of space for cars and bikes. Staff always available.',
  'Neat and safe parking lot with good lighting, marked bays and quick exit gates.',
];

const FACILITY_OPTIONS = ['CCTV', 'Security', 'Covered', 'EV Charging', '24x7'];

// Area distribution — focus areas first, then rest of the city (total 150)
const AREA_PLAN = {
  Ghatkesar: { count: 18, lat: 17.4481, lon: 78.6831, price: [25, 45] },
  Pocharam: { count: 14, lat: 17.534, lon: 78.6527, price: [20, 40] },
  Uppal: { count: 18, lat: 17.4056, lon: 78.5587, price: [30, 50] },
  Medipally: { count: 14, lat: 17.4208, lon: 78.5865, price: [25, 45] },
  'Jubilee Hills': { count: 18, lat: 17.4319, lon: 78.4075, price: [60, 90] },
  'Banjara Hills': { count: 18, lat: 17.4156, lon: 78.4347, price: [55, 85] },
  'Hitech City': { count: 8, lat: 17.4435, lon: 78.3772, price: [50, 75] },
  Madhapur: { count: 6, lat: 17.441, lon: 78.3886, price: [45, 70] },
  Gachibowli: { count: 6, lat: 17.4401, lon: 78.3489, price: [50, 80] },
  Kukatpally: { count: 5, lat: 17.4849, lon: 78.3995, price: [25, 45] },
  Secunderabad: { count: 5, lat: 17.4362, lon: 78.4966, price: [30, 50] },
  Begumpet: { count: 4, lat: 17.4449, lon: 78.4699, price: [40, 60] },
  Ameerpet: { count: 4, lat: 17.4375, lon: 78.4483, price: [40, 65] },
  Koti: { count: 3, lat: 17.385, lon: 78.4802, price: [20, 40] },
  Charminar: { count: 2, lat: 17.3616, lon: 78.4747, price: [15, 30] },
  Dilsukhnagar: { count: 2, lat: 17.3688, lon: 78.5284, price: [25, 40] },
  'LB Nagar': { count: 2, lat: 17.3493, lon: 78.5427, price: [25, 45] },
  Kompally: { count: 3, lat: 17.542, lon: 78.495, price: [25, 45] },
};

const REVIEW_NAMES = [
  'Suresh K', 'Anitha Reddy', 'Mohan Rao', 'Divya Sharma', 'Kiran Kumar', 'Lakshmi N',
  'Venkat G', 'Pooja Mehta', 'Ravi Teja', 'Sneha Joshi', 'Naveen Patil', 'Kavita Singh',
  'Harish Iyer', 'Meera Nair', 'Praveen Gupta', 'Sindhu V', 'Rahul D', 'Tejaswi B',
  'Ganesh P', 'Anjali M', 'Vikram S', 'Deepika R', 'Rohit K', 'Swathi A', 'Manoj C',
  'Nithya E', 'Aravind T', 'Shalini F', 'Pavan K', 'Madhavi G', 'Ashwin N', 'Roopa S',
  'Bharath V', 'Harika D', 'Sai Kumar', 'Priyanka J', 'Mahesh B', 'Vandana C',
  'Srinivas L', 'Anusha P',
];

const REVIEW_COMMENTS = {
  5: [
    'Excellent service! Spotless, secure and the staff were very helpful. Will definitely book again.',
    'Best parking experience I have had. CCTV everywhere and check-in took under a minute.',
    'Superb facility. Found a slot instantly and the whole process was smooth end to end.',
    'Very safe and clean. Great lighting at night. Highly recommended for families.',
    'Outstanding! Wide slots, quick exit and very professional staff on duty.',
    'Loved the seamless booking and the QR check-in. Made my day stress-free.',
    'Top notch security and cleanliness. The guard even helped me park my car.',
  ],
  4: [
    'Clean and safe. Slightly crowded on weekends but overall a very good experience.',
    'Very convenient location with easy entry and exit. Pricing is reasonable.',
    'Good parking with CCTV and security. The only downside is rush during peak hours.',
    'Safe and affordable. Staff were courteous and the process was quick.',
    'Nice facility. Bays are a bit tight for SUVs but everything else was great.',
    'Smooth experience. Would have liked more shade but very secure overall.',
    'Good value for money. Well lit and guarded throughout the day.',
  ],
  3: [
    'Okay parking. Some slots were tight but security is good.',
    'Decent place, a bit dusty but secure and affordable.',
    'Average facility. Fine for a short stop, entry gate was a little slow.',
    'Nothing fancy but gets the job done. Staff were polite.',
  ],
  2: [
    'Was crowded and hard to find a slot. Parking staff were not very responsive.',
    'CCTV coverage seemed patchy in a few corners. Could be better maintained.',
  ],
  1: [
    'Poor experience. Slots were occupied by unauthorised vehicles and staff did nothing.',
  ],
};

const OPEN_CLOSE = [
  ['06:00', '23:00'],
  ['07:00', '22:00'],
  ['08:00', '21:00'],
  ['05:30', '23:59'],
  ['09:00', '22:30'],
  ['06:30', '23:30'],
  ['08:00', '22:00'],
  ['05:00', '23:00'],
];

const seed = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB, clearing existing data...');

  await Promise.all([
    User.deleteMany({}),
    Provider.deleteMany({}),
    ParkingLot.deleteMany({}),
    ParkingSlot.deleteMany({}),
    Vehicle.deleteMany({}),
    Booking.deleteMany({}),
    Review.deleteMany({}),
    WalletTransaction.deleteMany({}),
  ]);

  // ---- Providers ----
  const password = await bcrypt.hash('password123', 10);
  const providers = await Provider.insertMany([
    {
      name: 'Sunrise Parking Co.',
      mobile: '9000000001',
      email: 'sunrise@parksmart.dev',
      password,
      wallet: 5240,
      bankDetails: {
        accountHolder: 'Sunrise Parking Co.',
        accountNumber: '50100234567891',
        ifsc: 'HDFC0001234',
        bankName: 'HDFC Bank',
        upiId: 'sunrise@hdfcbank',
      },
    },
    {
      name: 'MetroCity Parking',
      mobile: '9000000002',
      email: 'metro@parksmart.dev',
      password,
      wallet: 3890,
      bankDetails: {
        accountHolder: 'MetroCity Parking Pvt Ltd',
        accountNumber: '32104567890123',
        ifsc: 'ICIC0005678',
        bankName: 'ICICI Bank',
        upiId: 'metro@icici',
      },
    },
    {
      name: 'GreenPark Infra',
      mobile: '9000000003',
      email: 'greenpark@parksmart.dev',
      password,
      wallet: 2760,
      bankDetails: {
        accountHolder: 'GreenPark Infra',
        accountNumber: '01234567890123',
        ifsc: 'SBIN0001234',
        bankName: 'State Bank of India',
        upiId: 'greenpark@sbi',
      },
    },
  ]);

  // ---- Users (demo + review pool) ----
  const demoUsers = await User.insertMany([
    { name: 'Rahul Sharma', mobile: '9876543210', wallet: 1500 },
    { name: 'Priya Patel', mobile: '9123456780', wallet: 800 },
    { name: 'Arjun Reddy', mobile: '9012345678', wallet: 1200 },
  ]);
  const poolUsers = await User.insertMany(REVIEW_NAMES.map((n, i) => ({ name: n, mobile: `98${String(10000000 + i * 917)}` })));
  const users = [...demoUsers, ...poolUsers];

  // ---- Vehicles ----
  const demoVehicles = await Vehicle.insertMany([
    { user: users[0]._id, vehicleType: 'Car', vehicleNumber: 'TS09AB1234', nickname: 'My Car' },
    { user: users[0]._id, vehicleType: 'Bike', vehicleNumber: 'TS10CD5678', nickname: 'Daily Ride' },
    { user: users[1]._id, vehicleType: 'EV', vehicleNumber: 'TS11EF9012', nickname: 'Electric' },
    { user: users[2]._id, vehicleType: 'Car', vehicleNumber: 'AP12GH3456', nickname: 'Office Car' },
  ]);
  const poolVehicles = [];
  for (let i = 0; i < 20; i++) {
    const v = await Vehicle.create({
      user: poolUsers[i]._id,
      vehicleType: pick(['Car', 'Bike', 'EV']),
      vehicleNumber: `TS${rand(20, 99)}${['AB', 'CD', 'EF', 'GH', 'IJ', 'KL'][i % 6]}${rand(1000, 9999)}`,
      nickname: 'My Vehicle',
    });
    poolVehicles.push(v);
  }

  // ---- Generate 150 parking lots ----
  console.log('Generating 150 parking lots...');
  const lots = [];
  let labelIdx = 0;
  for (const [area, plan] of Object.entries(AREA_PLAN)) {
    for (let i = 0; i < plan.count; i++) {
      const jitter = () => (Math.random() - 0.5) * 0.014;
      const facilities = [...new Set([pick(FACILITY_OPTIONS), pick(FACILITY_OPTIONS)])];
      const label = NAME_LABELS[labelIdx % NAME_LABELS.length];
      labelIdx++;
      const lot = await ParkingLot.create({
        provider: pick(providers)._id,
        name: `${area} ${label}`,
        description: pick(DESCRIPTIONS),
        address: `${area} Main Road, Near ${pick(LANDMARKS)}`,
        city: 'Hyderabad',
        area,
        latitude: Math.round((plan.lat + jitter()) * 10000) / 10000,
        longitude: Math.round((plan.lon + jitter()) * 10000) / 10000,
        contactNumber: `040-${rand(2000000, 4999999)}`,
        totalSlots: rand(15, 40),
        pricePerHour: Math.round(rand(plan.price[0], plan.price[1]) / 5) * 5,
        openingTime: pick(OPEN_CLOSE)[0],
        closingTime: pick(OPEN_CLOSE)[1],
        facilities,
        image: PHOTOS[labelIdx % PHOTOS.length],
      });
      const numbers = makeSlotNumbers(lot.totalSlots);
      const slots = numbers.map((num) => ({ parking: lot._id, slotNumber: num }));
      await ParkingSlot.insertMany(slots);
      lots.push(lot);
    }
  }
  console.log(`Created ${lots.length} lots with ${await ParkingSlot.countDocuments()} slots.`);

  // ---- Demo bookings (for the 3 demo users) ----
  const now = new Date();
  const hour = 3600000;
  const usedBookingIds = new Set();
  const randomEntryOtp = () => String(Math.floor(100000 + Math.random() * 900000));
  const randomBookingId = async () => {
    let id = '';
    do {
      id = `PS${Math.floor(100000 + Math.random() * 900000)}`;
    } while (usedBookingIds.has(id));
    usedBookingIds.add(id);
    return id;
  };

  const bookingTemplates = [
    { user: users[0], vehicle: demoVehicles[0], lot: lots[0], hours: 2, offset: 2, status: 'UPCOMING' },
    { user: users[1], vehicle: demoVehicles[2], lot: lots[30], hours: 3, offset: 4, status: 'UPCOMING' },
    { user: users[2], vehicle: demoVehicles[3], lot: lots[60], hours: 1, offset: -6, status: 'COMPLETED' },
    { user: users[1], vehicle: demoVehicles[2], lot: lots[70], hours: 2, offset: -24, status: 'COMPLETED' },
    { user: users[0], vehicle: demoVehicles[1], lot: lots[90], hours: 1, offset: -48, status: 'CANCELLED' },
    { user: users[2], vehicle: demoVehicles[3], lot: lots[100], hours: 2, offset: -72, status: 'COMPLETED' },
    { user: users[0], vehicle: demoVehicles[0], lot: lots[120], hours: 1, offset: -96, status: 'COMPLETED' },
  ];

  for (const t of bookingTemplates) {
    const slotDoc = await ParkingSlot.findOne({ parking: t.lot._id, status: 'AVAILABLE' });
    if (!slotDoc) continue;
    const start = new Date(Math.floor((now.getTime() + t.offset * hour) / hour) * hour);
    const end = new Date(start.getTime() + t.hours * hour);
    const booking = await Booking.create({
      bookingId: await randomBookingId(),
      user: t.user._id,
      parking: t.lot._id,
      provider: t.lot.provider,
      slot: slotDoc._id,
      slotNumber: slotDoc.slotNumber,
      vehicle: t.vehicle._id,
      vehicleNumber: t.vehicle.vehicleNumber,
      startTime: start,
      endTime: end,
      durationHours: t.hours,
      amount: Math.round(t.hours * t.lot.pricePerHour),
      status: t.status,
      entryOtp: randomEntryOtp(),
    });
    if (t.status === 'COMPLETED') {
      booking.checkInTime = start;
      booking.checkOutTime = end;
      await booking.save();
    } else if (t.status === 'UPCOMING') {
      slotDoc.status = 'BOOKED';
      await slotDoc.save();
    }
  }

  // ---- Reviews: 10-15 per lot ----
  console.log('Generating 10-15 reviews per lot...');
  const reviewDocs = [];
  const reviewBookingIds = [];

  for (let li = 0; li < lots.length; li++) {
    const lot = lots[li];

    // one completed anchor booking per lot so reviews have a valid booking ref
    const anchorSlot = await ParkingSlot.findOne({ parking: lot._id, status: 'AVAILABLE' });
    const anchorVehicle = poolVehicles[li % poolVehicles.length];
    const anchorUser = poolUsers[li % poolUsers.length];
    const anchorStart = new Date(now.getTime() - rand(5, 60) * day);
    const anchorBooking = await Booking.create({
      bookingId: await randomBookingId(),
      user: anchorUser._id,
      parking: lot._id,
      provider: lot.provider,
      slot: anchorSlot._id,
      slotNumber: anchorSlot.slotNumber,
      vehicle: anchorVehicle._id,
      vehicleNumber: anchorVehicle.vehicleNumber,
      startTime: anchorStart,
      endTime: new Date(anchorStart.getTime() + 2 * hour),
      durationHours: 2,
      amount: Math.round(2 * lot.pricePerHour),
      status: 'COMPLETED',
      checkInTime: anchorStart,
      checkOutTime: new Date(anchorStart.getTime() + 2 * hour),
      entryOtp: randomEntryOtp(),
    });
    reviewBookingIds.push(anchorBooking._id);

    const reviewCount = rand(10, 15);
    const shuffledUsers = [...poolUsers].sort(() => Math.random() - 0.5).slice(0, reviewCount);
    for (let r = 0; r < reviewCount; r++) {
      // weighted rating: mostly 4-5
      const rating = pick([5, 5, 5, 4, 4, 4, 4, 3, 3, 2]);
      const comment = pick(REVIEW_COMMENTS[rating]);
      reviewDocs.push({
        user: shuffledUsers[r]._id,
        parking: lot._id,
        booking: anchorBooking._id,
        rating,
        comment,
        createdAt: new Date(now.getTime() - rand(1, 90) * day),
      });
    }
  }

  await Review.collection.insertMany(reviewDocs);
  console.log(`Created ${reviewDocs.length} reviews.`);

  // ---- Recompute parking rating + ratingCount ----
  const stats = await Review.aggregate([
    { $group: { _id: '$parking', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  for (const s of stats) {
    await ParkingLot.findByIdAndUpdate(s._id, {
      rating: Math.round(s.avg * 10) / 10,
      ratingCount: s.count,
    });
  }

  const totalReviews = reviewDocs.length;
  const lotsWithReviews = stats.length;

  // ---- Seed wallet transactions (demo users + providers) ----
  const providerTxns = providers.map((p, i) => ({
    ownerType: 'provider',
    owner: p._id,
    type: 'EARNING',
    amount: [5240, 3890, 2760][i],
    balanceAfter: p.wallet,
    note: 'Earnings from completed bookings',
  }));
  providerTxns.push(
    {
      ownerType: 'provider',
      owner: providers[0]._id,
      type: 'WITHDRAWAL',
      amount: 2500,
      balanceAfter: 2740,
      note: 'Withdrawn to HDFC Bank ••••7891',
    },
    {
      ownerType: 'provider',
      owner: providers[1]._id,
      type: 'WITHDRAWAL',
      amount: 1000,
      balanceAfter: 2890,
      note: 'Withdrawn to ICICI Bank ••••0123',
    }
  );
  const userTxns = demoUsers.map((u, i) => ({
    ownerType: 'user',
    owner: u._id,
    type: 'RECHARGE',
    amount: [1500, 800, 1200][i],
    balanceAfter: u.wallet,
    note: 'Wallet recharge',
  }));
  await WalletTransaction.insertMany([...providerTxns, ...userTxns]);
  console.log(`Seeded ${providerTxns.length + userTxns.length} wallet transactions.`);

  console.log('Seeding complete!');
  console.log('------------------');
  console.log(`Parking lots: ${lots.length} | Slots: ${await ParkingSlot.countDocuments()} | Reviews: ${totalReviews} (on ${lotsWithReviews} lots)`);
  console.log('User login OTP (any mobile): 123456');
  console.log('Demo user mobile: 9876543210');
  console.log('Provider login:  sunrise@parksmart.dev / password123');
  console.log('               metro@parksmart.dev / password123');
  console.log('               greenpark@parksmart.dev / password123');

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});