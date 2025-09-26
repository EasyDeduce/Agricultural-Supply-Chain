// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./BatchToken.sol";

contract AgriChain is Ownable, ReentrancyGuard {
    BatchToken public batchToken;
    
    enum BatchStatus { Created, Certified, Rejected, Purchased }
    enum UserRole { Farmer, Certifier, Retailer, None }
    
    struct Batch {
        uint256 batchId;
        string cropName;
        string cropVariety;
        string location;
        uint256 harvestDate;
        address farmer;
        address certifier;
        address retailer;
        BatchStatus status;
        string cropHealth;
        uint256 expiry;
        bool labResults;
        uint256 createdAt;
        uint256 certifiedAt;
        uint256 purchasedAt;
        uint256 price;
    }
    
    struct User {
        address userAddress;
        UserRole role;
        bool isRegistered;
    }
    
    // Batch ID to Batch mapping
    mapping(uint256 => Batch) public batches;
    
    // Address to User mapping
    mapping(address => User) public users;
    
    // Farmer address to their batch IDs
    mapping(address => uint256[]) public farmerBatches;
    
    // Certifier address to batches they've certified
    mapping(address => uint256[]) public certifierBatches;
    
    // Retailer address to batches they've purchased
    mapping(address => uint256[]) public retailerBatches;
    
    // Batch history records all transfers/status changes
    struct BatchHistory {
        address from;
        address to;
        uint256 timestamp;
        string action;
    }
    
    // Batch ID to its history
    mapping(uint256 => BatchHistory[]) public batchHistory;
    
    uint256 public nextBatchId = 1;
    
    // Events
    event UserRegistered(address indexed user, UserRole role);
    event BatchCreated(uint256 indexed batchId, string batchIdString, address indexed farmer);
    event BatchCertified(uint256 indexed batchId, address indexed certifier, bool passed);
    event BatchPurchased(uint256 indexed batchId, address indexed retailer);
    
    constructor(address _batchTokenAddress) {
        batchToken = BatchToken(_batchTokenAddress);
    }
    
    modifier onlyRole(UserRole _role) {
        require(users[msg.sender].isRegistered, "User not registered");
        require(users[msg.sender].role == _role, "User not authorized");
        _;
    }
    
    function registerUser(UserRole _role) external {
        require(!users[msg.sender].isRegistered, "User already registered");
        require(_role != UserRole.None, "Invalid role");
        
        users[msg.sender] = User({
            userAddress: msg.sender,
            role: _role,
            isRegistered: true
        });
        
        emit UserRegistered(msg.sender, _role);
    }
    
    function createBatch(
        string memory _batchId,
        string memory _cropName,
        string memory _cropVariety,
        string memory _location,
        uint256 _harvestDate,
        uint256 _price
    ) external onlyRole(UserRole.Farmer) {
        // Convert string batchId to uint256 for storage
        uint256 batchId = uint256(keccak256(abi.encodePacked(_batchId)));
        
        // Ensure batch ID is unique
        require(batches[batchId].farmer == address(0), "Batch ID already exists");
        
        Batch memory newBatch = Batch({
            batchId: batchId,
            cropName: _cropName,
            cropVariety: _cropVariety,
            location: _location,
            harvestDate: _harvestDate,
            farmer: msg.sender,
            certifier: address(0),
            retailer: address(0),
            status: BatchStatus.Created,
            cropHealth: "",
            expiry: 0,
            labResults: false,
            createdAt: block.timestamp,
            certifiedAt: 0,
            purchasedAt: 0,
            price: _price
        });
        
        batches[batchId] = newBatch;
        farmerBatches[msg.sender].push(batchId);
        
        // Mint a new NFT to represent this batch
        batchToken.mint(msg.sender, batchId);
        
        // Record in history
        batchHistory[batchId].push(BatchHistory({
            from: address(0),
            to: msg.sender,
            timestamp: block.timestamp,
            action: "CREATED"
        }));
        
        emit BatchCreated(batchId, _batchId, msg.sender);
    }
    
    function certifyBatch(
        uint256 _batchId,
        bool _passed,
        string memory _cropHealth,
        uint256 _expiry
    ) external onlyRole(UserRole.Certifier) {
        Batch storage batch = batches[_batchId];
        
        require(batch.batchId != 0, "Batch does not exist");
        require(batch.status == BatchStatus.Created, "Batch not in correct state");
        
        batch.certifier = msg.sender;
        batch.cropHealth = _cropHealth;
        batch.expiry = _expiry;
        batch.labResults = _passed;
        batch.certifiedAt = block.timestamp;
        
        if (_passed) {
            batch.status = BatchStatus.Certified;
        } else {
            batch.status = BatchStatus.Rejected;
        }
        
        certifierBatches[msg.sender].push(_batchId);
        
        // Record in history
        batchHistory[_batchId].push(BatchHistory({
            from: batch.farmer,
            to: msg.sender,
            timestamp: block.timestamp,
            action: _passed ? "CERTIFIED" : "REJECTED"
        }));
        
        emit BatchCertified(_batchId, msg.sender, _passed);
    }
    
    function purchaseBatch(uint256 _batchId) external payable onlyRole(UserRole.Retailer) nonReentrant {
        Batch storage batch = batches[_batchId];
        
        require(batch.batchId != 0, "Batch does not exist");
        require(batch.status == BatchStatus.Certified, "Batch not certified");
        require(msg.value >= batch.price, "Insufficient payment");
        
        // Transfer the ownership of batch token
        address currentOwner = batchToken.ownerOf(_batchId);
        require(currentOwner == batch.farmer, "Token not owned by farmer");
        
        // Transfer batch token
        batchToken.transferFrom(currentOwner, msg.sender, _batchId);
        
        // Update batch info
        batch.retailer = msg.sender;
        batch.status = BatchStatus.Purchased;
        batch.purchasedAt = block.timestamp;
        
        retailerBatches[msg.sender].push(_batchId);
        
        // Transfer payment to farmer
        payable(batch.farmer).transfer(msg.value);
        
        // Record in history
        batchHistory[_batchId].push(BatchHistory({
            from: batch.farmer,
            to: msg.sender,
            timestamp: block.timestamp,
            action: "PURCHASED"
        }));
        
        emit BatchPurchased(_batchId, msg.sender);
    }
    
    function getBatchDetails(uint256 _batchId) external view returns (Batch memory) {
        require(batches[_batchId].batchId != 0, "Batch does not exist");
        return batches[_batchId];
    }
    
    function getBatchHistory(uint256 _batchId) external view returns (BatchHistory[] memory) {
        require(batches[_batchId].batchId != 0, "Batch does not exist");
        return batchHistory[_batchId];
    }
    
    function getFarmerBatches(address _farmer) external view returns (uint256[] memory) {
        return farmerBatches[_farmer];
    }
    
    function getCertifierBatches(address _certifier) external view returns (uint256[] memory) {
        return certifierBatches[_certifier];
    }
    
    function getRetailerBatches(address _retailer) external view returns (uint256[] memory) {
        return retailerBatches[_retailer];
    }
    
    function estimateGasForBatchCreation() external pure returns (uint256) {
        // More accurate gas estimate for batch creation
        return 300000;
    }
    
    function estimateGasForCertification() external pure returns (uint256) {
        // Rough gas estimate for certification
        return 120000;
    }
    
    function estimateGasForPurchase() external pure returns (uint256) {
        // Rough gas estimate for purchase
        return 150000;
    }
}