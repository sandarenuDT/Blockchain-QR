const ethers = require("ethers");
const contractABI = require("../../build/contracts/ProductRegistry.json").abi;

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545"); // Ganache

async function getContract() {
  const signer = await provider.getSigner(0);
  const contractAddress = "0x1Fe09c1b168ED942142a0c661c5e715974f955C0";
  return new ethers.Contract(contractAddress, contractABI, signer);
}

async function storeHash(productId, dataHash) {
  const contract = await getContract();
  const tx = await contract.storeProduct(productId, dataHash);
  await tx.wait();
  return tx.hash;
}

async function getHash(productId) {
  const contract = await getContract();
  return await contract.getProduct(productId);
}

module.exports = { storeHash, getHash };
