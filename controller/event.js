const Event = require('../model/Event');
const mongoose = require('mongoose');
const Ticket = require('../model/Ticket');
const Notification = require('../model/Notification');
const uploadOnCloudinary = require('../utils/cloudinary');



const createEvent = async (req, res) => {
    const { name, description, date, time, location, price, discount, totalSeats } = req.body;

    const eventPhotoPath = req.file ? req.file.path : null;

    const eventCloudinaryRes = await uploadOnCloudinary(eventPhotoPath);

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
        const ticketHolders = tickets.map((ticket) => ticket.userId.toString());

        console.log("Ticket Holder : ", ticketHolders);
       

        if (ticketHolders.length === 0) {
            console.log("No ticket holder found");
        } else {
            console.log('Number of ticket holders found:', ticketHolders.length);

        }

        res.status(200).json({
            message: 'Event updated successfully',
            updatedEvent,
            ticketHolders,
            numberOfTicketHolders: ticketHolders.length,
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

        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting event' });
    }
};

const getOrgEvents = async (req, res) => {
    console.log("get organizer events called");
    const userId = req.user._id;
    console.log("printing user Id",userId);

    try {
        // Find all events created by the logged-in organizer (user)
        const events = await Event.find({ createdBy: userId }).sort({ createdAt: -1 });

        if (!events || events.length === 0) {
            return res.status(404).json({ message: 'No events found for this organizer' });
        }

        res.status(200).json({
            message: 'Events retrieved successfully',
            events,
        });
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
 
