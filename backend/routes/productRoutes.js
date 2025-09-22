const express = require("express");
const router = express.Router();
const { addProduct } = require("../controllers/productController");
const { verifyQRCode } = require("../controllers/productController");

router.post("/products", addProduct);
router.post("/verify",verifyQRCode);

module.exports = router;
