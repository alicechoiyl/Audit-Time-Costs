# Audit Time-Cost Budgeting & Fee Approval Application
**Target Platform:** Google AI Studio (Build Mode / Gemini API)  
**Domain Standard:** Malaysian Institute of Accountants (MIA) Recommended Practice Guide 7 (RPG 7, Revised)  
**Department Roster:** 21 Audit Staff (1 Audit Partner, 1 Audit Manager, 4 Supervisors, 15 Audit PICs — *2 Admin excluded*)

---

## 1. Executive Summary & Core Objectives

This application replaces the manual `SS V4 & V5 - Audit Time Cost Guideline.xls` workbook with a role-based, state-driven web application. It eliminates broken `#REF!` formula errors, isolates audit fees from optional tax fees, enforces hard fieldwork hour caps during PIC planning, handles multi-type client quotations, and automates 2-level approvals (`PIC -> Audit Manager -> Audit Partner`) with event-driven notifications.

### Reference Benchmark Case (Default Seed Data)
* **Client Name:** WW Global Success Sdn. Bhd.
* **Financial Year End (FYE):** 28.02.2026
* **Current Year (CY) Financials:** Gross Revenue `RM 23,546,128` | Total Assets (excl. intangibles) `RM 6,760,696` | Total Operating Expenses `RM 2,011,296`
* **Prior Year (PY) Fees:** Audit Fee `RM 4,700` | Tax Fee `RM 900` *(handled by firm)*
* **RPG 7 Revenue Floor Benchmark:** `RM 20,000` (`RM 15,300` shortfall; `23.5%` recovery)

---

## 2. Department Roster & Role-Based Access Control (21 Users)

Admin personnel (2 staff) are strictly excluded from the system. Permissions operate across **4 user roles**:

| Role | Headcount | Pre-Approval Permissions | Approval Authority | Post-2-Level Approval Permissions |
| :--- | :---: | :--- | :--- | :--- |
| **Audit PIC** *(Team Members)* | **15** | • **Create & Edit** own assigned engagements (`DRAFT` state)<br>• Enters CY/PY financials, PY fees, quotation details, dates, and 26-section hours ($\le$ Allowed Hours Cap)<br>• Submits directly to Audit Manager | None | • **Read-Only** view of own approved jobs, decided fee, and notifications |
| **Supervisor** *(Dual-Role)* | **4** | • **When Assigned as Job PIC:** Full Audit PIC permissions (creates job, plans hours, submits directly to Audit Manager)<br>• **When Not Assigned as Job PIC:** **Zero access / No visibility** before 2-level approval | None *(not in approval chain)* | • **Read-Only Viewer** for assigned PICs' approved engagements (monitors approved section hours, milestone dates, and decided fees) |
| **Audit Manager** | **1** | • Views all submitted jobs (`PENDING_MANAGER`) from all 15 PICs and any Supervisor acting as PIC<br>• Can return job to `DRAFT` with revision notes | **1st-Level Approval** + `1st Extension` approval | • Full read-only visibility across all engagements + extension management |
| **Audit Partner** | **1** | • Views Manager-approved jobs (`PENDING_PARTNER`) with MIA RPG 7 benchmarks, YoY growth, and quotation anchors | **2nd-Level Approval** + `2nd Extension` + **Final CY & NY Fee Decision** | • Full read-only visibility + generates *Letter of Proposed Audit Fee Increase* |

---

## 3. End-to-End State Machine & Notification Triggers

Every engagement moves through a strict 4-state lifecycle with automated notifications:

```text
[DRAFT] (Audit PIC or Supervisor-as-PIC)
   │  Validates: CY & PY financials, PY fees, Quotation check, Dates, Sum(26 Sections) <= Allowed Hours
   │  Action: Submit to Audit Manager
   ▼  🔔 NOTIFY: Audit Manager (1)
[PENDING_MANAGER] (Audit Manager - 1st Level Review)
   ├──► Action: Return for Revision ──► [DRAFT] (🔔 NOTIFY: Assigned Audit PIC)
   │  Action: Approve 1st Level
   ▼  🔔 NOTIFY: Audit Partner (1)
[PENDING_PARTNER] (Audit Partner - 2nd Level Review & Fee Decision)
   ├──► Action: Return for Revision ──► [DRAFT] (🔔 NOTIFY: Assigned Audit PIC)
   │  Action: Approve 2nd Level & Set CY/NY Proposed Audit Fee
   ▼  🔔 NOTIFY: (1) Assigned Audit PIC, (2) Audit PIC's Supervisor, (3) Audit Manager
[APPROVED_ACTIVE] (Unlocks Supervisor Read-Only Viewer + Generates Fee Increase Letter)
```

