const express = require('express');
const { createEvent, getEventDetailsById, getAllEvents, updateEvent, deleteEvent, getOrgEvents} = require('../controller/event');
const upload = require('../middlewares/multer');


const router = express.Router();

router.post('/create', upload.single('eventPhoto') ,createEvent)
      .get('/getorgevents', getOrgEvents)

      .get('/:id', getEventDetailsById)
      .get('/', getAllEvents)
      .patch('/:id', updateEvent)
      .delete('/:id', deleteEvent)



// router.post('/:id/book', bookSeat);

module.exports = router;