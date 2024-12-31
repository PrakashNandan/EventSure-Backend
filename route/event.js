const express = require('express');
const { createEvent, getEventDetailsById, getAllEvents, updateEvent, deleteEvent, getOrganizerEvents} = require('../controller/event');

const router = express.Router();

router.post('/create', createEvent);
router.get('/:id', getEventDetailsById);
router.get('/', getAllEvents);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.get('/xyz', getOrganizerEvents);


// router.post('/:id/book', bookSeat);

module.exports = router;