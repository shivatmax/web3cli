// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AllowlistedERC20
 * @dev ERC20 token with minting restricted to addresses in an allowlist
 */
contract AllowlistedERC20 is ERC20, Ownable, ReentrancyGuard {
    mapping(address => bool) public minters;
    
    event MinterAdded(address indexed account);
    event MinterRemoved(address indexed account);
    
    constructor(string memory name, string memory symbol) 
        ERC20(name, symbol) 
        Ownable(msg.sender) 
    {}
    
    /**
     * @notice Modifier to restrict function access to approved minters
     */
    modifier onlyMinter() {
        require(minters[msg.sender], "AllowlistedERC20: caller is not a minter");
        _;
    }
    
    /**
     * @notice Add an address to the minter allowlist
     * @param account Address to add as a minter
     */
    function addMinter(address account) external onlyOwner {
        require(account != address(0), "Cannot add zero address as minter");
        require(!minters[account], "Address is already a minter");
        minters[account] = true;
        emit MinterAdded(account);
    }
    
    /**
     * @notice Remove an address from the minter allowlist
     * @param account Address to remove from minters
     */
    function removeMinter(address account) external onlyOwner {
        require(minters[account], "Address is not a minter");
        minters[account] = false;
        emit MinterRemoved(account);
    }
    
    /**
     * @notice Check if an address is a minter
     * @param account Address to check
     * @return bool True if the address is a minter
     */
    function isMinter(address account) external view returns (bool) {
        return minters[account];
    }
    
    /**
     * @notice Mint new tokens and assign them to an address
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyMinter nonReentrant {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        _mint(to, amount);
    }
} 