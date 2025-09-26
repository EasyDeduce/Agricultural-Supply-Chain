// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Authentication is Ownable {
    enum UserRole { Farmer, Certifier, Retailer }
    
    struct UserProfile {
        address userAddress;
        string name;
        string userId;
        string location;
        UserRole role;
        uint256 registrationDate;
        bool isActive;
    }
    
    // Farmer specific details
    struct FarmerProfile {
        uint256 lastHarvestDate;
        uint256[] registeredCrops;
    }
    
    // Certifier specific details
    struct CertifierProfile {
        string company;
        uint256[] certifiedCrops;
        uint256[] rejectedCrops;
    }
    
    // Retailer specific details
    struct RetailerProfile {
        uint256[] purchasedCrops;
    }
    
    // User mappings
    mapping(address => UserProfile) public users;
    mapping(address => FarmerProfile) public farmers;
    mapping(address => CertifierProfile) public certifiers;
    // Change to private to fix the error
    mapping(address => RetailerProfile) private _retailers;
    
    // Events
    event UserRegistered(address indexed user, UserRole role, string name, string userId);
    event UserUpdated(address indexed user, string name, string location);
    
    function registerFarmer(
        string memory _name,
        string memory _farmerId,
        string memory _location
    ) external {
        require(users[msg.sender].userAddress == address(0), "User already registered");
        
        users[msg.sender] = UserProfile({
            userAddress: msg.sender,
            name: _name,
            userId: _farmerId,
            location: _location,
            role: UserRole.Farmer,
            registrationDate: block.timestamp,
            isActive: true
        });
        
        farmers[msg.sender] = FarmerProfile({
            lastHarvestDate: 0,
            registeredCrops: new uint256[](0)
        });
        
        emit UserRegistered(msg.sender, UserRole.Farmer, _name, _farmerId);
    }
    
    function registerCertifier(
        string memory _name,
        string memory _certifierId,
        string memory _company
    ) external {
        require(users[msg.sender].userAddress == address(0), "User already registered");
        
        users[msg.sender] = UserProfile({
            userAddress: msg.sender,
            name: _name,
            userId: _certifierId,
            location: "",
            role: UserRole.Certifier,
            registrationDate: block.timestamp,
            isActive: true
        });
        
        certifiers[msg.sender] = CertifierProfile({
            company: _company,
            certifiedCrops: new uint256[](0),
            rejectedCrops: new uint256[](0)
        });
        
        emit UserRegistered(msg.sender, UserRole.Certifier, _name, _certifierId);
    }
    
    function registerRetailer(
        string memory _name,
        string memory _retailerId,
        string memory _location
    ) external {
        require(users[msg.sender].userAddress == address(0), "User already registered");
        
        users[msg.sender] = UserProfile({
            userAddress: msg.sender,
            name: _name,
            userId: _retailerId,
            location: _location,
            role: UserRole.Retailer,
            registrationDate: block.timestamp,
            isActive: true
        });
        
        _retailers[msg.sender] = RetailerProfile({
            purchasedCrops: new uint256[](0)
        });
        
        emit UserRegistered(msg.sender, UserRole.Retailer, _name, _retailerId);
    }
    
    function updateFarmerHarvestDate(uint256 _harvestDate) external {
        require(users[msg.sender].role == UserRole.Farmer, "Not a farmer");
        farmers[msg.sender].lastHarvestDate = _harvestDate;
    }
    
    function addCropToFarmer(address _farmer, uint256 _cropId) external onlyOwner {
        require(users[_farmer].role == UserRole.Farmer, "Not a farmer");
        farmers[_farmer].registeredCrops.push(_cropId);
    }
    
    function addCropToCertifier(address _certifier, uint256 _cropId, bool _certified) external onlyOwner {
        require(users[_certifier].role == UserRole.Certifier, "Not a certifier");
        if (_certified) {
            certifiers[_certifier].certifiedCrops.push(_cropId);
        } else {
            certifiers[_certifier].rejectedCrops.push(_cropId);
        }
    }
    
    function addCropToRetailer(address _retailer, uint256 _cropId) external onlyOwner {
        require(users[_retailer].role == UserRole.Retailer, "Not a retailer");
        _retailers[_retailer].purchasedCrops.push(_cropId);
    }
    
    function getUserProfile(address _user) external view returns (
        string memory name,
        string memory userId,
        string memory location,
        UserRole role
    ) {
        UserProfile memory profile = users[_user];
        return (profile.name, profile.userId, profile.location, profile.role);
    }
    
    function getFarmerProfile(address _farmer) external view returns (
        uint256 lastHarvestDate,
        uint256[] memory registeredCrops
    ) {
        require(users[_farmer].role == UserRole.Farmer, "Not a farmer");
        FarmerProfile memory profile = farmers[_farmer];
        return (profile.lastHarvestDate, profile.registeredCrops);
    }
    
    function getCertifierProfile(address _certifier) external view returns (
        string memory company,
        uint256[] memory certifiedCrops,
        uint256[] memory rejectedCrops
    ) {
        require(users[_certifier].role == UserRole.Certifier, "Not a certifier");
        CertifierProfile memory profile = certifiers[_certifier];
        return (profile.company, profile.certifiedCrops, profile.rejectedCrops);
    }
    
    function getRetailerProfile(address _retailer) external view returns (
        uint256[] memory purchasedCrops
    ) {
        require(users[_retailer].role == UserRole.Retailer, "Not a retailer");
        RetailerProfile memory profile = _retailers[_retailer];
        return (profile.purchasedCrops);
    }
}