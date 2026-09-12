import { Router, Request, Response } from 'express';
import User, { IUser } from '../models/user';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const isValidEmail = (email: string): boolean => {
  const atIndex = email.indexOf('@');
  const dotIndex = email.lastIndexOf('.');
  return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < email.length - 1;
};

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email)) 
    {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) 
    {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) 
    {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, password: hashedPassword });
    const savedUser = await newUser.save();
    
    res.status(201).json({
      message: 'User created successfully',
      user: { id: savedUser._id, name: savedUser.name, email: savedUser.email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ status: 500, error: 'Database error: Could not create user', message: String(error) });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Logged in successfully',
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ status: 500, error: 'Server error during login', message: String(error) });
  }
});

router.post('/create-checkout-session', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Social Network Premium Feed Access',
            },
            unit_amount: 1000,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:3000/api/users/payment-success?userId=${userId}`,
      cancel_url: `http://localhost:3000/api/users/payment-cancel`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ status: 500, error: 'Stripe payment session creation failed', message: String(error) });
  }
});

router.get('/payment-success', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (userId) {
      await User.findByIdAndUpdate(userId, { isPaid: true });
    }
    res.status(200).json({ message: 'Payment successful! You are now a premium user.' });
  } catch (error) {
    console.error('Payment success update error:', error);
    res.status(500).json({ status: 500, error: 'Failed to update payment status', message: String(error) });
  }
});

router.get('/payment-cancel', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Payment was cancelled.' });
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ status: 500, error: 'Database error: Could not fetch users', message: String(error) });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = (req.params.id as string);

    if (!id || id.length !== 24 || !/^[0-9a-f]{24}$/i.test(id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      isPaid: (user as any).isPaid,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      followers: user.followers,
      following: user.following,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Fetch user error:', error);
    res.status(500).json({ status: 500, error: 'Database error: Could not fetch user info', message: String(error) });
  }
});

router.post('/:id/follow', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userToFollowId = (req.params.id as string); 
    const currentUserId = (req.user?.id as string);

    if (!userToFollowId || userToFollowId.length !== 24 || !/^[0-9a-f]{24}$/i.test(userToFollowId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (userToFollowId === currentUserId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const userToFollow = await User.findById(userToFollowId);
    if (!userToFollow) {
      return res.status(404).json({ error: 'User to follow not found' });
    }

    const currentUser = await User.findById(currentUserId);
    if (currentUser?.following.some(id => id.toString() === userToFollowId)) {
      return res.status(400).json({ error: 'You are already following this user' });
    }

    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { following: new Types.ObjectId(userToFollowId) }
    });

    await User.findByIdAndUpdate(userToFollowId, {
      $addToSet: { followers: new Types.ObjectId(currentUserId) }
    });

    res.status(200).json({ message: 'Successfully followed user!' });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ status: 500, error: 'Database error: Could not follow user', message: String(error) });
  }
});

router.post('/:id/unfollow', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userToUnfollowId = (req.params.id as string); 
    const currentUserId = (req.user?.id as string);

    if (!userToUnfollowId || userToUnfollowId.length !== 24 || !/^[0-9a-f]{24}$/i.test(userToUnfollowId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userToUnfollow = await User.findById(userToUnfollowId);
    if (!userToUnfollow) {
      return res.status(404).json({ error: 'Could not find user' });
    }

    if (!currentUser.following.some(id => id.toString() === userToUnfollowId)) {
      return res.status(400).json({ error: 'You are not following this user' });
    }

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { following: new Types.ObjectId(userToUnfollowId) }
    });

    await User.findByIdAndUpdate(userToUnfollowId, {
      $pull: { followers: new Types.ObjectId(currentUserId) }
    });

    res.status(200).json({ message: 'Successfully unfollowed user!' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ status: 500, error: 'Database error: Could not unfollow user', message: String(error) });
  }
});

export default router;