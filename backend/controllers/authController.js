const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendResetPasswordEmail } = require("../utils/emailService");
require("dotenv").config();

// Đăng ký người dùng
exports.register = async (req, res) => {
  try {
    const { username, email, password, fullName, phoneNumber, address, role } = req.body;
    console.log("Registration attempt:", { username, email, role });

    // Kiểm tra email có phải là Gmail không
    if (!email.endsWith("@gmail.com")) {
      return res.status(400).json({ message: "Vui lòng sử dụng email Gmail (@gmail.com)" });
    }

    // Kiểm tra tài khoản đã tồn tại chưa
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Mặc định vai trò là 'user'
    let userRole = role === "admin" ? "admin" : "user";

    // Băm mật khẩu
    const hashedPassword = await bcrypt.hash(password, 12);

    // Lưu thông tin người dùng
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      fullName, // Optional field
      phoneNumber, // Optional field with validation
      address, // Optional field
      role: userRole,
    });
    await newUser.save();

    return res.status(200).json({ message: "Đăng ký thành công! Bạn có thể đăng nhập ngay." });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Username or email already exists" });
    }
    // Handle validation errors from Mongoose
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: "Validation error", errors: messages });
    }
    res.status(500).json({ message: "Error creating user", error: error.message });
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Tài khoản không tồn tại" });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message:
          "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ email: tanphong@gmail.com để được hỗ trợ.",
        status: "locked",
      });
    }

    if (user.isLocked) {
      const remainingTime = Math.ceil(
        (user.lockUntil - Date.now()) / (60 * 1000)
      );
      return res.status(403).json({
        message: `Tài khoản tạm thời bị khóa. Vui lòng thử lại sau ${remainingTime} phút.`,
        status: "temporary_locked",
        remainingTime,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await user.incrementLoginAttempts(); // Sử dụng phương thức từ schema
      return res.status(400).json({ message: "Mật khẩu không đúng" });
    }

    // Reset login attempts nếu đăng nhập thành công
    if (user.loginAttempts > 0) {
      await user.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 },
      });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName, // Sử dụng fullName thay vì name
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Server error during login:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Xử lý quên mật khẩu
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng với email này" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 giờ
    await user.save();

    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    await sendResetPasswordEmail(email, resetUrl);

    res.json({ message: "Liên kết đặt lại mật khẩu đã được gửi đến email của bạn" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xử lý yêu cầu", error: error.message });
  }
};

// Đặt lại mật khẩu
exports.resetPassword = async (req, res) => {
  try {
   
    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,  
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Mật khẩu đã được đặt lại thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi đặt lại mật khẩu" });
  }
};

// Lấy danh sách tất cả người dùng
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password").populate("shippingInfo");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Thay đổi vai trò người dùng
exports.changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Vai trò không hợp lệ" });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};