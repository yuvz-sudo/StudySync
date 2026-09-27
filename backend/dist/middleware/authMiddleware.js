"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const response_1 = require("../utils/response");
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token && typeof req.query.token === 'string') {
        token = req.query.token;
    }
    if (!token) {
        (0, response_1.sendError)(res, 'Authentication token required', 401);
        return;
    }
    const secret = process.env.JWT_SECRET || 'studysync_super_secret_jwt_key_2026';
    jsonwebtoken_1.default.verify(token, secret, (err, user) => {
        if (err) {
            (0, response_1.sendError)(res, 'Invalid or expired token', 403);
            return;
        }
        req.user = user;
        next();
    });
};
exports.authenticateToken = authenticateToken;
//# sourceMappingURL=authMiddleware.js.map