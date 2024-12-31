const express = require('express');

const {bookTicket, getTickets, CancelTicket} = require('../controller/ticket');

const router = express.Router();

router.post('/book', bookTicket);
router.get('/', getTickets);
router.delete('/:id', CancelTicket);

module.exports = router;