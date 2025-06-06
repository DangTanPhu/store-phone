const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Giả sử bạn có một model User để lấy thông tin người dùng

const authMiddleware = async (req, res, next) => {
    try {
        // Lấy token từ header Authorization
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).send('Access Denied: No token provided');
        }

        // Giải mã token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Đảm bảo rằng JWT_SECRET được cấu hình trong .env

        // Tìm người dùng từ ID có trong token
        const user = await User.findById(decoded.userId);

        // Gắn thông tin người dùng vào req.user để sử dụng trong các phần tiếp theo của request
        req.user = user;

        // Tiếp tục với next middleware hoặc handler
        next();
    } catch (error) {
        res.status(400).send('Invalid or expired token');
    }
};

module.exports = authMiddleware;
