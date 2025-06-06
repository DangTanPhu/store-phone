const nodemailer = require('nodemailer');
require ("dotenv").config();
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
exports.sendVerificationEmail = async (email, token) => {
  const verificationLink = `http://localhost:3000/api/auth/verify/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Xác thực tài khoản của bạn",
    html: `
      <p>Chào bạn,</p>
      <p>Vui lòng nhấn vào link dưới đây để xác thực tài khoản của bạn:</p>
      <a href="${verificationLink}">Xác thực tài khoản</a>
      <p>Link này có hiệu lực trong 1 giờ.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email xác thực đã được gửi đến:", email);
  } catch (error) {
    console.error("Lỗi khi gửi email xác thực:", error);
  }
};

const sendResetPasswordEmail = async (email, resetUrl) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Đặt lại mật khẩu",
    html: `<p>Nhấp vào liên kết sau để đặt lại mật khẩu của bạn:</p>
           <a href="${resetUrl}">${resetUrl}</a>
           <p>Liên kết sẽ hết hạn trong 1 giờ.</p>`,
  };

  await transporter.sendMail(mailOptions);
};

exports.sendOrderConfirmationEmail = async (email, order, invoice) => {
  try {
    const formatPrice = (price) => {
      return typeof price === 'number' ? price.toLocaleString('vi-VN') : '0';
    };

    // Log để debug
    console.log('Order shipping fee:', order.shippingFee);
    console.log('Full order data:', JSON.stringify(order, null, 2));

    // Đảm bảo phí ship luôn có giá trị
    const shippingFee = order.shippingFee || 30000;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Xác nhận đơn hàng #${order._id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Cảm ơn bạn đã đặt hàng!</h2>
          <p>Đơn hàng của bạn đã được xác nhận.</p>
          
          <div style="margin: 20px 0; padding: 20px; background-color: #f9f9f9;">
            <h3>Thông tin đơn hàng #${order._id}</h3>
            <p><strong>Ngày đặt hàng:</strong> ${new Date(order.createdAt).toLocaleString('vi-VN')}</p>
            <p><strong>Phương thức thanh toán:</strong> ${
              order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng' :
              order.paymentMethod === 'paypal' ? 'PayPal' : 'Chuyển khoản ngân hàng'
            }</p>
            <p><strong>Địa chỉ giao hàng:</strong><br/>
              ${order.shippingInfo.fullName}<br/>
              ${order.shippingInfo.phone}<br/>
              ${order.shippingInfo.streetAddress}, ${order.shippingInfo.wardName}<br/>
              ${order.shippingInfo.districtName}, ${order.shippingInfo.provinceName}
            </p>
          </div>

          <div style="margin: 20px 0;">
            <h3>Chi tiết đơn hàng:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 10px; text-align: left;">Sản phẩm</th>
                <th style="padding: 10px; text-align: right;">Số lượng</th>
                <th style="padding: 10px; text-align: right;">Đơn giá</th>
                <th style="padding: 10px; text-align: right;">Thành tiền</th>
              </tr>
              ${order.items.map(item => `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                    ${item.product?.name || 'Sản phẩm không xác định'}
                  </td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
                    ${item.quantity}
                  </td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
                    ${formatPrice(item.price)}đ
                  </td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
                    ${formatPrice(item.price * item.quantity)}đ
                  </td>
                </tr>
              `).join('')}
            </table>
          </div>

          <div style="margin: 20px 0; padding: 20px; background-color: #f9f9f9;">
            <p><strong>Tạm tính:</strong> ${formatPrice(order.totalAmount)}đ</p>
            <p><strong>Phí vận chuyển:</strong> ${formatPrice(shippingFee)}đ</p>
            ${order.discountAmount ? `<p><strong>Giảm giá:</strong> ${formatPrice(order.discountAmount)}đ</p>` : ''}
            <p style="font-size: 18px; color: #e53935;"><strong>Tổng cộng:</strong> ${formatPrice(order.finalAmount)}đ</p>
          </div>

          <div style="margin: 20px 0;">
            <p>Chúng tôi sẽ thông báo cho bạn khi đơn hàng được gửi đi.</p>
            <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent successfully');
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    throw error;
  }
};


const sendVerificationEmail = async (email, verificationToken) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const verificationUrl = `http://localhost:3000/verify-email?token=${verificationToken}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Xác thực email",
    text: `Vui lòng nhấp vào liên kết sau để xác thực email của bạn: ${verificationUrl}`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail, sendResetPasswordEmail };