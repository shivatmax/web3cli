// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/// @title Decentralized Lottery System
/// @notice This contract enables a decentralized lottery system where participants can enter, and a random winner is selected.
contract Lottery is Ownable {
    using SafeMath for uint256;
    using Address for address payable;

    // Structure to represent a participant
    struct Participant {
        address payable wallet;
        uint256 entryTime;
    }

    // Store participants
    Participant[] private participants;
    
    // The lottery prize amount
    uint256 public lotteryPool;

    // Event emitted when a participant enters the lottery
    event LotteryEntered(address indexed participant, uint256 amount);
    // Event emitted when a winner is selected
    event WinnerSelected(address indexed winner, uint256 amountWon);

    /// @notice Allows users to enter the lottery by sending Ether
    /// @dev The amount sent must be greater than zero
    function enter() external payable {
        require(msg.value > 0, "Entry amount must be greater than zero");

        participants.push(Participant(payable(msg.sender), block.timestamp));
        lotteryPool = lotteryPool.add(msg.value);

        emit LotteryEntered(msg.sender, msg.value);
    }

    /// @notice Select a random winner and transfer the entire lottery pool to them
    /// @dev Only callable by the contract owner
    function selectWinner() external onlyOwner {
        require(participants.length > 0, "No participants in the lottery");

        uint256 winnerIndex = random() % participants.length;
        address payable winner = participants[winnerIndex].wallet;

        uint256 prizeAmount = lotteryPool;
        lotteryPool = 0; // Reset the lottery pool

        // Transfer the prize amount to the winner
        winner.sendValue(prizeAmount);

        emit WinnerSelected(winner, prizeAmount);

        // Reset participants for the next round
        delete participants;
    }

    /// @notice Helper function to generate pseudo-random number
    /// @return A pseudo-random number
    function random() internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.difficulty, block.timestamp, participants)));
    }

    /// @notice Get the number of participants in the lottery
    /// @return The number of participants
    function getParticipantsCount() external view returns (uint256) {
        return participants.length;
    }

    /// @notice Withdraw any leftover funds from the contract to the owner
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner()).sendValue(balance);
    }
}