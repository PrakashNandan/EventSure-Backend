const express = require("express");
const mongoose = require("mongoose");

const Event = require("../model/Event");
const Ticket = require("../model/Ticket");

const bookTicket = async (req, res) => {
  const { eventId, quantity } = req.body;
  const userId = req.user._id;

  console.log("printing user id", userId);
  console.log("printing event id", eventId);
  console.log("printing quantity", quantity);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the event and check for available seats
    const event = await Event.findById(eventId).session(session);

    if (!event) {
      // Abort the transaction if the event is not found
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if there are enough available seats
    const availableSeats = event.totalSeats - event.bookedSeats;
    if (availableSeats < quantity) {
      // Abort transaction if not enough seats are available
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Not enough seats available" });
    }

    // Create a new ticket document (Initially marked as 'pending' before payment)
    const newTicket = new Ticket({
      eventId,
      userId,
      quantity,
      totalPrice: ((event.price * (100 - event.discount)) / 100) * quantity,
      status: "pending", // Ticket is initially pending before payment
    });

    // save the ticket in the database (status is 'pending')
    await newTicket.save({ session });

    // Lock the event and update the bookedSeats
    event.bookedSeats += quantity;

    // Save the updated event
    await event.save({ session });

    //  Commit the transaction (for the initial booking)
    await session.commitTransaction();
    session.endSession();

    //  Call payment gateway to process the payment
    // const paymentSuccess = await processPayment(totalPrice);
    const paymentSuccess = true;

    if (paymentSuccess) {
      //  If payment is successful, update the ticket status to 'confirmed'
      newTicket.status = "confirmed";
      await newTicket.save(); // Save the updated ticket

      //  Respond with success and ticket details
      return res.status(200).json({
        message: "Ticket booked successfully and payment confirmed.",
        ticket: newTicket,
      });
    } else {
      // If payment fails, you can choose to leave the status as 'pending' or cancel the booking.
      // Optionally, you can delete the ticket or perform other actions.

      // For now, we leave the ticket status as 'pending'
      return res.status(400).json({
        message: "Payment failed, your booking is still pending.",
        ticket: newTicket,
      });
    }
  } catch (error) {
    // If an error occurs, abort the transaction
    console.error(error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Error while booking ticket" });
  }
};

const getTickets = async (req, res) => {
  const userId = req.user._id;

  try {
    const tickets = await Ticket.find({ userId: userId })
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
  bookTicket,
  getTickets,
  CancelTicket
};
