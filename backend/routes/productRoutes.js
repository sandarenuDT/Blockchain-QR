const express = require("express");
const router = express.Router();
const { addProduct } = require("../controllers/productController");

router.post("/products", addProduct);

module.exports = router;
