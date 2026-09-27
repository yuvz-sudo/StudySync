"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController_1 = require("../controllers/notificationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get('/', notificationController_1.listNotifications);
router.put('/:id/read', notificationController_1.markAsRead);
exports.default = router;
//# sourceMappingURL=notificationRoutes.js.map