// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/ReputationBadges.sol";

contract ReputationBadgesTest is Test {
    ReputationBadges public badges;
    
    address user = address(0x1);
    address issuer = address(0x2);
    
    function setUp() public {
        badges = new ReputationBadges();
        // Transfer ownership to issuer
        badges.transferOwnership(issuer);
    }
    
    function testIssueBadge() public {
        vm.prank(issuer);
        badges.issueBadge(
            user,
            ReputationBadges.BadgeType.SKILLSHARP_100,
            "100+ successful deliveries"
        );
        
        assertEq(badges.balanceOf(user), 1);
    }
    
    function testTransferReverts() public {
        vm.prank(issuer);
        uint256 tokenId = 0;
        badges.issueBadge(user, ReputationBadges.BadgeType.EARLY_ADOPTER, "Early user");
        tokenId = 0; // First token
        
        vm.prank(user);
        vm.expectRevert("Badges are non-transferable");
        badges.transferFrom(user, address(0x3), tokenId);
    }
    
    function testOnlyIssuerCanIssue() public {
        // User cannot issue badges
        vm.prank(user);
        vm.expectRevert("AccessControl: account ");
        badges.issueBadge(user, ReputationBadges.BadgeType.CODE_REVIEWER, "Test");
    }
    
    function testGetBadgeInfo() public {
        vm.prank(issuer);
        badges.issueBadge(user, ReputationBadges.BadgeType.VERIFIED_DEVELOPER, "Certified dev");
        
        ReputationBadges.BadgeInfo memory info = badges.getBadgeInfo(0);
        assertEq(uint256(info.badgeType), uint256(ReputationBadges.BadgeType.VERIFIED_DEVELOPER));
        assertEq(info.issuedAt > 0, true);
    }
    
    function testGetUserBadgeCount() public {
        vm.prank(issuer);
        badges.issueBadge(user, ReputationBadges.BadgeType.SKILLSHARP_100, "100+");
        
        vm.prank(issuer);
        badges.issueBadge(user, ReputationBadges.BadgeType.SKILLSHARP_100, "100++");
        
        assertEq(badges.getUserBadgeCount(user, ReputationBadges.BadgeType.SKILLSHARP_100), 2);
    }
    
    function testSetIssuer() public {
        vm.prank(issuer);
        badges.setIssuer(address(0x5));
        
        assertEq(badges.issuer(), address(0x5));
    }
}
