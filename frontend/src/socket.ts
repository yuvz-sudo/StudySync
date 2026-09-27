import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('[Socket.io] Connected to backend gateway:', socket?.id);
    });
  }
  return socket;
};
