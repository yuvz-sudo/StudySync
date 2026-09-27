"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, message = 'Operation successful', statusCode = 200) => {
    const response = {
        success: true,
        message,
        data,
    };
    return res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
    const response = {
        success: false,
        message,
        errors,
    };
    return res.status(statusCode).json(response);
};
exports.sendError = sendError;
//# sourceMappingURL=response.js.map