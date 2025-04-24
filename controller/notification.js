const Event = require('../model/Event');
const mongoose = require('mongoose');
const Ticket = require('../model/Ticket');
const Notification = require('../model/Notification');


const createNotification = async (req, res) => {
    const userId = req.user._id;
    const {type, message, eventId } = req.body;

    try {
        const newNotification = new Notification({
            userId,
            message,
            type,
            eventId,
        });

        await newNotification.save();
        res.status(201).json({ message: 'Notification created successfully', notification: newNotification });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating notification' });
    }
};

const getTicketHolderNotifications = async (req, res) => {  
    
        const userId = req.user._id;

        try{

            const tickets = await Ticket.find({userId: userId});

            const eventIds = tickets.map(ticket => ticket.eventId);

            const notifications = await Notification.find({eventId: {$in: eventIds}});

            res.status(200).json({
                message: 'Notifications retrieved successfully',
                notifications: notifications,
            });


        }
        catch(error){
            console.error(error);
            res.status(500).json({message: 'Error retrieving notifications'});
        }
};


const getNotification = async (req, res) => {
    const userId = req.user._id;

    try {
        const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

        res.status(200).json({ message: 'Notifications retrieved successfully', notifications });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving notifications' });
    }
};


module.exports = {
    createNotification,
    getTicketHolderNotifications,
    getNotification
};  

