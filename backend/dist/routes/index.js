"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authRoutes_1 = __importDefault(require("./authRoutes"));
const subjectRoutes_1 = __importDefault(require("./subjectRoutes"));
const sessionRoutes_1 = __importDefault(require("./sessionRoutes"));
const friendRoutes_1 = __importDefault(require("./friendRoutes"));
const leaderboardRoutes_1 = __importDefault(require("./leaderboardRoutes"));
const notificationRoutes_1 = __importDefault(require("./notificationRoutes"));
const analyticsRoutes_1 = __importDefault(require("./analyticsRoutes"));
const router = (0, express_1.Router)();
router.use('/auth', authRoutes_1.default);
router.use('/subjects', subjectRoutes_1.default);
router.use('/sessions', sessionRoutes_1.default);
router.use('/friends', friendRoutes_1.default);
router.use('/leaderboard', leaderboardRoutes_1.default);
router.use('/notifications', notificationRoutes_1.default);
router.use('/analytics', analyticsRoutes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map