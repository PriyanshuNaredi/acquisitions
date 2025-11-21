import logger from "#config/logger.js";
import bcrypt from 'bcrypt';
import { eq } from "drizzle-orm";
import { db } from "#config/database.js";
import { users } from "#models/user.model.js";


export const hashPassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        logger.error("Error hashing password:", error);
        throw new Error("Error hashing password");
    }
};

export const comparePassword = async (password, hashedPassword) => {
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        logger.error("Error comparing password:", error);
        throw new Error("Error comparing password");
    }
};

export const createUser = async ({name, email, password, role='user'}) => {
    try {
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existingUser.length > 0) {
            throw new Error("User with this email already exists");
        }

        const password_hashed = await hashPassword(password);

        const [newUser] = await db.insert(users).values({
            name,
            email,
            password: password_hashed,
            role
        }).returning(
            {id: users.id,
            name: users.name,
            email: users.email,
            role: users.role
        }
        );

        logger.info(`User ${newUser.email} created successfully`);
        return newUser;

    } catch (error) {
        logger.error("Error creating user:", error);
        throw error;
    }
};

export const authenticateUser = async (email, password) => {
    try {
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user) {
            throw new Error("User not found");
        }

        const isMatch = await comparePassword(password, user.password);

        if (!isMatch) {
            throw new Error("Invalid password");
        }

        const { password: _password, ...userWithoutPassword } = user;

        logger.info(`User ${user.email} authenticated successfully`);

        return userWithoutPassword;

    } catch (error) {
        logger.error("Error authenticating user:", error);
        throw error;
    }
};
