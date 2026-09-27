"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionHistory = exports.stopSession = exports.resumeSession = exports.pauseSession = exports.startSession = exports.getActiveSession = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const response_1 = require("../utils/response");
const streakHelper_1 = require("../utils/streakHelper");
const getActiveSession = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const activeSession = await prisma_1.default.studySession.findFirst({
            where: {
                userId,
                status: { in: ['ACTIVE', 'PAUSED'] },
            },
            include: {
                subject: true,
            },
        });
        (0, response_1.sendSuccess)(res, activeSession);
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to retrieve active session: ${error.message}`, 500);
    }
};
exports.getActiveSession = getActiveSession;
const startSession = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const { subjectId } = req.body;
        if (!subjectId) {
            (0, response_1.sendError)(res, 'Subject ID is required to start a session', 400);
            return;
        }
        // Verify subject ownership
        const subject = await prisma_1.default.subject.findFirst({
            where: { id: BigInt(subjectId), userId, isActive: true },
        });
        if (!subject) {
            (0, response_1.sendError)(res, 'Subject not found or inactive', 404);
            return;
        }
        // Ensure no other active session is currently running
        const existing = await prisma_1.default.studySession.findFirst({
            where: {
                userId,
                status: { in: ['ACTIVE', 'PAUSED'] },
            },
        });
        if (existing) {
            (0, response_1.sendError)(res, 'An active study session is already in progress', 409, { activeSessionId: existing.id.toString() });
            return;
        }
        const session = await prisma_1.default.studySession.create({
            data: {
                userId,
                subjectId: BigInt(subjectId),
                startTime: new Date(),
                status: 'ACTIVE',
            },
            include: { subject: true },
        });
        (0, response_1.sendSuccess)(res, session, 'Stopwatch started successfully', 201);
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to start session: ${error.message}`, 500);
    }
};
exports.startSession = startSession;
const pauseSession = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const sessionId = BigInt(String(req.params.id));
        const session = await prisma_1.default.studySession.findFirst({
            where: { id: sessionId, userId, status: 'ACTIVE' },
        });
        if (!session) {
            (0, response_1.sendError)(res, 'Active session not found', 404);
            return;
        }
        const updated = await prisma_1.default.studySession.update({
            where: { id: sessionId },
            data: { status: 'PAUSED' },
            include: { subject: true },
        });
        (0, response_1.sendSuccess)(res, updated, 'Session paused');
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to pause session: ${error.message}`, 500);
    }
};
exports.pauseSession = pauseSession;
const resumeSession = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const sessionId = BigInt(String(req.params.id));
        const session = await prisma_1.default.studySession.findFirst({
            where: { id: sessionId, userId, status: 'PAUSED' },
        });
        if (!session) {
            (0, response_1.sendError)(res, 'Paused session not found', 404);
            return;
        }
        const updated = await prisma_1.default.studySession.update({
            where: { id: sessionId },
            data: { status: 'ACTIVE' },
            include: { subject: true },
        });
        (0, response_1.sendSuccess)(res, updated, 'Session resumed');
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to resume session: ${error.message}`, 500);
    }
};
exports.resumeSession = resumeSession;
const stopSession = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const sessionId = BigInt(String(req.params.id));
        const { actualDurationSeconds } = req.body;
        const session = await prisma_1.default.studySession.findFirst({
            where: {
                id: sessionId,
                userId,
                status: { in: ['ACTIVE', 'PAUSED'] },
            },
        });
        if (!session) {
            (0, response_1.sendError)(res, 'Session not found or already completed', 404);
            return;
        }
        const endTime = new Date();
        // Calculate duration in seconds
        let durationSeconds = Math.max(1, Math.round((endTime.getTime() - new Date(session.startTime).getTime()) / 1000));
        if (actualDurationSeconds !== undefined && Number(actualDurationSeconds) > 0) {
            durationSeconds = Number(actualDurationSeconds);
        }
        // Execute atomic completion transaction
        const result = await prisma_1.default.$transaction(async (tx) => {
            // 1. Update session to COMPLETED
            const completedSession = await tx.studySession.update({
                where: { id: sessionId },
                data: {
                    endTime,
                    durationSeconds,
                    status: 'COMPLETED',
                },
                include: { subject: true },
            });
            // 2. Roll up into user_daily_summaries
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);
            await tx.userDailySummary.upsert({
                where: {
                    uq_user_subject_date: {
                        userId,
                        subjectId: session.subjectId,
                        studyDate: todayDate,
                    },
                },
                update: {
                    totalDurationSeconds: { increment: durationSeconds },
                    sessionsCount: { increment: 1 },
                },
                create: {
                    userId,
                    subjectId: session.subjectId,
                    studyDate: todayDate,
                    totalDurationSeconds: durationSeconds,
                    sessionsCount: 1,
                },
            });
            // 3. Update User Streaks & Last Active Date
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (user) {
                const streakCalc = (0, streakHelper_1.calculateUpdatedStreak)(user.lastActiveAt, user.currentStreak, user.longestStreak, endTime);
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        currentStreak: streakCalc.newCurrentStreak,
                        longestStreak: streakCalc.newLongestStreak,
                        lastActiveAt: endTime,
                    },
                });
            }
            return completedSession;
        });
        (0, response_1.sendSuccess)(res, result, 'Session completed successfully');
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to stop session: ${error.message}`, 500);
    }
};
exports.stopSession = stopSession;
const getSessionHistory = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const limit = parseInt(req.query.limit) || 20;
        const sessions = await prisma_1.default.studySession.findMany({
            where: { userId, status: 'COMPLETED' },
            include: { subject: true },
            orderBy: { startTime: 'desc' },
            take: limit,
        });
        (0, response_1.sendSuccess)(res, sessions);
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to fetch session history: ${error.message}`, 500);
    }
};
exports.getSessionHistory = getSessionHistory;
//# sourceMappingURL=sessionController.js.map