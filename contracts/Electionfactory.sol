// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "contracts/Election.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ElectionFactory is Ownable{
    address[] public elections;
    event ElectionCreated(address indexed election, address indexed creator);

    constructor() Ownable(msg.sender){
        
    }
    function createElection(address _admin) external onlyOwner returns (address){
        Election e =new Election(_admin);
        elections.push(address(e));
        emit ElectionCreated(address(e), _admin);
        return address(e);
    }

    function allElections() view public returns (address[] memory) {
        return elections;
    }
}