### Notification Payload Rules
1. **On PIC Submission (`DRAFT -> PENDING_MANAGER`):**
   * **Recipient:** `Audit Manager`
   * **Details:** Client Name, FYE, PIC Name, Commencement & Target Dates, Planned Hours vs. Maximum Allowed Hours, YoY Revenue/Asset/OpEx % change.
2. **On Manager 1st-Level Approval (`PENDING_MANAGER -> PENDING_PARTNER`):**
   * **Recipient:** `Audit Partner`
   * **Details:** Client Name, FYE, PIC Name, Manager-Approved Hours & Time Cost, MIA RPG 7 Recommended Fees (CY Revenue, Assets, OpEx), PY Fees, Quotation Status (`None` / `Fixed` / `Range RM xx ~ RM xx`).
3. **On Partner 2nd-Level Approval & Fee Decision (`PENDING_PARTNER -> APPROVED_ACTIVE`):**
   * **Recipients:** `Assigned Audit PIC`, `Audit PIC's Supervisor` *(1 of 4)*, and `Audit Manager` *(1)*. *(Note: If a Supervisor initiated the job as PIC, notify that Supervisor as Job Owner + Audit Manager).*
   * **Details:** Final Decided CY Proposed Audit Fee, NY Proposed Audit Fee, Approved Section Hours & Milestone Dates, and confirmation that Supervisor Read-Only Viewer access is unlocked.

---

## 4. PIC Intake Rules & Business Logic

### 4.1 Comparative Financials (CY vs. PY)
The Audit PIC must enter both **Current Year (CY)** and **Previous Year (PY)** figures for:
1. **Total Gross Revenue (RM)**
2. **Total Assets, excluding intangibles (RM)**
3. **Total Operating Expenses (RM)**
4. **Industry Classification** *(Dropdown validated against firm industry list)*

The system automatically computes:
* **YoY Variance (%)** for Revenue, Assets, and Operating Expenses, flagging jumps $> 20\%$ as materiality growth indicators.
* **MIA RPG 7 Progressive Fee Benchmarks** on both CY and PY figures.

### 4.2 Prior-Year Fees & Tax Scope Isolation
* **Previous Year Audit Fee (RM):** Mandatory numeric input.
* **Tax Handled by Firm? (`Yes` / `No`):**
  * If `Yes`: **Previous Year Tax Fee (RM)** is required.
  * If `No`: Previous Year Tax Fee is locked at `RM 0` (`Not Handled by Firm`).
* **Hour Pool Calculation Rule:** Audit fieldwork hours are derived strictly from the **Audit Fee** (`PY Audit Fee × 70% ÷ Charge-Out Rate`) so tax fees do not artificially inflate allowable audit fieldwork time.

### 4.3 Multi-Mode Quotation Tracking
When the PIC answers **"Has a quotation been issued to the client for the current year proposed fee?"**, three modes apply:

1. **`NONE` (No Quotation Issued):**
   * No quotation fields required; Partner prices purely from MIA RPG 7 benchmarks and budgeted time cost.
2. **`FIXED` (Specific Binding Quotation):**
   * Required: `Quotation Ref/Date`, `Quoted CY Audit Fee (RM)`, and `Tax Included?` (if `Yes`, `Quoted CY Tax Fee (RM)`).
   * Behavior: Flagged as a **Committed Client Quote** on the Partner's pricing desk. If the Partner decides on a fee higher than the binding quote, the system requires a **Fee Revision Justification** (e.g., CY revenue exceeded initial quote assumptions).
3. **`GENERAL_RANGE` (Indicative Range `RM xx ~ RM xx` — Reference Only):**
   * Required: `Quotation Ref/Date`, `Quoted Audit Fee Min (RM)`, `Quoted Audit Fee Max (RM)`, and optional `Quoted Tax Fee Min ~ Max (RM)`.
   * Behavior: Clearly badged as **`REFERENCE ONLY — Non-Binding Range`**. Displays where the CY MIA RPG 7 recommended fee sits relative to `Min ~ Max` (*Below Range*, *Within Range*, or *Above Range*).

### 4.4 Timeline & Milestone Planning
* **Required Dates:** `Audit Job Commencement Date` and `Estimated Target Completion Date` (`Target Date > Commencement Date`).
* **Milestone Schedule:** Target dates for `Complete Fieldwork`, `Senior Review`, `Supervisor Review`, `Partner Review`, and `Send Out Draft` (plus optional `1st Extension` and `2nd Extension` tracking).
* **Capacity Check:** Compares calendar working days between Commencement and Target Date against **Recommended Days** (`(Allowed Hours - 7.0 Clearance Hours) ÷ 7.0 hrs/day`).

