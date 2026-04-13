// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title VendingMachine
 * @notice A decentralized vending machine where users can browse products,
 *         purchase items with ETH, and track ownership of purchased goods.
 *
 * Design choices:
 * - Product catalog (name, price, stock) lives on-chain because it drives
 *   purchase validation and must be trustless.
 * - Purchase history is stored on-chain so ownership is verifiable by anyone.
 * - Product images/descriptions are kept off-chain (frontend) to save gas.
 */
contract VendingMachine {
    address public admin;

    struct Product {
        string name;
        uint256 price;   // in wei
        uint256 stock;
        bool exists;
    }

    struct Purchase {
        uint256 productId;
        uint256 quantity;
        uint256 totalPaid;
        uint256 timestamp;
    }

    uint256 public nextProductId;
    mapping(uint256 => Product) public products;
    mapping(address => Purchase[]) private purchaseHistory;

    event ItemPurchased(
        address indexed buyer,
        uint256 indexed productId,
        uint256 quantity,
        uint256 totalPaid
    );

    event ProductRestocked(
        uint256 indexed productId,
        uint256 addedQuantity,
        uint256 newStock
    );

    event ProductAdded(
        uint256 indexed productId,
        string name,
        uint256 price,
        uint256 stock
    );

    event FundsWithdrawn(address indexed admin, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /// @notice Add a new product to the vending machine (admin only)
    function addProduct(
        string calldata _name,
        uint256 _price,
        uint256 _stock
    ) external onlyAdmin returns (uint256) {
        require(bytes(_name).length > 0, "Product name cannot be empty");
        require(_price > 0, "Price must be greater than zero");

        uint256 id = nextProductId;
        products[id] = Product(_name, _price, _stock, true);
        nextProductId++;

        emit ProductAdded(id, _name, _price, _stock);
        return id;
    }

    /// @notice Purchase a quantity of a product by sending the correct ETH
    function purchase(uint256 _productId, uint256 _quantity) external payable {
        require(_quantity > 0, "Quantity must be at least 1");

        Product storage product = products[_productId];
        require(product.exists, "Product does not exist");
        require(product.stock >= _quantity, "Not enough stock available");

        uint256 totalCost = product.price * _quantity;
        require(msg.value >= totalCost, "Insufficient payment");

        product.stock -= _quantity;

        purchaseHistory[msg.sender].push(
            Purchase(_productId, _quantity, totalCost, block.timestamp)
        );

        // Refund overpayment
        uint256 excess = msg.value - totalCost;
        if (excess > 0) {
            (bool sent, ) = payable(msg.sender).call{value: excess}("");
            require(sent, "Refund failed");
        }

        emit ItemPurchased(msg.sender, _productId, _quantity, totalCost);
    }

    /// @notice Restock a product (admin only)
    function restock(uint256 _productId, uint256 _quantity) external onlyAdmin {
        require(products[_productId].exists, "Product does not exist");
        require(_quantity > 0, "Quantity must be at least 1");

        products[_productId].stock += _quantity;

        emit ProductRestocked(
            _productId,
            _quantity,
            products[_productId].stock
        );
    }

    /// @notice Withdraw accumulated sales revenue (admin only)
    function withdraw() external onlyAdmin {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool sent, ) = payable(admin).call{value: balance}("");
        require(sent, "Withdrawal failed");

        emit FundsWithdrawn(admin, balance);
    }

    /// @notice Get full product info
    function getProduct(uint256 _productId)
        external
        view
        returns (string memory name, uint256 price, uint256 stock)
    {
        Product storage p = products[_productId];
        require(p.exists, "Product does not exist");
        return (p.name, p.price, p.stock);
    }

    /// @notice Get all purchases for a given buyer
    function getPurchases(address _buyer)
        external
        view
        returns (Purchase[] memory)
    {
        return purchaseHistory[_buyer];
    }

    /// @notice Get total number of products
    function getProductCount() external view returns (uint256) {
        return nextProductId;
    }
}
