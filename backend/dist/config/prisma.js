"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Global serialization patch for BigInt to prevent JSON.stringify errors
if (!BigInt.prototype.toJSON) {
    BigInt.prototype.toJSON = function () {
        return this.toString();
    };
}
const prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
exports.default = prisma;
//# sourceMappingURL=prisma.js.map