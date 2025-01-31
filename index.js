const express = require('express');
const http = require('http'); 
const connectDB = require('./config/connectDB');
const authRouter = require('./route/auth');
const eventRouter = require('./route/event');
const ticketRouter = require('./route/ticket');
const notificationRouter = require('./route/notification');
const protect = require('./middlewares/protect');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Notification = require('./model/Notification');
const Ticket = require('./model/Ticket');
const Event = require('./model/Event');
require('dotenv').config();

const app = express();
const server = http.createServer(app); 
const port = process.env.PORT || 8000;


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
    origin: 'http://localhost:3000', // Allow the frontend origin
    methods: ['GET', 'POST', 'PUT', 'PATCH','DELETE'],
}));



// connect to MongoDB
connectDB();


app.get('/', (req, res) => {
    res.send('Welcome to EventSure API');
});

app.use('/auth', authRouter);
app.use('/event', protect, eventRouter);
app.use('/ticket', protect, ticketRouter);
app.use('/notification', protect, notificationRouter);


server.listen(port, () => {
    console.log(`Server is running on PORT:${port}`);
});
