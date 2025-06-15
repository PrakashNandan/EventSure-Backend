const Event = require('../model/Event');
const mongoose = require('mongoose');
const Ticket = require('../model/Ticket');
const User = require('../model/User');

const getAllDetails = async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalUpcomingEvents = await Event.countDocuments({ date: { $gte: new Date() } });
    const totalTickets = await Ticket.countDocuments();
    const totalRevenue = await Ticket.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    res.status(200).json({
        totalUsers,
        totalEvents,
        totalUpcomingEvents,
        totalTickets,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0
    });
}

const getAllEvents = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await Event.countDocuments();

        const events = await Event.find()
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .populate('createdBy', 'name email');

        res.status(200).json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            events,
        });
    } catch (error) {
        console.error("Error fetching paginated events:", error);
        res.status(500).json({ message: 'Error fetching events' });
    }
};

const deleteEventByAdmin = async (req, res) => {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID' });
    }

    try {
        const event = await Event.findByIdAndDelete(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.status(200).json({ message: 'Event deleted successfully by Admin' });
    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ message: 'Error deleting event' });
    }
}

const getAllEventOrganizers = async (req, res) => {
 

  try {
    const organizerIds = await Event.distinct('createdBy');

    if (!organizerIds || organizerIds.length === 0) {
      return res.status(404).json({ message: 'No event organizers found' });
    }

    const organizers = await User.find({ _id: { $in: organizerIds } })
      .select('name email address role isBanned');

    res.status(200).json({
      message: 'Organizers retrieved successfully',
      organizers,
    });

  } catch (error) {
    console.error("Error fetching organizers:", error);
    res.status(500).json({ message: 'Internal server error while fetching organizers' });
  }
};

const banOrganizer = async (req, res) => {
  try {
    const { organizerId } = req.params;

    const user = await User.findById(organizerId);

    if (!user || user.role !== "organizer") {
      return res.status(404).json({ message: "Organizer not found" });
    }

    user.isBanned = true;
    await user.save();

    res.status(200).json({ message: "Organizer has been banned successfully by Admin" });
  } catch (error) {
    console.error("Error banning organizer:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const unbanOrganizer = async (req, res) => {
  try {
    const { organizerId } = req.params;

    const user = await User.findById(organizerId);

    if (!user || user.role !== "organizer") {
      return res.status(404).json({ message: "Organizer not found" });
    }

    user.isBanned = false;
    await user.save();

    res.status(200).json({ message: "Organizer has been unbanned successfully by admin" });
  } catch (error) {
    console.error("Error unbanning organizer:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const approveEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    event.status = "approved";
    await event.save();

    res.status(200).json({ message: "Event approved successfully", event });
  } catch (error) {
    console.error("Error approving event:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const rejectEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    event.status = "rejected";
    await event.save();

    res.status(200).json({ message: "Event rejected successfully", event });
  } catch (error) {
    console.error("Error rejecting event:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};






module.exports = {
    getAllDetails,
    getAllEvents,
    deleteEventByAdmin,
    getAllEventOrganizers,
    banOrganizer,
    unbanOrganizer,
    approveEvent,
    rejectEvent
};