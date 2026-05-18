# AgentSkills UI Design Specification

**Phase:** 17 - Frontend UI Design
**Version:** 1.0.0
**Created:** 2026-05-17
**Status:** Draft

---

## Table of Contents

1. [Brand Identity](#1-brand-identity)
2. [Design Tokens](#2-design-tokens)
3. [Typography System](#3-typography-system)
4. [Component Library](#4-component-library)
5. [Web3-Specific UI](#5-web3-specific-ui)
6. [Skill Marketplace UI](#6-skill-marketplace-ui)
7. [Layout System](#7-layout-system)
8. [Accessibility](#8-accessibility)

---

## 1. Brand Identity

### Brand Values (from CONSTITUTION.md)

The design must reflect:
- **Trustworthiness**: Transparent, traceable operations
- **Low Friction**: Maximum 3 clicks for any operation
- **Reputation-First**: Quality signals prominent in UI

### Color Palette

```
Primary:     #2563eb (Trust blue - blockchain, secure)
Secondary:    #1e293b (Slate dark - professional, readable)
Accent:      #7c3aed (Purple - Web3, innovative)
Success:     #16a34a (Green - verification, approval)
Warning:     #eab308 (Amber - caution, medium risk)
Danger:      #ef4444 (Red - critical, slash)
Neutral:     #64748b (Slate - secondary text)
Background:  #f8fafc (Slate 50 - light mode base)
Surface:     #ffffff (Pure white - cards, modals)
Border:      #e5e7eb (Slate 200 - subtle borders)
```

### Risk Level Colors

| Level | Background | Text | Border | Usage |
|-------|------------|------|--------|-------|
| LOW | #dcfce7 | #16a34a | #86efac | Safe skills |
| MEDIUM | #fef9c3 | #ca8a04 | #fde047 | Moderate risk |
| HIGH | #ffedd5 | #ea580c | #fdba74 | Elevated risk |
| CRITICAL | #fee2e2 | #dc2626 | #fca5a5 | Extreme risk |

### Reputation Tier Colors

| Tier | Level | Color | Background | Badge Icon |
|------|-------|-------|------------|------------|
| L1 | Observer | #64748b | #f1f5f9 | [O] |
| L2 | Contributor | #16a34a | #dcfce7 | [C] |
| L3 | Trusted | #2563eb | #dbeafe | [T] |
| L4 | Guardian | #7c3aed | #f3e8ff | [G] |
| L5 | Elder | #f59e0b | #fef3c7 | [E] |

---

## 2. Design Tokens

### CSS Variables (Direct Copy)

```css
:root {
  /* === Brand Colors === */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: #dbeafe;
  
  --color-secondary: #1e293b;
  --color-secondary-hover: #334155;
  
  --color-accent: #7c3aed;
  --color-accent-hover: #6d28d9;
  --color-accent-light: #f3e8ff;
  
  /* === Semantic Colors === */
  --color-success: #16a34a;
  --color-success-light: #dcfce7;
  --color-warning: #eab308;
  --color-warning-light: #fef9c3;
  --color-danger: #ef4444;
  --color-danger-light: #fee2e2;
  --color-info: #0ea5e9;
  --color-info-light: #e0f2fe;
  
  /* === Risk Level Colors === */
  --risk-low-bg: #dcfce7;
  --risk-low-text: #16a34a;
  --risk-low-border: #86efac;
  
  --risk-medium-bg: #fef9c3;
  --risk-medium-text: #ca8a04;
  --risk-medium-border: #fde047;
  
  --risk-high-bg: #ffedd5;
  --risk-high-text: #ea580c;
  --risk-high-border: #fdba74;
  
  --risk-critical-bg: #fee2e2;
  --risk-critical-text: #dc2626;
  --risk-critical-border: #fca5a5;
  
  /* === Neutral Colors === */
  --color-text-primary: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-tertiary: #94a3b8;
  --color-text-inverse: #ffffff;
  
  --color-bg-primary: #f8fafc;
  --color-bg-secondary: #f1f5f9;
  --color-bg-surface: #ffffff;
  
  --color-border: #e5e7eb;
  --color-border-light: #f1f5f9;
  
  /* === Spacing Scale (8pt) === */
  --space-0: 0px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  
  /* === Border Radius === */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  
  /* === Shadow System === */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
  
  /* === Typography === */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  
  /* === Transitions === */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}
```

---

## 3. Typography System

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-xs` | 12px | 400 | 1.5 | Captions, timestamps |
| `text-sm` | 14px | 400 | 1.5 | Secondary text, metadata |
| `text-base` | 16px | 400 | 1.5 | Body text |
| `text-lg` | 18px | 500 | 1.4 | Subheadings |
| `text-xl` | 20px | 600 | 1.3 | Section titles |
| `text-2xl` | 24px | 600 | 1.2 | Page titles |
| `text-3xl` | 30px | 700 | 1.2 | Hero headings |
| `text-4xl` | 36px | 700 | 1.1 | Display text |

### Font Weights

| Name | Value | Usage |
|------|-------|-------|
| Regular | 400 | Body text, descriptions |
| Medium | 500 | Labels, secondary headings |
| Semibold | 600 | Primary headings, emphasis |
| Bold | 700 | Display titles, stats |

---

## 4. Component Library

### 4.1 Buttons

#### Primary Button

```jsx
// Primary - Main actions
{
  background: '#2563eb',
  color: '#fff',
  padding: '12px 24px',
  borderRadius: '8px',
  fontWeight: '500',
  fontSize: '14px',
  border: 'none',
  cursor: 'pointer'
}

// States:
// Hover: background '#1d4ed8'
// Active: background '#1e40af', transform 'scale(0.98)'
// Disabled: background '#e5e7eb', color '#94a3b8', cursor 'not-allowed'
// Loading: background '#2563eb', opacity '0.8', spinner icon
```

#### Secondary Button

```jsx
// Secondary - Secondary actions
{
  background: '#fff',
  color: '#374151',
  padding: '12px 24px',
  borderRadius: '8px',
  fontWeight: '500',
  fontSize: '14px',
  border: '1px solid #d1d5db',
  cursor: 'pointer'
}

// States:
// Hover: background '#f9fafb', border-color '#9ca3af'
// Active: background '#f3f4f6'
// Disabled: opacity '0.5', cursor 'not-allowed'
```

#### Ghost Button

```jsx
// Ghost - Tertiary actions, navigation
{
  background: 'transparent',
  color: '#374151',
  padding: '8px 16px',
  borderRadius: '6px',
  fontWeight: '500',
  fontSize: '14px',
  border: 'none',
  cursor: 'pointer'
}

// States:
// Hover: background '#f3f4f6'
// Active: background '#e5e7eb'
```

#### Danger Button

```jsx
// Danger - Destructive actions (slash, reject)
{
  background: '#ef4444',
  color: '#fff',
  padding: '10px 20px',
  borderRadius: '8px',
  fontWeight: '500',
  fontSize: '14px',
  border: 'none',
  cursor: 'pointer'
}

// States:
// Hover: background '#dc2626'
// Active: background '#b91c1c'
```

### 4.2 Cards

#### Skill Card

```jsx
const skillCardStyle = {
  background: '#fff',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  transition: 'box-shadow 0.2s, border-color 0.2s'
}

// Layout:
// [Risk Badge] [Verified Badge] [Skill Name]
// [Description - 2 lines max]
// [Stats Row: Reputation | Likes | Creator]
// [Action: Like Button]
```

#### User Card (Profile)

```jsx
const userCardStyle = {
  background: '#fff',
  borderRadius: '12px',
  padding: '20px',
  border: '1px solid #e5e7eb',
  display: 'flex',
  alignItems: 'center',
  gap: '16px'
}

// Layout:
// [Avatar Circle] [Name + Level Badge] [Stats Grid]
// Avatar: 64px circle, initials, level-colored background
```

#### Leaderboard Row

```jsx
const leaderboardRowStyle = {
  display: 'grid',
  gridTemplateColumns: '60px 1fr 140px 100px 90px 80px 100px',
  gap: '12px',
  padding: '12px 16px',
  background: 'transparent',
  borderRadius: '8px',
  alignItems: 'center'
}

// Special rows:
// Top 3: background '#fef3c7', border '1px solid #fcd34d'
// Flagged: background '#fef2f2'
```

### 4.3 Inputs

#### Text Input

```jsx
const textInputStyle = {
  padding: '12px 16px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '16px',
  fontFamily: 'inherit',
  background: '#fff',
  transition: 'border-color 0.2s, box-shadow 0.2s'
}

// Focus: border-color '#2563eb', box-shadow '0 0 0 3px rgba(37,99,235,0.1)'
// Error: border-color '#ef4444', box-shadow '0 0 0 3px rgba(239,68,68,0.1)'
// Disabled: background '#f9fafb', color '#94a3b8'
```

#### Search Input

```jsx
const searchInputStyle = {
  ...textInputStyle,
  paddingLeft: '44px',  // Space for search icon
  backgroundImage: 'url(search-icon.svg)',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: '12px center'
}
```

#### Select Dropdown

```jsx
const selectStyle = {
  padding: '12px 40px 12px 16px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '14px',
  background: '#fff url(dropdown-arrow.svg) no-repeat right 12px center',
  appearance: 'none',
  cursor: 'pointer'
}
```

### 4.4 Badges

#### Risk Level Badge

```jsx
const riskBadgeStyle = {
  padding: '4px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
}

// Color mapping:
LOW: { background: '#dcfce7', color: '#16a34a' }
MEDIUM: { background: '#fef9c3', color: '#ca8a04' }
HIGH: { background: '#ffedd5', color: '#ea580c' }
CRITICAL: { background: '#fee2e2', color: '#dc2626' }
```

#### Reputation Tier Badge

```jsx
const tierBadgeStyle = {
  padding: '6px 14px',
  borderRadius: '9999px',  // Pill shape
  fontSize: '13px',
  fontWeight: '500'
}

// L1: { background: '#f1f5f9', color: '#64748b' }
// L2: { background: '#dcfce7', color: '#16a34a' }
// L3: { background: '#dbeafe', color: '#2563eb' }
// L4: { background: '#f3e8ff', color: '#7c3aed' }
// L5: { background: '#fef3c7', color: '#d97706' }
```

#### Verification Badge

```jsx
// Verified checkmark
{
  width: '20px',
  height: '20px',
  background: '#16a34a',
  color: '#fff',
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  fontWeight: 'bold'
}

// Icon: checkmark (✓)
```

### 4.5 Modals

#### Confirmation Modal

```jsx
const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  backdropFilter: 'blur(4px)'
}

const modalContentStyle = {
  background: '#fff',
  borderRadius: '16px',
  padding: '24px',
  maxWidth: '480px',
  width: '90%',
  boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)'
}

// Structure:
// [Title]
// [Description]
// [Action Buttons: Cancel | Confirm]
```

#### Transaction Modal

```jsx
// Transaction states:
// Pending: spinner, "Waiting for confirmation...", gray
// Confirming: spinner, "Transaction submitted...", blue
// Success: checkmark, "Transaction confirmed!", green
// Failed: X icon, "Transaction failed", red

const txModalStyle = {
  ...modalContentStyle,
  textAlign: 'center',
  padding: '32px'
}
```

---

## 5. Web3-Specific UI

### 5.1 Wallet Connection States

```jsx
// Disconnected State
{
  icon: '[wallet]',
  text: 'Connect Wallet',
  style: 'primary',
  action: 'Open wallet modal'
}

// Connecting State
{
  icon: 'spinner',
  text: 'Connecting...',
  style: 'ghost',
  disabled: true
}

// Connected State
{
  avatar: shortenedAddress.slice(0,2),
  text: '0x1234...5678',
  style: 'secondary',
  dropdown: true
}

// Network Badge
{
  network: 'Polygon Amoy',
  color: '#8247e5',  // Polygon purple
  indicator: 'connected' | 'wrong-network' | 'disconnected'
}
```

### 5.2 Transaction States

```jsx
const transactionStates = {
  idle: { icon: null, text: '', color: '' },
  pending: { 
    icon: 'spinner',
    text: 'Waiting for signature...',
    color: '#64748b',
    animation: 'pulse'
  },
  confirming: {
    icon: 'spinner',
    text: 'Confirming transaction...',
    color: '#2563eb',
    animation: 'spin'
  },
  confirmed: {
    icon: 'checkmark',
    text: 'Transaction confirmed',
    color: '#16a34a',
    animation: 'pop'
  },
  failed: {
    icon: 'x',
    text: 'Transaction failed',
    color: '#ef4444',
    animation: 'shake'
  }
}
```

### 5.3 Chain Indicator

```jsx
const chainIndicatorStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 12px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: '500'
}

// Connected:
{
  background: '#dcfce7',
  color: '#16a34a'
}
// Dot: green pulse

// Wrong Network:
{
  background: '#fef3c7',
  color: '#ca8a04'
}
// Dot: yellow static

// Disconnected:
{
  background: '#f1f5f9',
  color: '#64748b'
}
// Dot: gray static
```

### 5.4 Gas Estimation Display

```jsx
const gasDisplayStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '12px',
  color: '#64748b',
  fontFamily: 'monospace'
}

// Format: "Gas: ~0.002 MATIC"
{
  icon: 'gas-pump',
  value: '~0.002',
  symbol: 'MATIC',
  usdEstimate: '~$0.001'
}
```

---

## 6. Skill Marketplace UI

### 6.1 Skill Card with Reputation

```jsx
// Complete skill card component structure
const SkillCard = ({ skill, onLike, user }) => {
  const riskColors = {
    'LOW': { bg: '#dcfce7', text: '#16a34a' },
    'MEDIUM': { bg: '#fef9c3', text: '#ca8a04' },
    'HIGH': { bg: '#ffedd5', text: '#ea580c' },
    'CRITICAL': { bg: '#fee2e2', text: '#dc2626' }
  }
  
  const getTierInfo = (rep) => {
    if (rep >= 5000) return { level: 5, name: 'Elder', color: '#d97706', bg: '#fef3c7' }
    if (rep >= 2000) return { level: 4, name: 'Guardian', color: '#7c3aed', bg: '#f3e8ff' }
    if (rep >= 500) return { level: 3, name: 'Trusted', color: '#2563eb', bg: '#dbeafe' }
    if (rep >= 100) return { level: 2, name: 'Contributor', color: '#16a34a', bg: '#dcfce7' }
    return { level: 1, name: 'Observer', color: '#64748b', bg: '#f1f5f9' }
  }

  return (
    <div className="skill-card">
      {/* Header: Risk + Verification */}
      <div className="skill-header">
        {skill.verified && <span className="verified-badge">✓</span>}
        <span className="risk-badge" style={riskColors[skill.riskLevel]}>
          {skill.riskLevel}
        </span>
      </div>
      
      {/* Name + Description */}
      <h3 className="skill-name">{skill.name}</h3>
      <p className="skill-description">{skill.description}</p>
      
      {/* Stats */}
      <div className="skill-stats">
        <span className="stat">Rep: {skill.reputation}</span>
        <span className="stat">Likes: {skill.likes}</span>
        <span className="stat-creator">{skill.creator}</span>
      </div>
      
      {/* Creator Tier Badge */}
      <div className="creator-tier" style={getTierInfo(skill.creatorRep).bg}>
        L{getTierInfo(skill.creatorRep).level} {getTierInfo(skill.creatorRep).name}
      </div>
      
      {/* Action */}
      <button 
        className="like-button"
        onClick={() => onLike(skill.id)}
        disabled={!user || user.dailyLikes >= 5}
      >
        {skill.flagged ? '[!] Flagged' : `[+] Like (${user?.dailyLikes || 0}/5)`}
      </button>
    </div>
  )
}
```

### 6.2 Like/Slash Button States

```jsx
const likeButtonStates = {
  default: {
    background: '#2563eb',
    color: '#fff',
    text: '[+] Like'
  },
  hover: {
    background: '#1d4ed8',
    transform: 'scale(1.02)'
  },
  disabled: {
    background: '#e5e7eb',
    color: '#94a3b8',
    cursor: 'not-allowed'
  },
  maxed: {
    background: '#e5e7eb',
    color: '#64748b',
    text: '[+] 5/5'
  },
  flagged: {
    background: '#fef2f2',
    color: '#ef4444',
    text: '[!] Flagged'
  }
}

const slashButtonStates = {
  default: {
    background: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    text: '[×] Slash'
  },
  hover: {
    background: '#fef2f2'
  }
}
```

### 6.3 Verification Checkmark

```jsx
const verifiedIcon = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  background: '#16a34a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold'
  // Icon: '✓'
}

// Tooltip on hover: "Verified by {count} verifiers"
```

---

## 7. Layout System

### 7.1 Grid System

```css
/* 12-column grid */
.container {
  max-width: '1200px',
  margin: '0 auto',
  padding: '0 20px'
}

.grid {
  display: 'grid',
  gap: '16px'  /* Default gap */
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr) }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr) }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr) }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr) }
.grid-cols-6 { grid-template-columns: repeat(6, 1fr) }
.grid-cols-12 { grid-template-columns: repeat(12, 1fr) }

