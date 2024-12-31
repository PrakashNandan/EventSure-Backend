const jwt = require('jsonwebtoken');
const User = require('../model/User');



const protect = async (req, res, next) => {
    console.log("protect middleware called");
    try {
        let token;

        // Checking if Authorization header exists and starts with 'Bearer'
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1]; // Extract token
        }
        
        console.log("printing token",token);

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, token missing' });
        }

        // verifying token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user to request object
        req.user = await User.findById(decoded.id).select('-password'); // Excluding password from response
        console.log(req.user);

        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error(error.message);
        res.status(401).json({ message: 'Not authorized, invalid token' });
    }
};

module.exports = protect;
