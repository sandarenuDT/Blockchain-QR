// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ProductRegistry {
    struct Product {
        string productId;
        string dataHash;
        uint256 timestamp;
    }

    mapping(string => Product) public products;

    event ProductStored(string productId, string dataHash, uint256 timestamp);

    function storeProduct(string memory _productId, string memory _dataHash) public {
        products[_productId] = Product(_productId, _dataHash, block.timestamp);
        emit ProductStored(_productId, _dataHash, block.timestamp);
    }

    function getProduct(string memory _productId) public view returns (string memory, string memory, uint256) {
        Product memory p = products[_productId];
        return (p.productId, p.dataHash, p.timestamp);
    }
}
