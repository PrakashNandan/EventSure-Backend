const express = require('express');
const { createNotification, getTicketHolderNotifications, getNotification } = require('../controller/notification');


const router = express.Router();

router.post('/create', createNotification)
        .get('/', getNotification)


        
module.exports = router;