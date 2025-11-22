import logger from "#config/logger.js";
import { getAllUsers, getUserById as getUserByIdService, updateUser as updateUserService, deleteUser as deleteUserService } from "#services/users.services.js";
import { formatValidationErrors } from "#utils/format.js";
import { userIdSchema, updateUserSchema } from "#validations/users.validation.js";



export const fetchAllUsers = async (req, res, next) => {
  try{
    logger.info('Fetching all users');
    const allUsers = await getAllUsers();
    res.json({
        message: 'Users fetched successfully',
        users: allUsers,
        count: allUsers.length
    });

  }catch(error){
    logger.error( error );
    next(error);
  }
}

export const fetchUserById = async (req, res, next) => {
  try {
    const validationResult = userIdSchema.safeParse({ id: req.params.id });
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation Failed', 
        details: formatValidationErrors(validationResult.error) 
      });
    }

    const { id } = validationResult.data;
    
    logger.info(`Fetching user with id: ${id}`);
    const user = await getUserByIdService(id);
    
    res.json({
      message: 'User fetched successfully',
      user
    });

  } catch (error) {
    logger.error('Error fetching user by id:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    next(error);
  }
}

export const updateUserById = async (req, res, next) => {
  try {
    // Validate user ID
    const idValidationResult = userIdSchema.safeParse({ id: req.params.id });
    if (!idValidationResult.success) {
      return res.status(400).json({ 
        error: 'Validation Failed', 
        details: formatValidationErrors(idValidationResult.error) 
      });
    }

    const { id } = idValidationResult.data;

    // Validate update data
    const updateValidationResult = updateUserSchema.safeParse(req.body);
    if (!updateValidationResult.success) {
      return res.status(400).json({ 
        error: 'Validation Failed', 
        details: formatValidationErrors(updateValidationResult.error) 
      });
    }

    const updates = updateValidationResult.data;

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      });
    }

    // Check if user is trying to update their own information
    const isOwnProfile = req.user.id === id;
    const isAdmin = req.user.role === 'admin';

    // Users can only update their own profile, admins can update any profile
    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'You can only update your own profile' 
      });
    }

    // Only admins can change roles
    if (updates.role && !isAdmin) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Only admins can change user roles' 
      });
    }

    logger.info(`Updating user with id: ${id}`);
    const updatedUser = await updateUserService(id, updates);
    
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    logger.error('Error updating user:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    next(error);
  }
}

export const deleteUserById = async (req, res, next) => {
  try {
    // Validate user ID
    const validationResult = userIdSchema.safeParse({ id: req.params.id });
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation Failed', 
        details: formatValidationErrors(validationResult.error) 
      });
    }

    const { id } = validationResult.data;

    // Note: Authorization check (admin only) is handled by requireRole middleware in routes
    logger.info(`Admin ${req.user.email} deleting user with id: ${id}`);
    const result = await deleteUserService(id);
    
    res.json({
      message: result.message,
      userId: result.id
    });

  } catch (error) {
    logger.error('Error deleting user:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    next(error);
  }
}
