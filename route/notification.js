const express = require('express');
const { createNotification, getTicketHolderNotifications } = require('../controller/notification');


const router = express.Router();

router.post('/create', createNotification)
        .get('/', getTicketHolderNotifications)


        
module.exports = router;