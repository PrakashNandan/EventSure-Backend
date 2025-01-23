const express = require('express');
const router = express.Router();
const protect = require('../middlewares/protect');
const { signup, login, getUserDetails } = require('../controller/auth');

router.post('/signup', signup)
       .post('/login', login)
       .get('/getUserDetails', protect, getUserDetails)

module.exports = router;
