const pool = require("../db");
const crypto = require("crypto");
const {storeHash} =require("../services/blockchainService");

exports.addProduct =async(requestAnimationFrame,res)=>{
    try{
        const{ productId,temperature, location} = requestAnimationFrame.body;
        await pool.query(
            "INSERT INTO products (product_id, temperature, location) VALUES ($1, $2, $3)",
            [productId, temperature, location]

        );
        const dataString = `${productId}-${temperature}-${location}`;
        const dataHash = crypto.createHash("sha256").update(dataString).digest("hex")

        // store hash in blockchain
        const txHash = await storeHash(productId, dataHash);

        res.json({ message: "[Product stored successfully", txHash});
    }catch(err){
        console.error(err);
        res.status(500).json({ error: "Error storing product"});
    }
};