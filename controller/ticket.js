const express = require("express");
const mongoose = require("mongoose");
const Razorpay = require('razorpay');
const crypto = require('crypto');

const Event = require("../model/Event");
const Ticket = require("../model/Ticket");
require('dotenv').config();


const CanbookTicket = async (req, res) => {
  const { eventId, quantity } = req.body;
  const userId = req.user._id;

  console.log("printing user id", userId);
  console.log("printing event id", eventId);
  console.log("printing quantity", quantity);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
 
    const event = await Event.findById(eventId).session(session);
    // console.log("printing event", event);

    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Event not found" });
    }

  
    const availableSeats = event.totalSeats - event.bookedSeats;
    if (availableSeats < quantity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Not enough seats available" });
    }


    const newTicket = new Ticket({
      eventId: eventId,
      userId: userId,
      quantity: quantity,
      totalPrice: (event.price * (100 - event.discount) / 100) * quantity,
    });

    await newTicket.save();

    const ticketId = newTicket._id;

    console.log("ticket Id from checkout", ticketId);



    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_API_KEY,
      key_secret: process.env.RAZORPAY_SECRET_KEY,
    });
  
    const orderOptions = {
      amount: Math.floor(((event.price * (100 - event.discount)) / 100) * quantity * 100), // in paise
      currency: 'INR',
      receipt: `ticket_${ticketId}`,
      payment_capture: 1, // Automatically capture the payment
    };
  
    try {
      const razorpayOrder = await razorpay.orders.create(orderOptions);
      console.log("printing order", razorpayOrder);
  
      // Send the Razorpay order ID and other payment details to the frontend
      return res.status(200).json({
        message: "Payment initiated, please complete the payment.",
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_API_KEY, // Send the key ID to frontend for payment
        ticketId: ticketId,
      });
  
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error creating Razorpay order" });
    }

 
  } catch (error) {
    // If an error occurs, abort the transaction
    console.error(error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Error while booking ticket" });
  }
};

const verifyPaymentAndBookTicket = async (req, res) => {

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, ticketId } = req.body;
  console.log("req.body  ", req.body);  
  const userId = req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const ticket = await Ticket.findById(ticketId).session(session);
    console.log("ticket : ",ticket)

    if (ticket==null || !ticket) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.userId.toString() !== userId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: "You are not authorized to book this ticket" });
    }

    const event = await Event.findById(ticket.eventId).session(session);
    console.log("event : ",event)

    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Event not found" });
    }

    const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Payment verification failed" });
    }

    ticket.status = 'confirmed';
    ticket.paymentId = razorpay_payment_id;
    ticket.paymentSignature = razorpay_signature;
    ticket.paymentDate = new Date();

    event.bookedSeats += ticket.quantity;

    await ticket.save();
    await event.save();

    await session.commitTransaction();
    session.endSession();

    console.log("payment successfulllll and booked ticket : ", ticket)
    res.status(200).json({ message: "Ticket booked successfully" });

  } catch (error) {
    console.error(error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Error booking ticket" });
  }
}

const getTickets = async (req, res) => {
  const userId = req.user._id;

  try {
    const tickets = await Ticket.find({ userId: userId })
      .sort({ createdAt: -1 }) // Sort tickets by creation date in descending order
      .populate("eventId", "name date time location") // Populate event details
      .populate("userId", "name email") // Populate user details
      .exec();

    // If no tickets are found, return a 404 response
    if (tickets.length === 0) {
      return res
        .status(404)
        .json({ message: "No tickets found for this user" });
    }

    // Return the tickets as the response
    res.status(200).json({
      message: "Tickets retrieved successfully",
      tickets: tickets,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving tickets" });
  }
};

const CancelTicket = async (req, res) => {
  const ticketId = req.params.id;
  const userId = req.user._id;

  try {
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to Cancle this ticket" });
    }

    const event = ticket.eventId;  

    // Get the current date and the event date
    const currentDate = new Date();
    const eventDate = new Date(event.date);

     // Check if the cancellation request is made at least 1 day (24 hours) before the event
     const timeDifference = eventDate - currentDate;
     const oneDayInMilliseconds = 24 * 60 * 60 * 1000;  // 1 day in milliseconds

     if (timeDifference < oneDayInMilliseconds) {
         return res.status(400).json({ message: 'You can only cancel tickets at least 24 hours before the event' });
     }

    await Ticket.findByIdAndDelete(ticketId);

    res.status(200).json({ message: "Ticket cancelled successfully, Refund will process in few days" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting ticket" });
  }
};

module.exports = {
  CanbookTicket,
  verifyPaymentAndBookTicket,
  getTickets,
  CancelTicket
};
