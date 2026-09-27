"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubject = exports.updateSubject = exports.createSubject = exports.listSubjects = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const response_1 = require("../utils/response");
const listSubjects = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const subjects = await prisma_1.default.subject.findMany({
            where: { userId, isActive: true },
            orderBy: { createdAt: 'asc' },
        });
        (0, response_1.sendSuccess)(res, subjects);
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to retrieve subjects: ${error.message}`, 500);
    }
};
exports.listSubjects = listSubjects;
const createSubject = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const { name, colorCode } = req.body;
        if (!name) {
            (0, response_1.sendError)(res, 'Subject name is required', 400);
            return;
        }
        const hexRegex = /^#[0-9A-Fa-f]{6}$/;
        const validColor = colorCode && hexRegex.test(colorCode) ? colorCode : '#3B82F6';
        const existing = await prisma_1.default.subject.findFirst({
            where: { userId, name },
        });
        if (existing) {
            if (!existing.isActive) {
                // Re-activate previously archived subject
                const reactivated = await prisma_1.default.subject.update({
                    where: { id: existing.id },
                    data: { isActive: true, colorCode: validColor },
                });
                (0, response_1.sendSuccess)(res, reactivated, 'Subject re-activated successfully');
                return;
            }
            (0, response_1.sendError)(res, 'You already have an active subject with this name', 409);
            return;
        }
        const subject = await prisma_1.default.subject.create({
            data: {
                userId,
                name,
                colorCode: validColor,
                isActive: true,
            },
        });
        (0, response_1.sendSuccess)(res, subject, 'Subject created successfully', 201);
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to create subject: ${error.message}`, 500);
    }
};
exports.createSubject = createSubject;
const updateSubject = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const subjectId = BigInt(String(req.params.id));
        const { name, colorCode, isActive } = req.body;
        const subject = await prisma_1.default.subject.findFirst({
            where: { id: subjectId, userId },
        });
        if (!subject) {
            (0, response_1.sendError)(res, 'Subject not found or unauthorized', 404);
            return;
        }
        const updated = await prisma_1.default.subject.update({
            where: { id: subjectId },
            data: {
                name: name || undefined,
                colorCode: colorCode || undefined,
                isActive: isActive !== undefined ? Boolean(isActive) : undefined,
            },
        });
        (0, response_1.sendSuccess)(res, updated, 'Subject updated successfully');
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to update subject: ${error.message}`, 500);
    }
};
exports.updateSubject = updateSubject;
const deleteSubject = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const subjectId = BigInt(String(req.params.id));
        // Soft delete to protect referential integrity of historical study sessions
        const updated = await prisma_1.default.subject.updateMany({
            where: { id: subjectId, userId },
            data: { isActive: false },
        });
        if (updated.count === 0) {
            (0, response_1.sendError)(res, 'Subject not found or unauthorized', 404);
            return;
        }
        (0, response_1.sendSuccess)(res, null, 'Subject archived successfully');
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to delete subject: ${error.message}`, 500);
    }
};
exports.deleteSubject = deleteSubject;
//# sourceMappingURL=subjectController.js.map