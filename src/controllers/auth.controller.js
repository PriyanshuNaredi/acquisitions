import logger from "#config/logger.js";
import { createUser, authenticateUser } from "#services/auth.service.js";
import { cookie } from "#utils/cookies.js";
import { formatValidationErrors } from "#utils/format.js";
import { jwttoken } from "#utils/jwt.js";
import { signupSchema, signinSchema } from "#validations/auth.validation.js";

export const signup = async (req, res, next) => {
    try {
        const validationResult = signupSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({ error: 'Validation Failed', details: formatValidationErrors(validationResult.error) });
        }

        const {name, email, password, role} = validationResult.data;

        // Auth logic to create user
        const user = await createUser({name, email, password, role});

        const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });

        cookie.set(res, 'token', token);

        logger.info(`User signed up: ${email}`);
        res.status(201).json({ message: 'User created successfully', user: {id:user.id, name:user.name, email: user.email, role: user.role } });

    } catch (error) {
        logger.error('Error in signup', error);
        if(error.message === 'User with this email already exists'){
            return res.status(409).json({ error: 'User with this email already exists' });
        }
        next(error);
    }
};

export const signin = async (req, res, next) => {
    try {
        const validationResult = signinSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({ error: 'Validation Failed', details: formatValidationErrors(validationResult.error) });
        }

        const { email, password } = validationResult.data;

        const user = await authenticateUser(email, password);

        const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });

        cookie.set(res, 'token', token);

        logger.info(`User signed in: ${email}`);
        res.status(200).json({ message: 'User signed in successfully', user: {id:user.id, name:user.name, email: user.email, role: user.role } });

    } catch (error) {
        logger.error('Error in signin', error);
        if(error.message === 'User not found' || error.message === 'Invalid password'){
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        next(error);
    }
};

export const signout = async (req, res, next) => {
    try {
        cookie.clear(res, 'token');

        logger.info('User signed out');
        res.status(200).json({ message: 'User signed out successfully' });
    } catch (error) {
        logger.error('Error in signout', error);
        next(error);
    }
};
