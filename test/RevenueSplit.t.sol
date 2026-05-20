// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/RevenueSplit.sol";

contract RevenueSplitTest is Test {
    RevenueSplit public revenueSplit;
    
    address creator = address(0x1);
    address auditor = address(0x2);
    address referrer = address(0x3);
    
    function setUp() public {
        revenueSplit = new RevenueSplit();
    }
    
    function testDepositSplitsCorrectly() public {
        vm.deal(address(this), 100 ether);
        revenueSplit.deposit{value: 1 ether}(creator, auditor, referrer);
        
        assertEq(revenueSplit.creatorShares(creator), 0.7 ether);
        assertEq(revenueSplit.referrerShares(referrer), 0.1 ether);
        assertEq(revenueSplit.auditorShares(auditor), 0.05 ether);
    }
    
    function testWithdrawByCreator() public {
        vm.deal(address(this), 100 ether);
        revenueSplit.deposit{value: 1 ether}(creator, auditor, referrer);
        
        // Warp time to pass cooldown
        vm.warp(block.timestamp + 2 hours);
        
        uint256 balBefore = creator.balance;
        vm.prank(creator);
        revenueSplit.withdraw();
        uint256 balAfter = creator.balance;
        
        assertEq(balAfter - balBefore, 0.7 ether);
    }
    
    function testWithdrawByAuditor() public {
        vm.deal(address(this), 100 ether);
        revenueSplit.deposit{value: 1 ether}(creator, auditor, referrer);
        
        vm.warp(block.timestamp + 2 hours);
        
        uint256 balBefore = auditor.balance;
        vm.prank(auditor);
        revenueSplit.withdraw();
        
        assertEq(auditor.balance - balBefore, 0.05 ether);
    }
    
    function testReentrancyProtection() public {
        vm.deal(address(this), 200 ether);
        revenueSplit.deposit{value: 100 ether}(creator, auditor, referrer);
        revenueSplit.deposit{value: 100 ether}(creator, auditor, referrer);
        
        vm.warp(block.timestamp + 2 hours);
        
        vm.prank(creator);
        revenueSplit.withdraw();
        
        // Second withdraw should be zero
        vm.prank(creator);
        revenueSplit.withdraw();
    }
    
    function testEmergencyWithdraw() public {
        vm.deal(address(this), 100 ether);
        revenueSplit.deposit{value: 10 ether}(creator, auditor, referrer);
        
        uint256 balBefore = address(this).balance;
        revenueSplit.emergencyWithdraw(address(this));
        
        assertEq(address(this).balance - balBefore, 10 ether);
    }
}
