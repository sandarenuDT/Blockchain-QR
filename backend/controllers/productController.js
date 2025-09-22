const pool = require("../db");
const crypto = require("crypto");
const { storeHash } = require("../services/blockchainService");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

const privateKey = fs.readFileSync(path.join(__dirname, "../keys/private.pem"), "utf8");
const publicKey = fs.readFileSync(path.join(__dirname, "../keys/public.pem"), "utf8");

exports.addProduct = async (req, res) => {
  try {
    const { productId, temperature, location } = req.body;

    // Check if product already exists
    const existing = await pool.query(
      "SELECT * FROM products WHERE product_id = $1",
      [productId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Product ID already exists" });
    }
    // create data hash
    const dataString = `${productId}-${temperature}-${location}`;
    const dataHash = crypto
      .createHash("sha256")
      .update(dataString)
      .digest("hex");

     // store hash in blockchain
    let txHash;
    try{
      txHash = await storeHash(productId, dataHash);
    } catch{
      console.error("blockchain error:")
    }
    const signer = crypto.createSign("SHA256");
    signer.update(txHash);
    signer.end();
    const signature = signer.sign({key:privateKey, passphrase:"tharuka"},"base64");
    
    await pool.query(
      "INSERT INTO products (product_id, temperature, location) VALUES ($1, $2, $3)",
      [productId, temperature, location]
    );
   
    // // store hash in blockchain
    // const txHash = await storeHash(productId, dataHash);
    // const signer = crypto.createSign("SHA256");
    // signer.update(txHash);
    // signer.end();
    // const signature = signer.sign({key:privateKey, passphrase:"tharuka"},"base64");
    await pool.query(
      "INSERT INTO blockchain_hashes (product_id, tx_hash, signature) VALUES ($1, $2, $3)",
      [productId, txHash, signature]
    );

    const qrPayload = JSON.stringify({ txHash, signature});

    const filename = `qr_${productId}.png`;
    const filePath = path.join(__dirname, "../qrCodes",filename);
    //qr code
    await QRCode.toFile(filePath,qrPayload,{
        color: {
            dark: "#000000",
            light:"#ffffff"
        }
    })
    res.json({
      message: "[Product stored successfully",
      txHash,signature,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error storing product" });
  }
};

exports.verifyQRCode = async (req, res) => {
  try {
    const { txHash, signature } = req.body;
    if (!txHash || !signature){
      return res.status(400).json({ error: "txHash and signature are required"})
    }
    const verifier = crypto.createVerify("SHA256");
    verifier.update(txHash);
    verifier.end();
    console.log(verifier);
    const isValid = verifier.verify(publicKey, signature, "base64");

    if (!isValid){
      return res.status(400).json({ error: "Invalid QR code signature"});
    }

    const result = await pool.query(
      "SELECT * FROM products WHERE product_id = (SELECT product_id FROM blockchain_hashes WHERE tx_hash = $1)",
      [txHash]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error retrieving product" });
  }
};

