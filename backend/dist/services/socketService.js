"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
class SocketService {
    static instance;
    io = null;
    activeStudents = new Map();
    constructor() { }
    static getInstance() {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }
    init(httpServer) {
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        });
        this.io.on('connection', (socket) => {
            console.log(`[Socket.io] Client connected: ${socket.id}`);
            // User identifies themselves upon connection
            socket.on('user:online', (data) => {
                socket.join(`user:${data.userId}`);
                socket.data.userId = data.userId;
                socket.data.username = data.username;
                // Broadcast current active student list
                socket.emit('study:live_students', Array.from(this.activeStudents.values()));
            });
            // User starts stopwatch study session
            socket.on('study:start', (data) => {
                const student = {
                    userId: data.userId,
                    username: data.username,
                    subjectName: data.subjectName,
                    startTime: Date.now(),
                    status: 'ACTIVE',
                };
                this.activeStudents.set(data.userId, student);
                this.io?.emit('study:student_started', student);
                this.io?.emit('study:live_students', Array.from(this.activeStudents.values()));
            });
            // User pauses stopwatch
            socket.on('study:pause', (data) => {
                const student = this.activeStudents.get(data.userId);
                if (student) {
                    student.status = 'PAUSED';
                    this.activeStudents.set(data.userId, student);
                    this.io?.emit('study:student_paused', student);
                }
            });
            // User resumes stopwatch
            socket.on('study:resume', (data) => {
                const student = this.activeStudents.get(data.userId);
                if (student) {
                    student.status = 'ACTIVE';
                    this.activeStudents.set(data.userId, student);
                    this.io?.emit('study:student_resumed', student);
                }
            });
            // User stops stopwatch study session
            socket.on('study:stop', (data) => {
                this.activeStudents.delete(data.userId);
                this.io?.emit('study:student_stopped', { userId: data.userId });
                this.io?.emit('study:live_students', Array.from(this.activeStudents.values()));
            });
            socket.on('disconnect', () => {
                if (socket.data.userId) {
                    this.activeStudents.delete(socket.data.userId);
                    this.io?.emit('study:student_stopped', { userId: socket.data.userId });
                    this.io?.emit('study:live_students', Array.from(this.activeStudents.values()));
                }
                console.log(`[Socket.io] Client disconnected: ${socket.id}`);
            });
        });
        return this.io;
    }
    getLiveStudents() {
        return Array.from(this.activeStudents.values());
    }
}
exports.SocketService = SocketService;
exports.default = SocketService.getInstance();
//# sourceMappingURL=socketService.js.map