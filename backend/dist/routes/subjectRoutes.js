"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subjectController_1 = require("../controllers/subjectController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get('/', subjectController_1.listSubjects);
router.post('/', subjectController_1.createSubject);
router.put('/:id', subjectController_1.updateSubject);
router.delete('/:id', subjectController_1.deleteSubject);
exports.default = router;
//# sourceMappingURL=subjectRoutes.js.map