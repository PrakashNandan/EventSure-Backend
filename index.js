const express = require('express');
const connectDB = require('./config/connectDB');
const authRouter = require('./route/auth');
const eventRouter = require('./route/event');
const ticketRouter = require('./route/ticket');
const protect = require('./middlewares/protect');
require('dotenv').config();


const server = express();
const port = process.env.PORT || 8000;

server.use(express.json());

// connect to MongoDB 
connectDB();


server.get('/', (req, res) => {
    res.send('Welcome to EventSure API');
});

server.use('/auth', authRouter);
server.use('/event', protect,eventRouter);
server.use('/ticket', protect,ticketRouter);





server.listen(port, () => {
    console.log(`Server is running on PORT:${port}`);
});