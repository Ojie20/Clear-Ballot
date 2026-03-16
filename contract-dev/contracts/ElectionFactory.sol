// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Election.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  ElectionFactory
 * @notice Deploys and tracks Election contracts.
 *         The factory owner can create new elections; each deployed Election
 *         is immediately transferred to the caller so they can manage it directly.
 *
 * Workflow:
 *   1. Deploy ElectionFactory once.
 *   2. Call createElection(_name) to spin up a new Election contract.
 *   3. Manage the returned Election address via the Admin Interface.
 *   4. Call allElections() to list every election ever created.
 */
contract ElectionFactory is Ownable {

    // ── State ─────────────────────────────────────────────────────────────────

    address[] private _elections;

    // ── Events ────────────────────────────────────────────────────────────────

    event ElectionCreated(
        address indexed electionAddress,
        string          name,
        address indexed creator,
        uint256         index
    );

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Factory function ──────────────────────────────────────────────────────

    /**
     * @notice Deploy a new Election contract and register it in the factory.
     * @dev    Ownership of the new Election is transferred to msg.sender
     *         immediately so the caller (not the factory) controls it.
     * @param  _name  Human-readable election name.
     * @return addr   Address of the newly deployed Election contract.
     */
    function createElection(string memory _name)
        external
        onlyOwner
        returns (address addr)
    {
        require(bytes(_name).length > 0, "Election name required");

        Election e = new Election(_name);

        // Transfer ownership to the caller — without this the factory
        // owns the election and no one can manage it externally.
        e.transferOwnership(msg.sender);

        _elections.push(address(e));

        emit ElectionCreated(
            address(e),
            _name,
            msg.sender,
            _elections.length - 1
        );

        return address(e);
    }

    // ── View functions ────────────────────────────────────────────────────────

    /**
     * @notice Returns every election address ever created by this factory.
     */
    function allElections() external view returns (address[] memory) {
        return _elections;
    }

    /**
     * @notice Returns the total number of elections created.
     *         Useful for the frontend to paginate without fetching the full array.
     */
    function getElectionCount() external view returns (uint256) {
        return _elections.length;
    }

    /**
     * @notice Returns the address of a specific election by index.
     * @param  index  Zero-based index into the elections array.
     */
    function getElection(uint256 index) external view returns (address) {
        require(index < _elections.length, "Index out of bounds");
        return _elections[index];
    }
}
