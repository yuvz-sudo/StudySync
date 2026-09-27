"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSummaryMetrics = exports.getChartImage = exports.downloadPdfReport = void 0;
const fs_1 = __importDefault(require("fs"));
const prisma_1 = __importDefault(require("../config/prisma"));
const analyticsBridge_1 = require("../services/analyticsBridge");
const response_1 = require("../utils/response");
const downloadPdfReport = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const days = parseInt(req.query.days, 10) || 30;
        const pdfPath = await (0, analyticsBridge_1.generatePdfReport)(userId, days);
        if (!fs_1.default.existsSync(pdfPath)) {
            (0, response_1.sendError)(res, 'Report generation failed or file was deleted', 500);
            return;
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="StudySync_Report_User_${userId}.pdf"`);
        const fileStream = fs_1.default.createReadStream(pdfPath);
        fileStream.pipe(res);
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to compile PDF report: ${error.message}`, 500);
    }
};
exports.downloadPdfReport = downloadPdfReport;
const getChartImage = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const chartType = req.params.chartType;
        const days = parseInt(req.query.days, 10) || 30;
        const validTypes = ['barchart', 'donut', 'heatmap', 'trend', 'leaderboard'];
        if (!validTypes.includes(chartType)) {
            (0, response_1.sendError)(res, `Invalid chart type. Must be one of: ${validTypes.join(', ')}`, 400);
            return;
        }
        const chartPath = await (0, analyticsBridge_1.generateVisualChart)({ userId, chartType, days });
        if (!fs_1.default.existsSync(chartPath)) {
            (0, response_1.sendError)(res, 'Chart file was not found', 500);
            return;
        }
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=60'); // Cache for 60 seconds
        const fileStream = fs_1.default.createReadStream(chartPath);
        fileStream.pipe(res);
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to generate visual chart: ${error.message}`, 500);
    }
};
exports.getChartImage = getChartImage;
const getSummaryMetrics = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        const days = parseInt(req.query.days, 10) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const summaries = await prisma_1.default.userDailySummary.findMany({
            where: {
                userId,
                studyDate: { gte: startDate },
            },
            include: {
                subject: { select: { name: true, colorCode: true } },
            },
            orderBy: { studyDate: 'asc' },
        });
        const totalSeconds = summaries.reduce((acc, curr) => acc + curr.totalDurationSeconds, 0);
        const totalHours = Math.round((totalSeconds / 3600.0) * 10) / 10;
        const totalSessions = summaries.reduce((acc, curr) => acc + curr.sessionsCount, 0);
        (0, response_1.sendSuccess)(res, {
            timeframeDays: days,
            totalHours,
            totalSessions,
            dailySummariesCount: summaries.length,
            summaries,
        });
    }
    catch (error) {
        (0, response_1.sendError)(res, `Failed to retrieve summary metrics: ${error.message}`, 500);
    }
};
exports.getSummaryMetrics = getSummaryMetrics;
//# sourceMappingURL=analyticsController.js.map