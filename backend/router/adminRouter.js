const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const upload = require('../middleware/uploadMiddleware');
const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const inventoryController = require("../controllers/inventoryController");
const supplierController = require("../controllers/supplierController");
const Delivery = require("../models/Delivery");
const voucherController = require("../controllers/voucherController");

// Nếu không muốn xác minh quyền từ admin, bạn có thể bỏ qua middleware auth và admin
// router.use(authMiddleware); // Xóa dòng này
// router.use(adminMiddleware); // Xóa dòng này

// Quản lý sản phẩm
router.get("/products", adminController.getAllProducts);
router.post('/products', upload.single('image'), adminController.createProduct);
router.put('/products/:id', upload.single('image'), adminController.updateProduct);
router.delete("/products/:id", adminController.deleteProduct);

// Quản lý đơn hàng
router.get("/orders", adminController.getAllOrders);
router.put("/orders/:id", adminController.updateOrderStatus);

// Quản lý người dùng
router.get("/users", adminController.getAllUsers);
router.put("/users/:id", adminController.updateUserStatus);
router.put("/users/:userId/role", adminController.changeUserRole);
router.patch("/users/:id/toggle-status", adminController.toggleUserStatus);
router.put("/updateUser/:id", adminController.updateUser);
router.delete("/deleteUser/:id", adminController.deleteUser);
router.put("/updateCategory/:id", adminController.updateCategory);
// Thống kê
router.get("/statistics", adminController.getStatistics);

// Quản lý kho hàng
router.get("/products/low-stock", inventoryController.getLowStockProducts);
router.put("/products/update-stock", inventoryController.updateStock);
router.post("/createUser", adminController.createUser);

// Quản lý đơn đặt hàng
router.get("/purchase-orders", inventoryController.getPurchaseOrders);
router.post("/purchase-orders", inventoryController.createPurchaseOrder);
router.put("/purchase-orders/:id", inventoryController.updatePurchaseOrder);
router.get(
  "/purchase-orders/:id/pdf",
  inventoryController.generatePurchaseOrderPDF
);
router.get(
  "/purchase-orders/:id/receipt-pdf",
  inventoryController.generateReceiptConfirmationPDF
);

// Kiểm tra hàng tồn kho thấp
router.post("/check-low-stock", inventoryController.manualCheckLowStock);

// Quản lý nhà cung cấp
router.get("/suppliers", supplierController.getSuppliers);
router.post("/suppliers", supplierController.createSupplier);
router.put("/suppliers/:id", supplierController.updateSupplier);
router.delete("/suppliers/:id", supplierController.deleteSupplier);

router.get("/statistics/download", adminController.downloadStatisticsReport);

// Quản lý voucher
router.post("/vouchers", adminController.createVoucher);
router.get("/vouchers", adminController.getAllVouchers);
router.put("/vouchers/:id", adminController.updateVoucher);
router.delete("/vouchers/:id", adminController.deleteVoucher);

router.put(
  "/purchase-orders/:id/confirm-receipt",
  inventoryController.confirmReceiptAndUpdateInventory
);

router.put("/deliveries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Cập nhật trạng thái giao hàng
    const updatedDelivery = await Delivery.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedDelivery) {
      return res.status(404).json({ message: "Không tìm thấy đơn giao hàng" });
    }

    // Cập nhật trạng thái đơn hàng tương ứng
    let orderStatus;
    switch (status) {
      case "pending":
        orderStatus = "processing";
        break;
      case "shipping":
        orderStatus = "shipped";
        break;
      case "delivered":
        orderStatus = "delivered";
        break;
      case "cancelled":
        orderStatus = "cancelled";
        break;
      default:
        orderStatus = "processing";
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      updatedDelivery.order,
      { status: orderStatus },
      { new: true }
    );

    res.json({ delivery: updatedDelivery, order: updatedOrder });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

router.post("/api/vouchers/apply", voucherController.applyVoucher);

module.exports = router;