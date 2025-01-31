const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    date: {
        type: Date,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
        trim: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    totalSeats: {
        type: Number,
        required: true,
        min: 1, // Ensure at least 1 seat
    },
    bookedSeats: {
        type: Number,
        default: 0, // Initially, no seats are booked
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    organizerName: {
        type: String,
        required: true, 
    },
    eventPhoto:{
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
