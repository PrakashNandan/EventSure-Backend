const express = require('express');

const {CanbookTicket, verifyPaymentAndBookTicket, getTickets, CancelTicket} = require('../controller/ticket');

const router = express.Router();

router.post('/checkout', CanbookTicket);
router.post('/bookticket', verifyPaymentAndBookTicket);
router.get('/', getTickets);
router.delete('/:id', CancelTicket);

module.exports = router;