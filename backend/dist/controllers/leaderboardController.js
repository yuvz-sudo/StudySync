"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStreakLeaderboard = exports.getGlobalLeaderboard = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const response_1 = require("../utils/response");
const getGlobalLeaderboard = async (req, res) => {
    try {
        // Aggregate total duration from user_daily_summaries
        const leaderboard = await prisma_1.default.user.findMany({
            select: {
                id: true,
                username: true,
                currentStreak: true,
                dailySummaries: {
                    select: {
                        totalDurationSeconds: true,
                    },
                },
            },
            take: 25,
        });
        const formatted = leaderboard
            .map((u) => {
            const totalSeconds = u.dailySummaries.reduce((sum, item) => sum + item.totalDurationSeconds, 0);
            return {
                id: u.id.toString(),
                username: u.username,
                currentStreak: u.currentStreak,
                totalStudySeconds: totalSeconds,
                totalStudyHours: Math.round((totalSeconds / 3600.0) * 10) / 10,
            };
        })
            .sort((a, b) => b.totalStudySeconds - a.totalStudySeconds)
            .map((item, index) => ({
            rank: index + 1,
            ...item,
        }));
        (0, response_1.sendSuccess)(res, formatted);
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to load leaderboard: ${error.message}`, 500);
    }
};
exports.getGlobalLeaderboard = getGlobalLeaderboard;
const getStreakLeaderboard = async (req, res) => {
    try {
        const topStreaks = await prisma_1.default.user.findMany({
            where: { currentStreak: { gt: 0 } },
            select: {
                id: true,
                username: true,
                currentStreak: true,
                longestStreak: true,
            },
            orderBy: { currentStreak: 'desc' },
            take: 20,
        });
        (0, response_1.sendSuccess)(res, topStreaks.map((u, i) => ({ rank: i + 1, ...u, id: u.id.toString() })));
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to fetch streak leaderboard: ${error.message}`, 500);
    }
};
exports.getStreakLeaderboard = getStreakLeaderboard;
//# sourceMappingURL=leaderboardController.js.map