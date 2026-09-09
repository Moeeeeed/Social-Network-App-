import { Router, Request, Response } from 'express';
import User from '../models/user';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, password: hashedPassword });
    const savedUser = await newUser.save();
    
    res.status(201).json({
      message: 'User created successfully',
      user: { id: savedUser._id, name: savedUser.name, email: savedUser.email }
    });
  } catch {
    res.status(500).json({ error: 'Could not create user. Check email uniqueness or password length (6+ chars).' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

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
  } catch {
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch {
    res.status(500).json({ error: 'Could not fetch users' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      followers: user.followers,
      following: user.following,
      createdAt: user.createdAt
    });
  } catch {
    res.status(500).json({ error: 'Could not fetch user info' });
  }
});

router.post('/:id/follow', async (req: Request, res: Response) => {
  try {
    const userToFollowId = req.params.id; 
    const { currentUserId } = req.body;

    if (userToFollowId === currentUserId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { following: userToFollowId }
    });

    await User.findByIdAndUpdate(userToFollowId, {
      $addToSet: { followers: currentUserId }
    });

    res.status(200).json({ message: 'Successfully followed user!' });
  } catch {
    res.status(500).json({ error: 'Could not follow user' });
  }
});

router.post('/:id/unfollow', async (req: Request, res: Response) => {
  try {
    const userToUnfollowId = req.params.id; 
    const { currentUserId } = req.body;

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { following: userToUnfollowId }
    });

    await User.findByIdAndUpdate(userToUnfollowId, {
      $pull: { followers: currentUserId }
    });

    res.status(200).json({ message: 'Successfully unfollowed user!' });
  } catch {
    res.status(500).json({ error: 'Could not unfollow user' });
  }
});

export default router;