const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    quantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    paymentId: { type: String},
    paymentSignature: { type: String},
    paymentDate: { type: Date},
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;