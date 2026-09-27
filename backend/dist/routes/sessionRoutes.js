"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sessionController_1 = require("../controllers/sessionController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get('/active', sessionController_1.getActiveSession);
router.post('/start', sessionController_1.startSession);
router.post('/:id/pause', sessionController_1.pauseSession);
router.post('/:id/resume', sessionController_1.resumeSession);
router.post('/:id/stop', sessionController_1.stopSession);
router.get('/history', sessionController_1.getSessionHistory);
exports.default = router;
//# sourceMappingURL=sessionRoutes.js.map