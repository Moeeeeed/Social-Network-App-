import { Router, Response } from 'express';
import Post from '../models/post';
import { verifyToken, verifyModerator, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/posts', verifyToken, verifyModerator, async (req: AuthRequest, res: Response) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).select('content createdAt');
    res.status(200).json({ posts });
  } catch (error) {
    console.error('Fetch posts for moderation error:', error);
    res.status(500).json({ status: 500, error: 'Database error: Could not fetch posts for moderation', message: String(error) });
  }
});

router.put('/posts/:id', verifyToken, verifyModerator, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    const { content } = req.body;

    if (!postId || postId.length !== 24 || !/^[0-9a-f]{24}$/i.test(postId)) {
      return res.status(400).json({ error: 'Invalid post ID format' });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { content },
      { new: true }
    );

    res.status(200).json({
      message: 'Post updated successfully by moderator',
      post: updatedPost,
    });
  } catch (error) {
    console.error('Moderator update post error:', error);
    res.status(500).json({ status: 500, error: 'Database error: Moderator could not update post', message: String(error) });
  }
});



router.get('/posts/:id', verifyToken, verifyModerator, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
  

    if (!postId || postId.length !== 24 || !/^[0-9a-f]{24}$/i.test(postId)) {
      return res.status(400).json({ error: 'Invalid post ID format' });
    }



    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    

    res.status(200).json({
      message: 'Pos get successfully by moderator'
    });
  } catch (error) {
    console.error('Moderator update post error:', error);
    res.status(500).json({ status: 500, error: 'Database error: Moderator could not update post', message: String(error) });
  }
});

router.delete('/posts/:id', verifyToken, verifyModerator, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;

    if (!postId || postId.length !== 24 || !/^[0-9a-f]{24}$/i.test(postId)) {
      return res.status(400).json({ error: 'Invalid post ID format' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await Post.findByIdAndDelete(postId);

    res.status(200).json({ message: 'Post removed successfully by moderator' });
  } catch (error) {
    console.error('Moderator delete post error:', error);
    res.status(500).json({ status: 500, error: 'Database error: Moderator could not delete post', message: String(error) });
  }
});

export default router;