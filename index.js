const express = require('express');
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
const port = process.env.PORT || 8080;


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
    origin: ["http://localhost:3001", "https://eventsure.vercel.app", "https://event-sure-frontend-prakash-nandans-projects.vercel.app"],
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


app.listen(port, () => {
    console.log(`Server is running on PORT:${port}`);
});



// hi I'm in dev branch
