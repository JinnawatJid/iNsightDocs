# Credit Scorecard V1 - Business Rules Dictionary

**Version:** 1.0
**Effective Date:** 2024-05-22
**Source Config:** `backend/config/credit_scorecard_v1.json`

This document outlines the specific business rules, weights, and scoring criteria currently active in the system.

## Summary of Components

| Component | Label | Weight (Total) |
| :--- | :--- | :--- |
| **C1** | Company Strength | ~49% |
| **C2** | Financial Status | ~55% (Normalized) |
| **C3** | Purchase Behavior | ~96% (Normalized) |

*(Note: Weights are internal multipliers. Final score is sum of weighted scores.)*

---

## C1: Company Strength

### 1. Years in Business
**Weight:** 14.42

| Criteria | Score | Label |
| :--- | :--- | :--- |
| > 10 Years | 2.0 | Established |
| 5 - 10 Years | 1.5 | Stable |
| 3 - 5 Years | 1.0 | Growing |
| 1 - 3 Years | 0.5 | New |
| < 1 Year | 0.25 | Entry |

### 2. Request / Registered Capital (Leverage)
**Weight:** 8.64

| Criteria (Request / Cap) | Score | Label |
| :--- | :--- | :--- |
| <= 0.5x | 2.0 | Low Leverage |
| 0.5x - 0.9x | 1.5 | Moderate |
| 0.9x - 1.5x | 1.0 | Standard |
| 1.5x - 1.99x | 0.5 | High Leverage |
| > 1.99x | 0.25 | Very High |

### 3. Asset Ownership
**Weight:** 25.94

| Criteria | Score | Label |
| :--- | :--- | :--- |
| Own (Self) | 2.0 | Owned (Self) |
| Parents / Relative | 1.5 | Owned (Family) |
| Rent / Other | 1.0 | Rented / Other |

---

## C2: Financial Status

### 1. D/E Ratio
**Weight:** 24.76

| Criteria | Score | Label |
| :--- | :--- | :--- |
| <= 1.0 | 2.0 | Excellent |
| 1.0 - 1.5 | 1.6 | Good |
| 1.5 - 2.0 | 1.2 | Fair |
| 2.0 - 3.0 | 1.0 | Weak |
| > 3.0 | 0.0 | Poor |

### 2. Inventory Turnover
**Weight:** 13.76

| Criteria | Score | Label |
| :--- | :--- | :--- |
| >= 12 | 2.0 | Excellent |
| 8 - 12 | 1.5 | Good |
| 6 - 8 | 1.0 | Fair |
| 4 - 6 | 0.5 | Weak |
| < 4 | 0.0 | Poor |

### 3. DSCR (Debt Service Coverage Ratio)
**Weight:** 16.50

| Criteria | Score | Label |
| :--- | :--- | :--- |
| >= 0.5 | 2.0 | Strong |
| 0.4 - 0.5 | 1.5 | Good |
| 0.33 - 0.4 | 1.0 | Fair |
| 0.25 - 0.33 | 0.5 | Weak |
| < 0.25 | 0.0 | Critical |

---

## C3: Purchase Behavior

### 1. Revenue / Registered Capital
**Weight:** 3.04

| Criteria | Score | Label |
| :--- | :--- | :--- |
| >= 1.5 | 2.0 | High |
| 1.0 - 1.5 | 1.5 | Good |
| 0.6 - 1.0 | 1.0 | Fair |
| 0.26 - 0.6 | 0.5 | Low |
| < 0.26 | 0.25 | Minimal |

### 2. Capacity Check (Avg Purchase / Credit Request)
**Weight:** 35.04

| Criteria | Score | Label |
| :--- | :--- | :--- |
| >= 1.5 | 2.0 | Excellent |
| 0.99 - 1.49 | 1.5 | High |
| 0.59 - 0.99 | 1.0 | Standard |
| 0.25 - 0.59 | 0.5 | Low |
| <= 0.25 | 0.25 | Too Low |
| > 1.5 | 0.25 | Over Limit (Edge Case) |

### 3. Turnover Speed (Purchase / Term)
**Weight:** 18.28

| Criteria | Score | Label |
| :--- | :--- | :--- |
| > 1.5 | 2.0 | Very Fast |
| 0.9 - 1.5 | 1.5 | Fast |
| 0.5 - 0.9 | 1.0 | Standard |
| <= 0.5 | 0.5 | Slow |

### 4. Purchase Trend (Slope)
**Weight:** 28.96

| Criteria | Score | Label |
| :--- | :--- | :--- |
| > 16,000 | 2.0 | Rapid Growth |
| 205 - 16,000 | 1.5 | Growth |
| -0.01 - 205 | 1.0 | Stable |
| -4,654 - 0 | 0.5 | Decline |
| < -4,654 | 0.25 | Sharp Decline |

### 5. Customer Duration
**Weight:** 10.66

| Criteria | Score | Label |
| :--- | :--- | :--- |
| > 7 Years | 2.0 | Loyal |
| 4 - 7 Years | 1.5 | Established |
| 2 - 4 Years | 1.0 | Stable |
| 1 - 2 Years | 0.5 | Recent |
| < 1 Year | 0.25 | New |
