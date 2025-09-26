// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract BatchToken is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    
    address public agriChainContract;
    
    constructor() ERC721("AgriChainBatch", "ACB") {}
    
    modifier onlyAgriChain() {
        require(msg.sender == agriChainContract, "Only AgriChain contract can call this");
        _;
    }
    
    function setAgriChainContract(address _agriChainContract) external onlyOwner {
        agriChainContract = _agriChainContract;
    }
    
    function mint(address to, uint256 tokenId) external onlyAgriChain {
        _safeMint(to, tokenId);
    }
    
    function transferFrom(address from, address to, uint256 tokenId) public override(ERC721, IERC721) onlyAgriChain {
        _transfer(from, to, tokenId);
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId) public override(ERC721, IERC721) onlyAgriChain {
        safeTransferFrom(from, to, tokenId, "");
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) public override(ERC721, IERC721) onlyAgriChain {
        _safeTransfer(from, to, tokenId, _data);
    }
}