# Coding Conventions

**Analysis Date:** 2026-05-06

## Language & Framework

**Primary Language:** Solidity ^0.8.20 (contracts)
**Secondary Language:** JavaScript/JSX (frontend scripts)
**Package Manager:** npm

**Frameworks:**
- Hardhat ^2.19.4 - Smart contract development and deployment
- Vite ^5.1.0 - Frontend build tool
- React ^18.2.0 - Frontend UI library

---

## Naming Conventions

### Solidity Files (contracts/*.sol)
- PascalCase for contract names: `ASKToken.sol`, `SkillRegistry.sol`
- camelCase for function names: `addContribution()`, `slashSkill()`
- SCREAMING_SNAKE_CASE for constants: `MIN_STAKE_LOW`, `MAX_SUPPLY`
- PascalCase for structs/enums: `Contribution`, `ContributionType`

### JavaScript Files (scripts/*.js, src/**/*.jsx)
- camelCase for filenames: `airdrop.js`, `auto-tasks.js`
- camelCase for functions and variables
- PascalCase for React components: `SkillBrowser.jsx`, `ProtocolDemo.jsx`
- camelCase for React hooks and services: `WalletService.js`

### General Patterns
- Descriptive, self-documenting names preferred
- Chinese comments inline for business logic rationale
- Constitution references in comments (e.g., "// 宪法第三条：声誉优先排序")

---

## Code Style

### Solidity Style
- Solidity ^0.8.20 with OpenZeppelin contracts
- 2-space indentation
- NatSpec comments with SPDX license header
- Events for all state changes
- `external` visibility for public-facing functions
- `pure` for view-only pure functions
- `immutable` for contract references set once
- Structs defined above contracts when shared

### JavaScript Style
- Standard ES6+ syntax
- No semicolons (ASI style)
- Template literals for string interpolation
- Arrow functions for callbacks
- `const`/`let` only, no `var`
- Object spread operator for immutability

### Formatting Tool
- **No configured formatter** - Manual formatting used
- Consider adding Prettier for consistency

### Linting Tool
- **No configured linter** - Manual code review
- Consider adding ESLint for JavaScript

---

## Import Organization

### Solidity Imports
```solidity
// External library (OpenZeppelin)
import "@openzeppelin/contracts/access/Ownable.sol";

// Local contracts in same directory
import "./ASKToken.sol";
```

### JavaScript Imports
```javascript
// Node built-ins
const fs = require('fs');
const path = require('path');

// External packages
const hardhat = require('hardhat');

// Local modules (relative)
const WalletService = require('./services/WalletService')
```

---

## Error Handling

### Solidity
- Require statements for validation: `require(!hasLiked[msg.sender], "Already liked")`
- Custom error strings, not error codes
- Events emitted for all state changes (including slashes)
- `onlyOwner` modifier pattern from OpenZeppelin

### JavaScript
- try-catch blocks for async operations
- `console.error()` for error logging
- `process.exit(1)` for fatal script failures
- Descriptive error messages: `console.error('Automatic task failed:', err)`

### Frontend React
- Conditional rendering for null checks
- Simple `alert()` for user feedback
- `disabled` state on buttons for preventing double-submit

---

## Function Design

### Solidity
- Small, focused functions (<50 lines typical)
- Single responsibility per function
- Events emitted after state changes
- NatSpec documentation for public functions

### JavaScript (Scripts)
- Configuration objects at top of file
- `CONFIG` object for settings: paths, check files, thresholds
- `main()` function as entry point
- Helper functions above `main()`
- Color-coded logging with type prefixes (INFO, SUCCESS, WARN, ERROR)

### React Components
- Single component per file
- Props destructured in function signature
- `useState` for local state
- `useEffect` for side effects (data loading)
- Inline style objects for component styling

---

## Access Control

### Solidity Pattern
```solidity
contract Example is Ownable {
    constructor() Ownable() {}
    
    function sensitiveOperation() external onlyOwner {
        // ...
    }
}
```

### JavaScript Pattern
- Owner-only operations via Hardhat `connect()` signer
- Environment variables for private keys
- No hardcoded credentials

---

## Comments

### Chinese Comments (Business Context)
Used extensively for Constitution alignment:
```solidity
// 宪法第三条：全链条追溯
mapping(uint256 => string[]) public skillAuditTrail;

// 宪法第二条：低摩擦参与
function init() external {
    // Embedded wallet - no user awareness
}
```

### Solidity NatSpec
```solidity
/// @notice Adds a contribution to a skill
/// @param _skillId The skill to contribute to
/// @param _contributor The contributor address
/// @param _share The share percentage (basis points)
function addContribution(...) external onlyOwner { }
```

---

## Constants

### Solidity
- `uint256 public constant` for all magic numbers
- Named by purpose, not value: `MIN_STAKE_LOW = 10 ether`
- Basis points for percentages: `10000 = 100%`

### JavaScript
- `CONFIG` object for runtime constants
- Inline magic numbers acceptable in simple scripts
- Clear naming for thresholds and limits

---

## Security Patterns

### Solidity
- OpenZeppelin imports for battle-tested contracts
- `ReentrancyGuard` consideration for token transfers
- Input validation on all external inputs
- Overflow protection via Solidity 0.8.x
- Events for auditable state changes

### Environment Variables
- All secrets via `process.env`
- Never hardcode private keys, API keys, RPC URLs
- `.env.example` for documentation

---

## Module Design

### Solidity Contracts
- Single contract per file
- Clear public API surface
- Mappings named with plural or descriptive plural: `userStakeIds`, `stakes`
- Enums for finite options: `ContributionType`, `RiskLevel`

### React Components
- One component per file
- Export as default: `export default function ComponentName()`
- Props interface via destructuring
- Co-located styles via inline style objects

### JavaScript Scripts
- Single responsibility per script
- `main()` function pattern
- Clear console output for progress tracking
- Error handling with try-catch

---

*Convention analysis: 2026-05-06*
