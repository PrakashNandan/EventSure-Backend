const express = require('express');
const http = require('http'); // Import http for creating the server
const connectDB = require('./config/connectDB');
const authRouter = require('./route/auth');
const eventRouter = require('./route/event');
const ticketRouter = require('./route/ticket');
const notificationRouter = require('./route/notification');
const protect = require('./middlewares/protect');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const {Server} = require('socket.io');
const Notification = require('./model/Notification');
const Ticket = require('./model/Ticket');
const Event = require('./model/Event');
require('dotenv').config();

const app = express();
const server = http.createServer(app); // Create server using http and express
const port = process.env.PORT || 8000;

// Initialize Socket.IO server
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // Allow frontend origin
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
});

// Middleware for JSON parsing and CORS
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
    origin: 'http://localhost:3000', // Allow the frontend origin
    methods: ['GET', 'POST', 'PUT', 'PATCH','DELETE'],
}));

// Attach io to request object only after it is initialized
app.use((req, res, next) => {
    req.io = io;  // Attach Socket.IO to the req object
    next();
});

// connect to MongoDB
connectDB();


// Socket.IO connection
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('event-update-message', ({ eventId, message }) => {
        console.log('Event ID:', eventId);  // Verify eventId
        console.log('Message:', message);

        // todo : Emit message to the room
        io.emit('receive-event-message', { message });
    });


    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});



// Routes
app.get('/', (req, res) => {
    res.send('Welcome to EventSure API');
});

app.use('/auth', authRouter);
app.use('/event', protect, eventRouter);
app.use('/ticket', protect, ticketRouter);
app.use('/notification', protect, notificationRouter);

module.exports = { app, server, io };


server.listen(port, () => {
    console.log(`Server is running on PORT:${port}`);
});
