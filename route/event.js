const express = require('express');
const { createEvent, getEventDetailsById, getAllEvents, updateEvent, deleteEvent, getOrgEvents, getMetaDataOfEvents} = require('../controller/event');
const upload = require('../middlewares/multer');
const authorizeRoles = require('../middlewares/authorizeRoles');


const router = express.Router();

router.post('/create', authorizeRoles('admin', 'organizer'), upload.single('eventPhoto') ,createEvent)
      .get('/getorgevents', authorizeRoles('organizer', 'admin'), getOrgEvents)
      .get('/getEventMetaData', authorizeRoles('organizer'), getMetaDataOfEvents)
      .get('/:id', getEventDetailsById)
      .get('/', getAllEvents)
      .patch('/:id', authorizeRoles('organizer', 'admin'), updateEvent)
      .delete('/:id', authorizeRoles('organizer', 'admin'), deleteEvent)



// router.post('/:id/book', bookSeat);

module.exports = router;