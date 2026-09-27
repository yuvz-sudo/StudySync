"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAndLogEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma_1 = __importDefault(require("../config/prisma"));
// Nodemailer transport configuration
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass',
    },
});
const sendAndLogEmail = async (options) => {
    const { userId, recipientEmail, subject, templateName, html, text } = options;
    let status = 'SENT';
    let errorMessage = null;
    try {
        // Only attempt live network dispatch if SMTP is configured, otherwise simulate in dev
        if (process.env.NODE_ENV !== 'test' && process.env.SMTP_USER !== 'ethereal_user') {
            await transporter.sendMail({
                from: process.env.SMTP_FROM || 'StudySync <noreply@studysync.edu>',
                to: recipientEmail,
                subject,
                html,
                text: text || html.replace(/<[^>]*>?/gm, ''),
            });
        }
        else {
            console.log(`[MailService Simulated] To: ${recipientEmail} | Template: ${templateName} | Subject: ${subject}`);
        }
    }
    catch (error) {
        status = 'FAILED';
        errorMessage = error?.message || 'Failed to dispatch email';
        console.error(`[MailService Error] ${errorMessage}`);
    }
    // Audit to mail_logs table
    try {
        await prisma_1.default.mailLog.create({
            data: {
                userId: userId || null,
                recipientEmail,
                subject,
                templateName,
                status,
                errorMessage,
            },
        });
    }
    catch (dbError) {
        console.error('[MailService Database Audit Error]', dbError);
    }
    return status === 'SENT';
};
exports.sendAndLogEmail = sendAndLogEmail;
//# sourceMappingURL=mailService.js.map