### 4.5 Hard Section-Hour Cap Guardrail (26 Audit Sections)
* **Maximum Allowed Hours Formula:**
  $$\text{Allowed Hours (C)} = \frac{\text{PY Audit Fee} \times 70\%}{\text{Blended Charge-Out Rate (RM 45/hr)}}$$
  *(e.g., for WW Global Success Sdn. Bhd.: $\text{RM } 4,700 \times 70\% \div \text{RM } 45 = 73.1\text{ hrs}$, including $7.0\text{ hrs}$ clearance and $66.1\text{ hrs}$ net fieldwork).*
* **Hard Enforcement Rule:** Across all **26 audit fieldwork sections** (Planning/Review, 8 Asset sections, 6 Liability sections, 2 Equity sections, 6 Income Statement sections), the PIC **cannot allocate or submit more total hours than `Allowed Hours (C)`**.
  * Real-time sticky header displays: `Allowed Hours`, `Allocated Hours`, and `Remaining Hours`.
  * Any input pushing `Sum(26 Sections) > Allowed Hours` is clamped or blocks the `Submit to Audit Manager` button until adjusted within limit.

---

## 5. MIA RPG 7 Progressive Fee Calculation Engine

The app computes three independent fee benchmarks based on CY financials and displays the highest applicable guideline benchmark:

### A. Gross Revenue Scale
* First `RM 100,000`: `RM 1,500` *(minimum)*
* Next `RM 150,000` (`RM 100k – 250k`): `0.550%`
* Next `RM 250,000` (`RM 250k – 500k`): `0.360%`
* Next `RM 500,000` (`RM 500k – 1.0M`): `0.260%`
* Next `RM 1,500,000` (`RM 1.0M – 2.5M`): `0.175%`
* Next `RM 2,500,000` (`RM 2.5M – 5.0M`): `0.130%`
* Next `RM 5,000,000` (`RM 5.0M – 10.0M`): `0.095%` *(Cumulative at RM 10M = `RM 12,455`)*
* **Above `RM 10,000,000`:** Negotiable with a **mandatory minimum floor of `RM 20,000` per assignment**.

### B. Total Operating Expenses Scale
* First `RM 100,000`: `RM 1,500`
* Next `RM 150,000`: `0.550%` | Next `RM 250,000`: `0.360%` | Next `RM 500,000`: `0.260%` | Next `RM 1,500,000`: `0.175%` | Next `RM 2,500,000`: `0.130%` | Next `RM 5,000,000`: `0.095%`
* Above `RM 10,000,000`: Negotiable (min `RM 20,000`).

### C. Total Assets (Excluding Intangibles) Scale
* First `RM 150,000`: `RM 1,500`
* Next `RM 225,000` (`RM 150k – 375k`): `0.365%`
* Next `RM 375,000` (`RM 375k – 750k`): `0.240%`
* Next `RM 750,000` (`RM 750k – 1.5M`): `0.175%`
* Next `RM 2,250,000` (`RM 1.5M – 3.75M`): `0.115%`
* Next `RM 3,750,000` (`RM 3.75M – 7.5M`): `0.085%`
* Next `RM 7,500,000` (`RM 7.5M – 15.0M`): `0.065%`
* Above `RM 15,000,000`: Negotiable (min `RM 20,000`).

---

## 6. Structured Data Schema (JSON)

