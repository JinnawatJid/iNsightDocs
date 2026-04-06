# Multi-Project Credit Architecture

## Overview
The Smart Credit Application supports submitting a single credit request that encompasses multiple distinct projects ("เครดิตโครงการ"). This functionality allows users to bundle several projects under one request to streamline the approval process and view an aggregated analysis of the customer's financial exposure.

## State Management (`Pinia Store`)
The core state for multi-project requests is maintained in `src/stores/creditRequest.js`.
Instead of storing project data at the root of `transactionData`, project-specific data is encapsulated within an array:

```javascript
transactionData: {
  // ... other global request data
  projects: [
    {
      projectId: "PRJ-2023-001",
      projectData: { /* Data from Sales System */ },
      adjustedProjectValue: "15,000,000",
      projectCost: "11,250,000",
      projectProfit: "3,750,000",
      projectProfitPercent: "25",
      projectPhasing: [ ... ], // Delivery schedules
      addressData: { /* Project specific location */ },
      contractorType: "Sub-Contractor",
      // ...
    }
  ]
}
```

### File Uploads
Files specific to a single project must be uniquely identified to prevent collisions. This is achieved by appending the `projectId` to the file key in the store and the database (e.g., `project_contract_doc_PRJ-2023-001`).

## UI Architecture
To prevent UI clutter and ensure a smooth user experience, the project credit workspace employs a dynamic tab and card system.

### `CreditRequestForm.vue`
When `isProjectCredit` is true, the form dynamically renders a loop over `store.transactionData.projects`. Each project is rendered as a distinct `unified-card` that can be collapsed or expanded.

### `ProjectApplicationTabs.vue`
Each project card utilizes the `ProjectApplicationTabs.vue` component, which provides a horizontal tab navigation specifically scoped to that project's index. The tabs include:
1. **ข้อมูลโครงการ (Project Info):** Core details, adjusted values, interlocking financial metrics (Cost, Profit, Margin).
2. **ที่อยู่โครงการ (Project Address):** Physical location and map coordinates.
3. **รอบส่งสินค้า (Project Phasing):** Delivery timelines and billing schedules.

### `AddProjectTab.vue`
Located at the bottom of the project list, this component provides an interface to query the external Sales System (mocked locally) via Project ID or Name. Upon selection, a new project object is initialized and pushed into the `transactionData.projects` array, instantly rendering a new project card.

## Global Analytics & Charting
A key advantage of the multi-project architecture is the ability to aggregate data.

### `GlobalPhasingAnalysis.vue`
When one or more projects are added, the `GlobalPhasingAnalysis.vue` component is rendered. It utilizes `Chart.js` to provide:
- **Consolidated Cash Flow:** An aggregated view combining the phasing data (Expected Revenue vs. Expected Costs) across all active projects.
- **Planned vs Actual Tracking:** An industry-standard Running Balance Line Chart comparing the "Planned" cumulative debt (dashed line) against an "Actual" mock cumulative debt (solid line). The actual data simulates real-world delays (e.g., late drawdowns and payments) to provide approvers with a realistic risk profile. Both charts share a synchronized Y-Axis scale to ensure accurate visual comparison.
- **Peak Exposure Calculation:** It calculates the "Total Peak Exposure" (ยอดหนี้สะสมรวมสูงสุด) by combining project-specific debt with current trade debt over the timeline, providing approvers with a clear visualization of maximum risk.
