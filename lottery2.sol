// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

/**
 * @title Decentralized Lottery
 * @dev This contract implements a simple decentralized lottery system
 */
contract Lottery is Ownable, ReentrancyGuard, VRFConsumerBase {
    mapping(address => bool) public players;
    address[] public playerAddresses;
    uint256 public totalPot;
    uint256 public entryFee;
    bool public lotteryOpen;

    bytes32 internal keyHash;
    uint256 internal fee;

    uint256 public randomResult;

    event LotteryOpened(uint256 entryFee);
    event PlayerEntered(address indexed player, uint256 entryFee);
    event PlayerExited(address indexed player, uint256 refundedAmount);
    event LotteryClosed(address indexed winner, uint256 amountWon);
    event LotteryReset();

    constructor(uint256 _entryFee, address vrfCoordinator, address link) 
        VRFConsumerBase(vrfCoordinator, link) 
    {
        require(_entryFee > 0, "Entry fee must be greater than zero");
        entryFee = _entryFee;
        keyHash = 0x6c36992815b5b2b0b8e7e1b213d2f6e5b6417b8f9b054c3f71b3b104f09499c0; // Replace with the actual keyHash
        fee = 0.1 * 10 ** 18; // Replace with the actual fee amount
    }

    modifier whenOpen() {
        require(lotteryOpen, "Lottery is not open");
        _;
    }

    function openLottery() external onlyOwner {
        require(!lotteryOpen, "Lottery is already open");
        lotteryOpen = true;
        emit LotteryOpened(entryFee);
    }

    function enterLottery() external payable whenOpen {
        require(msg.value == entryFee, "Incorrect entry fee");
        require(!players[msg.sender], "Already entered the lottery");

        players[msg.sender] = true;
        playerAddresses.push(msg.sender);
        totalPot += msg.value;
        emit PlayerEntered(msg.sender, msg.value);
    }

    function exitLottery() external whenOpen {
        require(players[msg.sender], "Not a participant");
        
        uint256 refundAmount = entryFee;
        players[msg.sender] = false;
        
        // Remove the player from the array
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            if (playerAddresses[i] == msg.sender) {
                playerAddresses[i] = playerAddresses[playerAddresses.length - 1];
                playerAddresses.pop();
                break;
            }
        }
        
        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Transfer failed");
        totalPot -= refundAmount;

        emit PlayerExited(msg.sender, refundAmount);
    }

    function closeLottery() external onlyOwner whenOpen nonReentrant {
        require(playerAddresses.length > 0, "No players entered");
        requestRandomness(keyHash, fee);
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        randomResult = randomness;
        uint256 winnerIndex = randomResult % playerAddresses.length;
        address winner = playerAddresses[winnerIndex];

        (bool success, ) = winner.call{value: totalPot}("");
        require(success, "Transfer failed");

        emit LotteryClosed(winner, totalPot);

        resetLottery();
    }

    function resetLottery() internal {
        totalPot = 0;
        delete playerAddresses;
        for (address playerAddress in players) {
            players[playerAddress] = false;
        }
        lotteryOpen = false;
        emit LotteryReset();
    }
}