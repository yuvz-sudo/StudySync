"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leaderboardController_1 = require("../controllers/leaderboardController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get('/global', leaderboardController_1.getGlobalLeaderboard);
router.get('/streaks', leaderboardController_1.getStreakLeaderboard);
exports.default = router;
//# sourceMappingURL=leaderboardRoutes.js.map