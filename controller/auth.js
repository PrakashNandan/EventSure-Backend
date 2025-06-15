const User  = require('../model/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const signup = async (req, res) => {
    const { name, email, address, pincode, password, role } = req.body;

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            address,
            pincode,
            password: hashedPassword,
            role: role || 'user' // Default to 'user' if no role is provided
        });

        await newUser.save();

        res.status(201).json({ message: 'registration successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error registering' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user._id, role: user.role  }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.status(200).json({
            message: 'Login successful',
            token,
            userId: user._id,
            role: user.role
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error logging in user' });
    }
};

const getUserDetails = async (req, res) => {
    const userId = req.user._id;

    try {
        const user = await User.findById(userId).select('-password');
        res.status(200).json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error getting user details' });
    }
};



module.exports = {
    signup,
    login,
    getUserDetails
};
