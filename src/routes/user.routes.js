import {
  fetchAllUsers,
  fetchUserById,
  updateUserById,
  deleteUserById,
} from '#controllers/users.controllers.js';
import { authenticateToken, requireRole } from '#middleware/auth.middleware.js';
import express from 'express';

const router = express.Router();

// Get all users - admin only
router.get('/', authenticateToken, requireRole(['admin']), fetchAllUsers);

// Get user by ID - authenticated users only
router.get('/:id', authenticateToken, fetchUserById);

// Update user - authenticated users can update own profile, admin can update any
router.put('/:id', authenticateToken, updateUserById);

// Delete user - admin only
router.delete(
  '/:id',
  authenticateToken,
  requireRole(['admin']),
  deleteUserById
);

export default router;
