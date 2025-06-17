const express = require('express');
const router = express.Router();
const authorizeRoles = require('../middlewares/authorizeRoles');

const {getAllDetails, getAllEvents, getAllEventOrganizers, banOrganizer, unbanOrganizer, deleteEventByAdmin, approveEvent, rejectEvent} = require('../controller/admin');


router.get('/getAllDetails',  authorizeRoles('admin'), getAllDetails)
      .get('/getAllEvents', authorizeRoles('admin'), getAllEvents)
      .get('/getAllEventOrganizers', authorizeRoles('admin'), getAllEventOrganizers)
      .put('/banOrganizer/:organizerId', authorizeRoles('admin'), banOrganizer)
      .put('/unbanOrganizer/:organizerId', authorizeRoles('admin'), unbanOrganizer) 
      .put('/approveEvent/:eventId', authorizeRoles('admin'), approveEvent)
      .put('/rejectEvent/:eventId', authorizeRoles('admin'), rejectEvent)
      .delete('/deleteEvent/:eventId', authorizeRoles('admin'), deleteEventByAdmin);


module.exports = router;