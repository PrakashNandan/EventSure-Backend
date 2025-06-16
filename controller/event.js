const Event = require('../model/Event');
const mongoose = require('mongoose');
const Ticket = require('../model/Ticket');
const Notification = require('../model/Notification');
const {streamUpload} = require('../utils/cloudinary');

const { getSocketInstance } = require('../socket');
const {redis} = require('../config/redis');
const User = require('../model/User');




const createEvent = async (req, res) => {


     try {
        const { name, description, date, time, location, price, discount, totalSeats } = req.body;

        if (!name || !date || !location) {
                return res.status(400).json({ message: "Missing required fields" });
            }

        let eventPhotoUrl = "";

        // Upload only if a file was sent
        if (req.file && req.file.buffer) {
            try {
                const eventCloudinaryRes = await streamUpload(req.file.buffer);
                eventPhotoUrl = eventCloudinaryRes.url || "";
            } catch (uploadError) {
                console.error("Cloudinary Upload Failed:", uploadError);
                return res.status(500).json({ message: "Event image upload failed" });
            }
        }
   
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
            eventPhoto:  eventPhotoUrl,
        });

          // Invalidate cache
          const keys = await redis.keys('events:*');
          if (keys.length > 0) await redis.del(...keys);

        await newEvent.save();
        res.status(201).json({  message: `Event created `, event: newEvent });

        


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

    const cacheKey = `events:${page}-${limit}-${location || 'all'}`;
    const isExist = await redis.exists(cacheKey);
    if (isExist) {
        console.log("Cache hit for events data");
        const cachedEvents = await redis.get(cacheKey);
        return res.status(200).json(JSON.parse(cachedEvents));
    }

    try {
        const filter = { status: "approved" }; 

        if (location) {
            filter.location = location; 
        }

        const events = await Event.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limitPerPage)
            .limit(limitPerPage);

        const totalEvents = await Event.countDocuments(filter); 

        const allLocations = await Event.find({ status: "approved" }).distinct("location");

        const responseData = {
            events,
            totalEvents,
            totalPages: Math.ceil(totalEvents / limitPerPage),
            currentPage: page,
            allLocations,
        };

        await redis.set(cacheKey, JSON.stringify(responseData), 'EX', 1); 

        return res.status(200).json(responseData);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error fetching events' });
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
            message: `Event updated by ${req.user.name} (${req.user.role})`,
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

        res.status(200).json({message: `Event deleted by ${req.user.name} (${req.user.role})`});
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



const getMetaDataOfEvents = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalEvents = await Event.countDocuments({ createdBy: userId });

    const latestEvent = await Event.findOne({ createdBy: userId }).sort({ createdAt: -1 });

    const upcomingEventsList = await Event.find({
      createdBy: userId,
      date: { $gt: new Date() },
    }).sort({ date: 1 });

    const upcomingEventsCount = upcomingEventsList.length;

    let totalTicketsBookedInLatestEvent = 0;

    if (latestEvent) {
      const tickets = await Ticket.aggregate([
        { $match: { eventId: latestEvent._id } },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: "$quantity" },
          },
        },
      ]);

      totalTicketsBookedInLatestEvent = tickets.length > 0 ? tickets[0].totalQuantity : 0;
    }

    res.status(200).json({
      totalEvents,
      upcomingEventsList,
      upcomingEventsCount,
      totalTicketsBookedInLatestEvent,
    });

  } catch (error) {
    console.error("Error fetching metadata:", error);
    res.status(500).json({ message: 'Internal server error while fetching metadata' });
  }
};



module.exports = {
    createEvent,
    getEventDetailsById,
    getAllEvents,
    updateEvent,
    deleteEvent,
    getOrgEvents,
    getMetaDataOfEvents
    
};
 
