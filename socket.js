const { Server } = require('socket.io');

let io = null; // Default value to null

// Initialize Socket.io with the server
const initializeSocket = (server) => {
    if (io) return io; // Don't initialize again if already done

    io = new Server(server, {
        cors: {
            origin: [
                "http://localhost:3000",
                "http://localhost:3001",
                "https://eventsure.vercel.app",
                "https://event-sure-frontend-prakash-nandans-projects.vercel.app"
            ],
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        }
    });

    io.on('connection', (socket) => {
        console.log('✅ User connected:', socket.id);

        socket.on('registerUser', (userId) => {
            console.log(`User ${userId} joined room: ${socket.id}`);
            socket.join(userId);  // Join room based on userId
          });

        socket.on('disconnect', () => {
            console.log('❌ User disconnected:', socket.id);
        });
    });

    console.log('✅ Socket.io initialized successfully');
    return io;
};

// Get the Socket.io instance
const getSocketInstance = () => {
    if (!io) {
        console.log("⚠️ Socket.io is not initialized yet");
        return null;
    }
    return io;
};

module.exports = { initializeSocket, getSocketInstance };