Use this schema in Google AI Studio for structured data persistence and validation:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AuditEngagementBudget",
  "type": "object",
  "required": [
    "engagement_id",
    "status",
    "client_info",
    "team_assignment",
    "financials",
    "prior_fees",
    "quotation",
    "schedule",
    "time_budget",
    "approvals",
    "notifications"
  ],
  "properties": {
    "engagement_id": { "type": "string" },
    "status": {
      "type": "string",
      "enum": ["DRAFT", "PENDING_MANAGER", "PENDING_PARTNER", "APPROVED_ACTIVE"]
    },
    "client_info": {
      "type": "object",
      "required": ["client_name", "fye_date", "industry"],
      "properties": {
        "client_name": { "type": "string" },
        "fye_date": { "type": "string", "format": "date" },
        "industry": { "type": "string" }
      }
    },
    "team_assignment": {
      "type": "object",
      "required": ["pic_id", "pic_name", "pic_role", "supervisor_id", "supervisor_name", "manager_name", "partner_name"],
      "properties": {
        "pic_id": { "type": "string" },
        "pic_name": { "type": "string" },
        "pic_role": { "type": "string", "enum": ["AUDIT_PIC", "SUPERVISOR"] },
        "supervisor_id": { "type": "string", "description": "Assigned Supervisor for the PIC (null if PIC is already a Supervisor)" },
        "supervisor_name": { "type": "string" },
        "manager_name": { "type": "string" },
        "partner_name": { "type": "string" }
      }
    },
    "financials": {
      "type": "object",
      "required": ["cy_revenue", "py_revenue", "cy_assets", "py_assets", "cy_expenses", "py_expenses"],
      "properties": {
        "cy_revenue": { "type": "number", "minimum": 0 },
        "py_revenue": { "type": "number", "minimum": 0 },
        "cy_assets": { "type": "number", "minimum": 0 },
        "py_assets": { "type": "number", "minimum": 0 },
        "cy_expenses": { "type": "number", "minimum": 0 },
        "py_expenses": { "type": "number", "minimum": 0 }
      }
    },
    "prior_fees": {
      "type": "object",
      "required": ["py_audit_fee", "tax_handled_by_firm"],
      "properties": {
        "py_audit_fee": { "type": "number", "minimum": 0 },
        "tax_handled_by_firm": { "type": "boolean" },
        "py_tax_fee": { "type": "number", "minimum": 0 }
      }
    },
    "quotation": {
      "type": "object",
      "required": ["quotation_issued", "quotation_type"],
      "properties": {
        "quotation_issued": { "type": "boolean" },
        "quotation_type": { "type": "string", "enum": ["NONE", "FIXED", "GENERAL_RANGE"] },
        "quotation_ref": { "type": "string" },
        "fixed_audit_fee": { "type": "number", "minimum": 0 },
        "fixed_tax_fee": { "type": "number", "minimum": 0 },
        "range_audit_min": { "type": "number", "minimum": 0 },
        "range_audit_max": { "type": "number", "minimum": 0 },
        "range_tax_min": { "type": "number", "minimum": 0 },
        "range_tax_max": { "type": "number", "minimum": 0 }
      }
    },
    "schedule": {
      "type": "object",
      "required": ["commencement_date", "target_completion_date"],
      "properties": {
        "commencement_date": { "type": "string", "format": "date" },
        "target_completion_date": { "type": "string", "format": "date" },
        "milestones": {
          "type": "object",
          "properties": {
            "complete_fieldwork": { "type": "string", "format": "date" },
            "senior_review": { "type": "string", "format": "date" },
            "supervisor_review": { "type": "string", "format": "date" },
            "partner_review": { "type": "string", "format": "date" },
            "send_out_draft": { "type": "string", "format": "date" }
          }
        }
      }
    },
    "time_budget": {
      "type": "object",
      "required": ["charge_out_rate", "allowed_hours_cap", "total_planned_hours", "sections"],
      "properties": {
        "charge_out_rate": { "type": "number", "default": 45 },
        "allowed_hours_cap": { "type": "number" },
        "total_planned_hours": { "type": "number" },
        "sections": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["section_code", "category", "section_name", "planned_hours"],
            "properties": {
              "section_code": { "type": "string" },
              "category": { "type": "string" },
              "section_name": { "type": "string" },
              "planned_hours": { "type": "number", "minimum": 0 }
            }
          }
        }
      }
    },
    "approvals": {
      "type": "object",
      "properties": {
        "manager_approved": { "type": "boolean", "default": false },
        "manager_approved_at": { "type": "string" },
        "manager_notes": { "type": "string" },
        "partner_approved": { "type": "boolean", "default": false },
        "partner_approved_at": { "type": "string" },
        "decided_cy_audit_fee": { "type": "number" },
        "decided_ny_audit_fee": { "type": "number" },
        "fee_variance_reason": { "type": "string" }
      }
    },
    "notifications": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "timestamp": { "type": "string" },
          "trigger_event": { "type": "string" },
          "recipients": { "type": "array", "items": { "type": "string" } },
          "message": { "type": "string" }
        }
      }
    }
  }
}
```

---

## 7. Google AI Studio Build Prompt (Copy-Paste Ready)

Paste the prompt below directly into **Google AI Studio (Build Mode)** to generate the full interactive web application:

```text
Build an enterprise Audit Time-Cost Budgeting, MIA RPG 7 Fee Benchmark, and Multi-Level Approval web application for a 21-person Audit Department (1 Audit Partner, 1 Audit Manager, 4 Supervisors, 15 Audit PICs — strictly exclude Admin users).

