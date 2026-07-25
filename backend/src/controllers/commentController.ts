import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Comment } from '../models/Comment';
import { Solution } from '../models/Solution';

export async function createComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params; // solution ID
    const { text } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'citizen' && req.user.role !== 'developer') {
      return res.status(403).json({ message: 'Only citizens and developers can comment.' });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    const solution = await Solution.findById(id);
    if (!solution) {
      return res.status(404).json({ message: 'Solution not found' });
    }

    const commentDoc = new Comment({
      solution: id,
      user: req.user.id,
      text: text.trim()
    });
    const newComment = await commentDoc.save();

    // Increment comment count
    solution.commentCount = (solution.commentCount || 0) + 1;
    await solution.save();

    // Populate user
    const populated = await Comment.findById(newComment._id).populate('user');

    return res.status(201).json({
      success: true,
      comment: populated
    });
  } catch (error) {
    next(error);
  }
}

export async function getComments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params; // solution ID

    const comments = await Comment.find({ solution: id }).sort({ createdAt: 1 }).populate('user');

    return res.json({
      success: true,
      comments
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params; // comment ID

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    const commentAuthorId = typeof comment.user === 'object' ? comment.user._id : comment.user;
    if (commentAuthorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to delete this comment.' });
    }

    const solutionId = typeof comment.solution === 'object' ? comment.solution._id : comment.solution;

    // Delete comment
    await Comment.deleteMany({ _id: id });

    // Decrement comment count on solution
    const solution = await Solution.findById(solutionId);
    if (solution) {
      solution.commentCount = Math.max(0, (solution.commentCount || 0) - 1);
      await solution.save();
    }

    return res.json({
      success: true,
      message: 'Comment deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}
