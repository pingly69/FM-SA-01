# FM-SA-01 Project Instructions & Working Specification

Welcome to **FM-SA-01** (Safety Inspection & 1-Level Approval System).
This file contains the fundamental architecture, operational rules, and synchronization guidelines for this repository.

---

## 1. Project Overview & Identity
- **Project ID (GAS)**: `1OZVeue-dysQ7bgneiuqp3eOZRJUy67Fjnz4_DJf5vd0hiPlfn0FDJ1rY`
- **GitHub Repository**: `https://github.com/pingly69/FM-SA-01`
- **Form / Screen Tag**: `SA01` (Approve Tag L1: `จป.หัวหน้างาน`, L2: `-`)
- **Frontend Hosting**: GitHub Pages (`index.html`) & LINE LIFF (`2009016720-cesy3wsR`)

---

## 2. 3-Tier Cache Architecture (CRITICAL)
Do **NOT** alter the cache architecture without explicit user instruction:
1. **Tier 1 (Client `localStorage`)**:
   - Stores `questions`, `projects`, `l1Approvers`.
   - TTL: 24 hours.
   - Purpose: Fast-Path rendering (< 0.05s) on LINE LIFF open.
   - User trigger: "🔄 อัปเดตข้อมูล" (`forceRefreshCache`) clears `localStorage` and fetches from server.
2. **Tier 2 (Server `CacheService` in FM-SA-01)**:
   - Stores: **`FORM_MASTER` ONLY** (questions read from local Google Sheet tab `FORM_MASTER`).
   - TTL: 6 hours (21,600 seconds).
   - **DO NOT add `CacheService` to `CentralApiService.js`** (prevents Double-Caching).
3. **Tier 3 (Central MasterCacheAPI Server Cache)**:
   - Stores: User profiles, approve tags (`getApproveList`), sites (`getProjectList`).
   - TTL: 10 minutes (600 seconds) managed **at the Central API Web App**.
   - Admin informs users to wait 10 minutes after permission updates before pressing refresh.
   - Always send `forceFresh: false` in `CentralApiService.js`.

---

## 3. Tooling & Synchronization Rules
- **DO NOT USE `clasp push` or `clasp pull`**: Node.js v24 zlib stream bug causes `ERR_STREAM_PREMATURE_CLOSE`.
- **ALWAYS USE `gas_sync.py`**:
  - Pull from GAS: `python gas_sync.py pull`
  - Push to GAS: `python -u gas_sync.py push` (automatically creates new GAS version and updates Web App deployment).
- **GitHub Sync**: Always commit and push changes to `main` branch:
  ```powershell
  git add -A; git commit -m "your message"; git push origin main
  ```
- Note for PowerShell: Use `;` instead of `&&` as statement separator.

---

## 4. Key Files & Structure
- `index.html`: Bundled SPA for GitHub Pages & standalone browser execution.
- `Router.js`: GAS `doGet` and `doPost` routing and JSON API dispatch.
- `CentralApiService.js`: Pure API connector to Central MasterCacheAPI (`postRequest_`).
- `ChecklistService.js` & `ChecklistController.js`: Checklist form data, validations, and save logic.
- `ApprovalService.js` & `ApprovalController.js`: 1-Level Approval queue and workflow.
- `FormMasterRepo.js`: Reads questions from local Google Sheet with 6-hour `CacheService`.
- `TransactionRepo.js`: Transaction storage in Google Sheet `FMSA01_TRANSACTION`.
- `Config.js`: Cached script properties (Spreadsheet ID, Central App URL, Shared Token, LIFF ID).
- `NotifyService.js`: LINE Messaging notifications.