### 1. ROLE SWITCHER & PERMISSION LOGIC (21 USERS)
Include a top Role Switcher bar so I can test the exact permissions of all 4 roles:
- Audit PIC (15 members, e.g., "Ahmad (PIC 1)" linked to "Sarah (Supervisor 1)"): Can create/edit engagements in DRAFT status, enter all required data, plan section hours (strictly capped <= Allowed Hours), and submit to the Audit Manager.
- Supervisor (4 members, e.g., "Sarah (Supervisor 1)"): Dual-role logic:
  1. When viewing engagements where she is the assigned PIC, she has full Audit PIC edit & submit rights.
  2. When viewing engagements led by her team's PICs, she has ZERO visibility/access while status is DRAFT, PENDING_MANAGER, or PENDING_PARTNER. Once status becomes APPROVED_ACTIVE (both Manager and Partner approved), she unlocks full Read-Only Viewer access to monitor hours, milestones, and decided fees.
- Audit Manager (1 manager): Views all PENDING_MANAGER submissions, reviews CY/PY financials and section hours, and can either Return to PIC with comments or Approve 1st Level (moving status to PENDING_PARTNER).
- Audit Partner (1 partner): Views all PENDING_PARTNER submissions alongside MIA RPG 7 recommended fees, CY/PY financials, and quotation details. Approves 2nd Level, inputs the Decided CY Proposed Audit Fee (and NY fee) + variance justification, and moves status to APPROVED_ACTIVE.

### 2. PIC INTAKE FORM & HARD VALIDATION RULES
Pre-load a sample job ("WW Global Success Sdn. Bhd.", FYE 2026-02-28) plus a "+ New Audit Job" button:
- Comparative Financials (CY & PY): Total Revenue (CY: 23,546,128 | PY: 19,200,000), Total Assets excl. intangibles (CY: 6,760,696 | PY: 5,850,000), Total Operating Expenses (CY: 2,011,296 | PY: 1,750,000), and Industry dropdown. Auto-calculate YoY % change and highlight >20% growth.
- Prior Fees: Previous Year Audit Fee (4,700) and a toggle "Tax Handled by Firm?". If Yes, require PY Tax Fee (900); if No, hide/lock Tax Fee at RM 0.
- Quotation Check: Toggle "Quotation Issued for Current Year?". If Yes, allow selecting:
  1. "Fixed Quotation" -> input Quoted Audit Fee (RM) & optional Quoted Tax Fee (RM).
  2. "General Range Quotation (RM xx ~ RM xx - Reference Only)" -> input Min & Max Audit Fee (RM) and optional Min & Max Tax Fee (RM), displaying a "REFERENCE ONLY" badge.
- Timeline: Audit Job Commencement Date, Estimated Target Completion Date (must be after Commencement Date), and milestone target dates (Complete Fieldwork, Senior Review, Supervisor Review, Partner Review, Send Out Draft).
- Hard Section-Hour Cap: Calculate Maximum Allowed Hours = (PY Audit Fee * 70%) / RM 45/hr (e.g., 73.1 hrs). Provide the 26 audit fieldwork sections grouped by Planning/Review, Assets, Liabilities, Equity, and Income Statement. Display a sticky live meter (Allowed Hours vs. Allocated Hours vs. Remaining Hours). Strictly prevent the PIC from entering hours exceeding Allowed Hours or submitting if Total Planned Hours > Allowed Hours.

### 3. MIA RPG 7 FEE ENGINE & PARTNER PRICING DESK
Automatically calculate MIA RPG 7 recommended fees on CY financials:
- Gross Revenue scale (RM 1,500 base + progressive tiers up to RM 10M = RM 12,455; above RM 10M = RM 20,000 minimum floor).
- Operating Expenses scale (progressive tiers).
- Total Assets excl. intangibles scale (progressive tiers).
Display a visual comparison chart on the Partner screen comparing PY Fee, Quotation (Fixed or Range), PIC Budgeted Time Cost, and the 3 RPG 7 Fee Benchmarks, plus an auto-generated "Letter of Proposed Audit Fee Increase" preview once approved.

### 4. EVENT-DRIVEN NOTIFICATION CENTER
Include a live Notification Bell & Drawer that triggers realistic alerts at every state transition:
- PIC Submits -> Notifies Audit Manager.
- Manager Approves 1st Level -> Notifies Audit Partner.
- Partner Approves 2nd Level & Decides Fee -> Notifies (1) Audit PIC, (2) Audit PIC's Supervisor, and (3) Audit Manager, confirming Supervisor Viewer access is now unlocked.
```