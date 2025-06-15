const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user.role;
        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: `Role ${req.user.role} is not allowed to access this resource` });
        }
        next();
    };
};

module.exports = authorizeRoles;