import WalletTransaction from '../models/WalletTransaction.js';

const MIN_RECHARGE = 10;
const MIN_WITHDRAW = 100;

const round2 = (n) => Math.round(n * 100) / 100;

export const getMyWallet = async (req, res, next) => {
  try {
    const transactions = await WalletTransaction.find({ ownerType: 'user', owner: req.user._id })
      .populate('booking', 'bookingId parking slotNumber')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ balance: req.user.wallet, transactions });
  } catch (error) {
    next(error);
  }
};

export const rechargeWallet = async (req, res, next) => {
  try {
    const amount = round2(Number(req.body.amount));
    if (!amount || amount < MIN_RECHARGE) {
      return res.status(400).json({ message: `Minimum recharge is ₹${MIN_RECHARGE}` });
    }

    const user = req.user;
    user.wallet = round2(user.wallet + amount);
    await user.save();

    const transaction = await WalletTransaction.create({
      ownerType: 'user',
      owner: user._id,
      type: 'RECHARGE',
      amount,
      balanceAfter: user.wallet,
      note: 'Wallet recharge',
    });

    res.status(201).json({ balance: user.wallet, transaction });
  } catch (error) {
    next(error);
  }
};

export const getProviderWallet = async (req, res, next) => {
  try {
    const transactions = await WalletTransaction.find({ ownerType: 'provider', owner: req.provider._id })
      .populate('booking', 'bookingId parking slotNumber')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({
      balance: req.provider.wallet,
      bankDetails: req.provider.bankDetails || {},
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

export const saveBankDetails = async (req, res, next) => {
  try {
    const { accountHolder, accountNumber, ifsc, bankName, upiId } = req.body;
    if (!accountHolder || !accountNumber || !ifsc || !bankName) {
      return res
        .status(400)
        .json({ message: 'Account holder, account number, IFSC and bank name are required' });
    }

    const provider = req.provider;
    provider.bankDetails = {
      accountHolder: String(accountHolder).trim(),
      accountNumber: String(accountNumber).trim(),
      ifsc: String(ifsc).trim().toUpperCase(),
      bankName: String(bankName).trim(),
      upiId: String(upiId || '').trim(),
    };
    await provider.save();

    res.json({ bankDetails: provider.bankDetails });
  } catch (error) {
    next(error);
  }
};

export const withdrawWallet = async (req, res, next) => {
  try {
    const bd = req.provider.bankDetails || {};
    if (!bd.accountNumber || !bd.ifsc) {
      return res.status(400).json({ message: 'Add your bank details before withdrawing' });
    }

    const amount = round2(Number(req.body.amount));
    if (!amount || amount < MIN_WITHDRAW) {
      return res.status(400).json({ message: `Minimum withdrawal is ₹${MIN_WITHDRAW}` });
    }

    const provider = req.provider;
    if (amount > provider.wallet) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    provider.wallet = round2(provider.wallet - amount);
    await provider.save();

    const transaction = await WalletTransaction.create({
      ownerType: 'provider',
      owner: provider._id,
      type: 'WITHDRAWAL',
      amount,
      balanceAfter: provider.wallet,
      note: `Withdrawn to ${bd.bankName} ••••${String(bd.accountNumber).slice(-4)}`,
    });

    res.json({ balance: provider.wallet, transaction });
  } catch (error) {
    next(error);
  }
};