import mongoose from 'mongoose';

const walletTxnSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ['user', 'provider'], required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, refPath: 'ownerType', required: true },
    type: {
      type: String,
      enum: ['RECHARGE', 'PAYMENT', 'EARNING', 'REFUND', 'WITHDRAWAL'],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

walletTxnSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model('WalletTransaction', walletTxnSchema);