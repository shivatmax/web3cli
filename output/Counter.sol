// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Simple Counter Contract
/// @notice This contract provides a counter that can be incremented and decremented by authorized users
/// @dev Only the owner can modify the counter
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleCounter is Ownable {
    uint256 private counter;

    /// @dev Emitted when the counter is incremented
    /// @param newCounter The new value of the counter
    event CounterIncremented(uint256 newCounter);

    /// @dev Emitted when the counter is decremented
    /// @param newCounter The new value of the counter
    event CounterDecremented(uint256 newCounter);

    /// @notice Increment the counter by 1
    /// @dev Only the owner can increment the counter
    function increment() external onlyOwner {
        counter += 1;
        emit CounterIncremented(counter);
    }

    /// @notice Decrement the counter by 1
    /// @dev Only the owner can decrement the counter
    function decrement() external onlyOwner {
        require(counter > 0, "Counter cannot be negative");
        counter -= 1;
        emit CounterDecremented(counter);
    }

    /// @notice Get the current value of the counter
    /// @return The current count
    function getCounter() external view returns (uint256) {
        return counter;
    }
}