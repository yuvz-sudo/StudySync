"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVisualChart = exports.generatePdfReport = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const ANALYTICS_DIR = path_1.default.resolve(__dirname, '../../../analytics');
const PYTHON_PATH = path_1.default.resolve(ANALYTICS_DIR, 'venv/bin/python3');
const OUTPUT_DIR = path_1.default.resolve(ANALYTICS_DIR, 'output');
const generatePdfReport = (userId, days = 30) => {
    return new Promise((resolve, reject) => {
        const args = ['-m', 'analytics.src.cli', '--user_id', userId.toString(), '--days', days.toString(), '--action', 'report'];
        (0, child_process_1.execFile)(PYTHON_PATH, args, { cwd: path_1.default.resolve(__dirname, '../../..') }, (error, stdout, stderr) => {
            if (error) {
                console.error('[AnalyticsBridge Error]', stderr || error.message);
                return reject(new Error(`Failed to generate PDF report: ${error.message}`));
            }
            const expectedPdf = path_1.default.join(OUTPUT_DIR, `StudySync_Report_User_${userId}.pdf`);
            if (fs_1.default.existsSync(expectedPdf)) {
                return resolve(expectedPdf);
            }
            return reject(new Error('PDF file was not found after execution'));
        });
    });
};
exports.generatePdfReport = generatePdfReport;
const generateVisualChart = (options) => {
    const { userId, chartType, days = 30 } = options;
    return new Promise((resolve, reject) => {
        const args = ['-m', 'analytics.src.cli', '--user_id', userId.toString(), '--days', days.toString(), '--action', chartType];
        (0, child_process_1.execFile)(PYTHON_PATH, args, { cwd: path_1.default.resolve(__dirname, '../../..') }, (error, stdout, stderr) => {
            if (error) {
                console.error('[AnalyticsBridge Error]', stderr || error.message);
                return reject(new Error(`Failed to generate chart ${chartType}: ${error.message}`));
            }
            let filename = `user_${userId}_${chartType}.png`;
            if (chartType === 'barchart')
                filename = `user_${userId}_daily_bar.png`;
            if (chartType === 'donut')
                filename = `user_${userId}_subject_donut.png`;
            if (chartType === 'leaderboard')
                filename = 'global_leaderboard.png';
            const expectedChart = path_1.default.join(OUTPUT_DIR, filename);
            if (fs_1.default.existsSync(expectedChart)) {
                return resolve(expectedChart);
            }
            return reject(new Error(`Chart file ${filename} was not found after execution`));
        });
    });
};
exports.generateVisualChart = generateVisualChart;
//# sourceMappingURL=analyticsBridge.js.map