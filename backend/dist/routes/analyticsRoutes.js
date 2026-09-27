"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analyticsController_1 = require("../controllers/analyticsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get('/metrics', analyticsController_1.getSummaryMetrics);
router.get('/report/pdf', analyticsController_1.downloadPdfReport);
router.get('/charts/:chartType', analyticsController_1.getChartImage);
exports.default = router;
//# sourceMappingURL=analyticsRoutes.js.map