/* Auto-fit for responsive */
.grid-auto { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) }
```

### 7.2 Responsive Breakpoints

```css
/* Mobile First */
@media (min-width: 640px)  { /* sm - Tablet */ }
@media (min-width: 768px)  { /* md - Tablet landscape */ }
@media (min-width: 1024px) { /* lg - Desktop */ }
@media (min-width: 1280px) { /* xl - Large desktop */ }
@media (min-width: 1536px) { /* 2xl - Extra large */ }

/* Common patterns */
.stack-mobile { flex-direction: column on mobile, row on desktop }
.hide-mobile { display: none on mobile, block on desktop }
.show-mobile { display: block on mobile, none on desktop }
```

### 7.3 Navigation

```jsx
const navigationStyle = {
  header: {
    padding: '16px 20px',
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  
  nav: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  
  navButton: {
    padding: '8px 16px',
    background: 'transparent',
    color: '#64748b',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  
  navButtonActive: {
    background: '#eff6ff',
    color: '#2563eb'
  }
}
```

---

## 8. Accessibility

### 8.1 Color Contrast

| Element | Foreground | Background | Ratio | WCAG |
|---------|------------|------------|-------|------|
| Primary text | #1e293b | #ffffff | 13.5:1 | AAA |
| Secondary text | #64748b | #ffffff | 4.6:1 | AA |
| Disabled text | #94a3b8 | #f1f5f9 | 2.1:1 | Fail |
| Risk badge (HIGH) | #ea580c | #ffedd5 | 4.5:1 | AA |
| Risk badge (CRITICAL) | #dc2626 | #fee2e2 | 4.6:1 | AA |

**Note**: Disabled states do not require contrast compliance.

### 8.2 Focus States

```css
/* Visible focus indicator - 2px blue outline */
button:focus-visible,
input:focus-visible,
select:focus-visible,
a:focus-visible {
  outline: '2px solid #2563eb',
  outlineOffset: '2px'
}

/* Keyboard navigation only */
:focus:not(:focus-visible) {
  outline: 'none'
}
```

### 8.3 ARIA Labels

```jsx
// Buttons
<button aria-label="Like skill email-sender">
  [+] Like
</button>

// Risk badges
<span aria-label="Risk level: LOW, safe skill">
  LOW
</span>

// Verification
<span aria-label="Verified by 2 verifiers">
  ✓
</span>

// Wallet
<button aria-label="Connect wallet, currently disconnected">
  Connect Wallet
</button>

// Navigation
<nav aria-label="Main navigation">
  <button aria-label="Skills browser, current page">
    Skills
  </button>
</nav>

// Modals
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
```

### 8.4 Screen Reader Support

```jsx
// Visually hidden but accessible
.sr-only {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0'
}

// Transaction status announcements
<div aria-live="polite" aria-atomic="true">
  {txStatus === 'confirmed' && 'Transaction confirmed successfully'}
</div>
```

### 8.5 Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move focus to next interactive element |
| Shift+Tab | Move focus to previous element |
| Enter/Space | Activate button or toggle |
| Escape | Close modal or dropdown |
| Arrow keys | Navigate within select/dropdown |

---

## Appendix: CSS Classes Reference

```css
/* Utility classes for direct use */
.text-primary { color: var(--color-text-primary) }
.text-secondary { color: var(--color-text-secondary) }
.text-success { color: var(--color-success) }
.text-danger { color: var(--color-danger) }

.bg-surface { background: var(--color-bg-surface) }
.bg-primary { background: var(--color-primary) }

.rounded-sm { border-radius: var(--radius-sm) }
.rounded-md { border-radius: var(--radius-md) }
.rounded-lg { border-radius: var(--radius-lg) }
.rounded-full { border-radius: var(--radius-full) }

.shadow-sm { box-shadow: var(--shadow-sm) }
.shadow-md { box-shadow: var(--shadow-md) }

.p-4 { padding: var(--space-4) }
.p-6 { padding: var(--space-6) }
.mb-4 { margin-bottom: var(--space-4) }
.mb-6 { margin-bottom: var(--space-6) }

.flex { display: flex }
.flex-col { flex-direction: column }
.items-center { align-items: center }
.justify-between { justify-content: space-between }
.gap-2 { gap: var(--space-2) }
.gap-4 { gap: var(--space-4) }

.grid { display: grid }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr) }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr) }
```

---

## Implementation Notes

1. **Current State**: The codebase uses inline styles. This spec provides the foundation for migrating to CSS modules or Tailwind.

2. **Migration Path**:
   - Phase 1: Create `src/styles/tokens.css` with all CSS variables
   - Phase 2: Create `src/styles/components.css` with component classes
   - Phase 3: Refactor pages to use classes instead of inline styles

3. **Constitutional Alignment**:
   - Low friction: Simple, consistent UI patterns
   - Reputation-first: Prominent tier badges and verification status
   - Traceable: Clear transaction states and chain indicators

---

**End of UI Design Specification**