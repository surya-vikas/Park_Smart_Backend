import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import ParkingLot from '../models/ParkingLot.js';

export const getReviewsForParking = async (req, res, next) => {
  try {
    const reviews = await Review.find({ parking: req.params.id })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    next(error);
  }
};

export const createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const ratingNum = Number(rating);
    if (!bookingId) return res.status(400).json({ message: 'Booking is required' });
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'You can only review after completing your parking' });
    }

    const existing = await Review.findOne({ booking: booking._id });
    if (existing) {
      existing.rating = ratingNum;
      existing.comment = comment || '';
      await existing.save();
      return res.json(existing);
    }

    const review = await Review.create({
      user: req.user._id,
      parking: booking.parking,
      booking: booking._id,
      rating: ratingNum,
      comment: comment || '',
    });

    const stats = await Review.aggregate([
      { $match: { parking: booking.parking } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (stats.length) {
      await ParkingLot.findByIdAndUpdate(booking.parking, {
        rating: Math.round(stats[0].avg * 10) / 10,
        ratingCount: stats[0].count,
      });
    }

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
};

export const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .populate('parking', 'name image address city')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    next(error);
  }
};