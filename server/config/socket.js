import { Server } from 'socket.io';
import { registerInterviewSocket } from '../sockets/interviewSocket.js';
import { registerVoiceInterviewSocket } from '../sockets/voiceInterviewSocket.js'
import { registerMcqInterviewSocket } from '../sockets/mcqInterviewService.js'

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    registerInterviewSocket(socket);
    registerVoiceInterviewSocket(socket);
    registerMcqInterviewSocket(socket);


    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized — call initSocket(httpServer) first.');
  return io;
}