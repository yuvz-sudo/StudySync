"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.listNotifications = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const response_1 = require("../utils/response");
const listNotifications = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const notifications = await prisma_1.default.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 30,
        });
        (0, response_1.sendSuccess)(res, notifications);
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to load notifications: ${error.message}`, 500);
    }
};
exports.listNotifications = listNotifications;
const markAsRead = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const notificationId = BigInt(String(req.params.id));
        await prisma_1.default.notification.updateMany({
            where: { id: notificationId, userId },
            data: { isRead: true },
        });
        (0, response_1.sendSuccess)(res, null, 'Notification marked as read');
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to update notification: ${error.message}`, 500);
    }
};
exports.markAsRead = markAsRead;
//# sourceMappingURL=notificationController.js.map