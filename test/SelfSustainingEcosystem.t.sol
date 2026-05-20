// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/SelfSustainingEcosystem.sol";

contract SelfSustainingEcosystemTest is Test {
    SelfSustainingEcosystem public ecosystem;
    
    address user1 = address(0x1);
    address user2 = address(0x2);
    
    function setUp() public {
        ecosystem = new SelfSustainingEcosystem();
    }
    
    function testRegisterRole() public {
        vm.prank(user1);
        ecosystem.registerRole(SelfSustainingEcosystem.Role.CREATOR);
        
        SelfSustainingEcosystem.RoleInfo[] memory roles = ecosystem.getUserRoles(user1);
        assertEq(roles.length, 1);
        assertEq(uint256(roles[0].role), uint256(SelfSustainingEcosystem.Role.CREATOR));
        assertEq(uint256(roles[0].tier), uint256(SelfSustainingEcosystem.RoleTier.BRONZE));
    }
    
    function testCannotRegisterSameRole() public {
        vm.prank(user1);
        ecosystem.registerRole(SelfSustainingEcosystem.Role.CREATOR);
        
        vm.prank(user1);
        vm.expectRevert("Role already registered");
        ecosystem.registerRole(SelfSustainingEcosystem.Role.CREATOR);
    }
    
    function testRecordContribution() public {
        vm.prank(user1);
        ecosystem.registerRole(SelfSustainingEcosystem.Role.CREATOR);
        
        vm.prank(user1);
        ecosystem.recordContribution(SelfSustainingEcosystem.Role.CREATOR, 5);
        
        SelfSustainingEcosystem.RoleInfo memory info = ecosystem.getRoleInfo(user1, SelfSustainingEcosystem.Role.CREATOR);
        assertEq(info.contributions, 5);
    }
    
    function testUpgradeTierOnContributions() public {
        vm.prank(user1);
        ecosystem.registerRole(SelfSustainingEcosystem.Role.CREATOR);
        
        // Add contributions to trigger SILVER upgrade (10 min)
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(user1);
            ecosystem.recordContribution(SelfSustainingEcosystem.Role.CREATOR, 3);
        }
        
        // Should auto-upgrade to SILVER after 15 contributions
        vm.prank(user1);
        ecosystem.recordContribution(SelfSustainingEcosystem.Role.CREATOR, 2);
        
        SelfSustainingEcosystem.RoleInfo memory info = ecosystem.getRoleInfo(user1, SelfSustainingEcosystem.Role.CREATOR);
        assertEq(uint256(info.tier), uint256(SelfSustainingEcosystem.RoleTier.SILVER));
    }
    
    function testCalculateRewards() public {
        vm.prank(user1);
        ecosystem.registerRole(SelfSustainingEcosystem.Role.CREATOR);
        
        vm.prank(user1);
        ecosystem.recordContribution(SelfSustainingEcosystem.Role.CREATOR, 10);
        
        uint256 rewards = ecosystem.calculateRewards(user1, SelfSustainingEcosystem.Role.CREATOR);
        assertGt(rewards, 0);
    }
    
    function testClaimRewards() public {
        vm.deal(address(this), 100 ether);
        
        ecosystem.addRewards{value: 1 ether}(user1, SelfSustainingEcosystem.Role.CREATOR, 1 ether);
        
        uint256 balBefore = user1.balance;
        vm.prank(user1);
        ecosystem.claimRewards();
        
        assertEq(user1.balance - balBefore, 1 ether);
    }
    
    function testGenerateHealthReport() public {
        vm.prank(user1);
        ecosystem.registerRole(SelfSustainingEcosystem.Role.CREATOR);
        
        SelfSustainingEcosystem.HealthReport memory report = ecosystem.generateHealthReport();
        assertEq(report.totalContributions > 0, true); // At least the registration contribution
    }
}
