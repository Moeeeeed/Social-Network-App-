import { Router, Response } from 'express';
import Post from '../models/post';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const author = req.user?.id;
    
    const newPost = new Post({ content, author });
    const savedPost = await newPost.save();
    
    res.status(201).json({
      message: 'Post created successfully',
      post: savedPost
    });
  } catch {
    res.status(500).json({ error: 'Something went wrong creating the post' });
  }
});

router.get('/', async (req, res: Response) => {
  try {
    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 10;

    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'name email');

    const totalPosts = await Post.countDocuments();

    res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
      posts
    });
  } catch {
    res.status(500).json({ error: 'Could not fetch posts' });
  }
});

router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { content: req.body.content },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.status(200).json({
      message: 'Post updated successfully',
      post: updatedPost,
    });
  } catch {
    res.status(500).json({ error: 'Could not update the post' });
  }
});

router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);

    if (!deletedPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.status(200).json({ message: 'Post was deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Could not delete the post' });
  }
});

export default router;