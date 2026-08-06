const { Server } = require('socket.io');
const { registerInterviewSocket } = require('../sockets/interviewSocket');

let io;

function initSocket(httpServer) {
    io = new Server(httpServer ,{
     cors: {
        origin : process.env.CLIENT_URL || 'http://localhost:5173',
        methods: [GET , POST],
     },
    })


io.on('connection' , (socket)=>{
    console.log(`[socket] client conenct  $[socket.client.id]`);

    registerInterviewSocket(socket);

    socket.on('disconnect' , ()=>{
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
});

    return io;
}


function getIO() {
    if(!io) throw new Error('Socket io not initization - call hhtps first ');
    return io;
}

module.exports = {initSocket , getIO };