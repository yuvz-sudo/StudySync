"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const friendController_1 = require("../controllers/friendController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get('/', friendController_1.listFriends);
router.post('/request', friendController_1.sendFriendRequest);
router.get('/requests/pending', friendController_1.listPendingRequests);
router.post('/requests/:id/respond', friendController_1.respondToRequest);
exports.default = router;
//# sourceMappingURL=friendRoutes.js.map