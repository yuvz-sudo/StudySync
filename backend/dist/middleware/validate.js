"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const response_1 = require("../utils/response");
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                (0, response_1.sendError)(res, 'Validation failed', 400, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
                return;
            }
            (0, response_1.sendError)(res, 'Invalid request parameters', 400);
        }
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validate.js.map