"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.respondToRequest = exports.listPendingRequests = exports.sendFriendRequest = exports.listFriends = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const response_1 = require("../utils/response");
const listFriends = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        // Query friendships from both directions (user_id_1 < user_id_2)
        const friendships = await prisma_1.default.friend.findMany({
            where: {
                OR: [{ userId1: userId }, { userId2: userId }],
            },
            include: {
                user1: { select: { id: true, username: true, email: true, currentStreak: true, lastActiveAt: true } },
                user2: { select: { id: true, username: true, email: true, currentStreak: true, lastActiveAt: true } },
            },
        });
        const friendProfiles = await Promise.all(friendships.map(async (f) => {
            const friendUser = f.userId1 === userId ? f.user2 : f.user1;
            // Check if friend is currently studying
            const activeSession = await prisma_1.default.studySession.findFirst({
                where: {
                    userId: friendUser.id,
                    status: { in: ['ACTIVE', 'PAUSED'] },
                },
                include: { subject: true },
            });
            return {
                id: friendUser.id.toString(),
                username: friendUser.username,
                email: friendUser.email,
                currentStreak: friendUser.currentStreak,
                lastActiveAt: friendUser.lastActiveAt,
                establishedAt: f.establishedAt,
                isCurrentlyStudying: !!activeSession,
                activeSubject: activeSession ? activeSession.subject.name : null,
            };
        }));
        (0, response_1.sendSuccess)(res, friendProfiles);
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to retrieve friends: ${error.message}`, 500);
    }
};
exports.listFriends = listFriends;
const sendFriendRequest = async (req, res) => {
    try {
        const senderId = BigInt(req.user.id);
        const { receiverUsername } = req.body;
        if (!receiverUsername) {
            (0, response_1.sendError)(res, 'Target username is required', 400);
            return;
        }
        const receiver = await prisma_1.default.user.findUnique({
            where: { username: receiverUsername },
        });
        if (!receiver) {
            (0, response_1.sendError)(res, 'Student not found', 404);
            return;
        }
        if (receiver.id === senderId) {
            (0, response_1.sendError)(res, 'Cannot send friend request to yourself', 400);
            return;
        }
        // Check if already friends
        const u1 = senderId < receiver.id ? senderId : receiver.id;
        const u2 = senderId < receiver.id ? receiver.id : senderId;
        const existingFriend = await prisma_1.default.friend.findUnique({
            where: { userId1_userId2: { userId1: u1, userId2: u2 } },
        });
        if (existingFriend) {
            (0, response_1.sendError)(res, 'You are already friends with this student', 409);
            return;
        }
        // Check for pending request
        const existingReq = await prisma_1.default.friendRequest.findFirst({
            where: {
                OR: [
                    { senderId, receiverId: receiver.id, status: 'PENDING' },
                    { senderId: receiver.id, receiverId: senderId, status: 'PENDING' },
                ],
            },
        });
        if (existingReq) {
            (0, response_1.sendError)(res, 'A pending friend request already exists between you', 409);
            return;
        }
        const request = await prisma_1.default.friendRequest.create({
            data: {
                senderId,
                receiverId: receiver.id,
                status: 'PENDING',
            },
        });
        // Create notification for receiver
        await prisma_1.default.notification.create({
            data: {
                userId: receiver.id,
                title: 'New Friend Request',
                message: `${req.user.username} sent you a study friend request!`,
                type: 'FRIEND_REQUEST',
            },
        });
        (0, response_1.sendSuccess)(res, request, 'Friend request sent', 201);
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to send friend request: ${error.message}`, 500);
    }
};
exports.sendFriendRequest = sendFriendRequest;
const listPendingRequests = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const requests = await prisma_1.default.friendRequest.findMany({
            where: {
                receiverId: userId,
                status: 'PENDING',
            },
            include: {
                sender: {
                    select: { id: true, username: true, email: true, currentStreak: true },
                },
            },
            orderBy: { sentAt: 'desc' },
        });
        (0, response_1.sendSuccess)(res, requests);
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to fetch requests: ${error.message}`, 500);
    }
};
exports.listPendingRequests = listPendingRequests;
const respondToRequest = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const requestId = BigInt(String(req.params.id));
        const { action } = req.body; // 'ACCEPT' | 'DECLINE'
        const request = await prisma_1.default.friendRequest.findFirst({
            where: { id: requestId, receiverId: userId, status: 'PENDING' },
        });
        if (!request) {
            (0, response_1.sendError)(res, 'Pending request not found', 404);
            return;
        }
        if (action === 'ACCEPT') {
            const u1 = request.senderId < request.receiverId ? request.senderId : request.receiverId;
            const u2 = request.senderId < request.receiverId ? request.receiverId : request.senderId;
            await prisma_1.default.$transaction([
                prisma_1.default.friendRequest.update({
                    where: { id: requestId },
                    data: { status: 'ACCEPTED' },
                }),
                prisma_1.default.friend.create({
                    data: {
                        userId1: u1,
                        userId2: u2,
                    },
                }),
                prisma_1.default.notification.create({
                    data: {
                        userId: request.senderId,
                        title: 'Friend Request Accepted',
                        message: `${req.user.username} accepted your study friend request!`,
                        type: 'FRIEND_ACCEPTED',
                    },
                }),
            ]);
            (0, response_1.sendSuccess)(res, null, 'Friend request accepted');
        }
        else {
            await prisma_1.default.friendRequest.update({
                where: { id: requestId },
                data: { status: 'DECLINED' },
            });
            (0, response_1.sendSuccess)(res, null, 'Friend request declined');
        }
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to respond to request: ${error.message}`, 500);
    }
};
exports.respondToRequest = respondToRequest;
//# sourceMappingURL=friendController.js.map