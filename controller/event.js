const Event = require('../model/Event');
const mongoose = require('mongoose');
const Ticket = require('../model/Ticket');
const Notification = require('../model/Notification');
const {streamUpload} = require('../utils/cloudinary');

const { getSocketInstance } = require('../socket');
const {redis} = require('../config/redis');




const createEvent = async (req, res) => {
    const { name, description, date, time, location, price, discount, totalSeats } = req.body;

    const bufferFile = req.file ? req.file.buffer : null;

    const eventCloudinaryRes = await streamUpload(bufferFile);

    try {
        const newEvent = new Event({
            name,
            description,
            date,
            time,
            location,
            price,
            discount: discount || 0,
            totalSeats,
            createdBy: req.user._id,
            organizerName: req.user.name,
            eventPhoto: eventCloudinaryRes.url,
        });

          // Invalidate cache
          const keys = await redis.keys('events:*');
          if (keys.length > 0) await redis.del(...keys);

        await newEvent.save();
        res.status(201).json({ message: 'Event created successfully', event: newEvent });

        


    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating event' });
    }
};

const getEventDetailsById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);


        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const discountedPrice = (event.price * (100 - event.discount)) / 100;
        const availableSeats = event.totalSeats - event.bookedSeats;

        res.status(200).json({
            name: event.name,
            description: event.description,
            date: event.date,
            time: event.time,
            location: event.location,
            price: event.price,
            discount: event.discount,  // in percentage
            discountedPrice,
            totalSeats: event.totalSeats,
            bookedSeats: event.bookedSeats,
            organizerName: event.organizerName,
            availableSeats,
            eventPhoto: event.eventPhoto,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching event details' });
    }
};

const getAllEvents = async (req, res) => {
    const { page_number = 1, limit = 10, location } = req.query;
    const page = parseInt(page_number);
    const limitPerPage = parseInt(limit);

    const cacheKey = `events:${page}-${limit}-${location}`;
    const isExist = await redis.exists(cacheKey);
    if (isExist) {
        console.log("Cache hit for events data");
        const cachedEvents = await redis.get(cacheKey);
        return res.status(200).json(JSON.parse(cachedEvents));
    }


    try {

        const allLocations = await Event.find().distinct('location');

        let events;
        if (location) {
            events = await Event.find({ location: location })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limitPerPage)
                .limit(limitPerPage);

        } else {
            events = await Event.find()
                .sort({ createdAt: -1 })
                .skip((page - 1) * limitPerPage)
                .limit(limitPerPage);
        }
  

        const totalEvents = await Event.countDocuments();

        await redis.set(cacheKey, JSON.stringify({
            events,
            totalEvents,
            totalPages: Math.ceil(totalEvents / limitPerPage),
            currentPage: page,
            allLocations
        }), 'EX', 600); // expires in 10 minutes


        res.status(200).json({
            events,
            totalEvents,
            totalPages: Math.ceil(totalEvents / limitPerPage),
            currentPage: page,
            allLocations
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching events' });
    }
};

const updateEvent = async (req, res) => {
    const eventId = req.params.id;
    const userId = req.user._id;

    try {
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if the logged-in user is the organizer of the event
        if (event.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'You are not authorized to update this event' });
        }

        // Update the event details
        const updatedEvent = await Event.findByIdAndUpdate(
            eventId,
            { $set: req.body },
            { new: true, runValidators: true } // Return updated document and validate input
        );

        // Notify ticket holders
        const tickets = await Ticket.find({ eventId: eventId });

       // Create notifications and emit events
        const notifications = tickets.map(ticket => {
            const message = `The event "${updatedEvent.name}" has been updated.`;


            // Get Socket.io instance safely
            const io = getSocketInstance();
            if (io) {
                tickets.forEach(ticket => {
                    const userId = ticket.userId.toString();
                    console.log(`Emitting event update to userId: ${userId}`);
                    io.to(userId).emit('eventUpdate', {
                        message: `Event "${event.name}" has been updated.`,
                        eventId: event._id
                    });

                    // io.emit('eventUpdate', {
                    //     message: `Event "${event.name}" has been updated.`,
                    //     eventId: event._id
                    // });
                });
                console.log("📢 Event update notification sent to ticket holders.");
            } else {
                console.log("⚠️ Socket.io is not initialized yet");
            }
    
            return {
            userId: ticket.userId,
            type:'update',
            eventId,
            message,
            };
        });
  
      // Save notifications to the database
      await Notification.insertMany(notifications);


      // Invalidate cache
      const keys = await redis.keys('events:*');
      if (keys.length > 0) await redis.del(...keys);
       

        res.status(200).json({
            message: 'Event updated successfully',
            updatedEvent,
            numberOfTicketHolders: tickets.length,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating event' });
    }
};

const deleteEvent = async (req, res) => {
    const eventId = req.params.id;
    const userId = req.user._id;

    try {
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if the logged-in user is the organizer of the event
        if (event.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'You are not authorized to delete this event' });
        }

        await Event.findByIdAndDelete(eventId);

        // Invalidate cache
        const keys = await redis.keys('events:*');
        if (keys.length > 0) await redis.del(...keys);

        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting event' });
    }
};

const getOrgEvents = async (req, res) => {
    console.log("get organizer events called");
    const userId = req.user._id;
    console.log("printing user Id", userId);

    const cacheKey = `events:org:${userId}`;
    const isExist = await redis.exists(cacheKey);
    if (isExist) {
        console.log("Cache hit for organizer events data");
        const cachedEvents = await redis.get(cacheKey);
        return res.status(200).json(JSON.parse(cachedEvents));
    }

    try {
        const events = await Event.find({ createdBy: userId }).sort({ createdAt: -1 });

        if (!events || events.length === 0) {
            return res.status(200).json({ message: 'No events found for this organizer', events: [] });
        }

        const response = {
            message: 'Events retrieved successfully',
            events,
        };

        await redis.set(cacheKey, JSON.stringify(response), 'EX', 600); // cache for 10 mins

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching events for the organizer' });
    }
};




module.exports = {
    createEvent,
    getEventDetailsById,
    getAllEvents,
    updateEvent,
    deleteEvent,
    getOrgEvents,
    
};
 
