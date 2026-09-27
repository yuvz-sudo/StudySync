"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../config/prisma"));
const response_1 = require("../utils/response");
const mailService_1 = require("../services/mailService");
const JWT_SECRET = process.env.JWT_SECRET || 'studysync_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            (0, response_1.sendError)(res, 'Username, email, and password are required', 400);
            return;
        }
        const existingUser = await prisma_1.default.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });
        if (existingUser) {
            (0, response_1.sendError)(res, 'User with this email or username already exists', 409);
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        // Create user and associated default settings inside a transaction
        const newUser = await prisma_1.default.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    username,
                    email,
                    passwordHash,
                    currentStreak: 0,
                    longestStreak: 0,
                },
            });
            await tx.userSettings.create({
                data: {
                    userId: user.id,
                    dailyStudyGoalSeconds: 7200, // 2 hours
                    isEmailNotificationsEnabled: true,
                    isPushNotificationsEnabled: true,
                    theme: 'dark',
                },
            });
            // Seed 2 default subjects for new student
            await tx.subject.createMany({
                data: [
                    { userId: user.id, name: 'General Study', colorCode: '#3B82F6' },
                    { userId: user.id, name: 'Exam Preparation', colorCode: '#10B981' },
                ],
            });
            return user;
        });
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ id: newUser.id.toString(), email: newUser.email, username: newUser.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        // Send Welcome Email asynchronously
        (0, mailService_1.sendAndLogEmail)({
            userId: newUser.id,
            recipientEmail: newUser.email,
            subject: 'Welcome to StudySync!',
            templateName: 'WELCOME_EMAIL',
            html: `<h2>Welcome to StudySync, ${newUser.username}!</h2><p>Start tracking your study sessions and achieving your academic goals.</p>`,
        });
        (0, response_1.sendSuccess)(res, {
            user: {
                id: newUser.id.toString(),
                username: newUser.username,
                email: newUser.email,
                currentStreak: newUser.currentStreak,
                longestStreak: newUser.longestStreak,
            },
            token,
        }, 'User registered successfully', 201);
    }
    catch (error) {
        (0, response_1.sendError)(res, `Registration failed: ${error.message}`, 500);
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            (0, response_1.sendError)(res, 'Email and password are required', 400);
            return;
        }
        const user = await prisma_1.default.user.findFirst({
            where: {
                OR: [{ email }, { username: email }],
            },
            include: {
                settings: true,
            },
        });
        if (!user) {
            (0, response_1.sendError)(res, 'Invalid credentials', 401);
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            (0, response_1.sendError)(res, 'Invalid credentials', 401);
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id.toString(), email: user.email, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        (0, response_1.sendSuccess)(res, {
            user: {
                id: user.id.toString(),
                username: user.username,
                email: user.email,
                currentStreak: user.currentStreak,
                longestStreak: user.longestStreak,
                settings: user.settings,
            },
            token,
        }, 'Login successful');
    }
    catch (error) {
        (0, response_1.sendError)(res, `Login failed: ${error.message}`, 500);
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            include: {
                settings: true,
                subjects: { where: { isActive: true } },
            },
        });
        if (!user) {
            (0, response_1.sendError)(res, 'User not found', 404);
            return;
        }
        (0, response_1.sendSuccess)(res, {
            id: user.id.toString(),
            username: user.username,
            email: user.email,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            settings: user.settings,
            subjects: user.subjects,
        });
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to fetch profile: ${error.message}`, 500);
    }
};
exports.getMe = getMe;
const updateSettings = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const { dailyStudyGoalSeconds, isEmailNotificationsEnabled, isPushNotificationsEnabled, theme } = req.body;
        const updated = await prisma_1.default.userSettings.upsert({
            where: { userId },
            update: {
                dailyStudyGoalSeconds: dailyStudyGoalSeconds !== undefined ? Number(dailyStudyGoalSeconds) : undefined,
                isEmailNotificationsEnabled: isEmailNotificationsEnabled !== undefined ? Boolean(isEmailNotificationsEnabled) : undefined,
                isPushNotificationsEnabled: isPushNotificationsEnabled !== undefined ? Boolean(isPushNotificationsEnabled) : undefined,
                theme: theme || undefined,
            },
            create: {
                userId,
                dailyStudyGoalSeconds: dailyStudyGoalSeconds ? Number(dailyStudyGoalSeconds) : 7200,
                isEmailNotificationsEnabled: isEmailNotificationsEnabled ?? true,
                isPushNotificationsEnabled: isPushNotificationsEnabled ?? true,
                theme: theme || 'dark',
            },
        });
        (0, response_1.sendSuccess)(res, updated, 'Settings updated successfully');
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to update settings: ${error.message}`, 500);
    }
};
exports.updateSettings = updateSettings;
//# sourceMappingURL=authController.js.map