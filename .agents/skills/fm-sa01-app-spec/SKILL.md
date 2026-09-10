---
name: fm-sa01-app-spec
description: Complete architecture, cache design, and operational specifications for FM-SA-01 (Safety Checklist & Approval Web App). Activate whenever modifying FM-SA-01, deploying to GAS, or troubleshooting cache/API issues.
---

# FM-SA-01: Safety Checklist & Approval System Specification

## 1. System Identity & Environment
- **System**: FM-SA-01 / Safety Checklist & 1-Level Approval System (EHS)
- **Screen Tag**: `SA01`
- **Approve Tag L1**: `จป.หัวหน้างาน`
- **Approve Tag L2**: `-` (Single-level approval)
- **Google Apps Script Project ID**: `1OZVeue-dysQ7bgneiuqp3eOZRJUy67Fjnz4_DJf5vd0hiPlfn0FDJ1rY`
- **GitHub Repository**: `https://github.com/pingly69/FM-SA-01`
- **Deployment URL**: GAS Web App Exec URL (and mirrored on GitHub Pages via `index.html`)
- **LINE LIFF ID**: `2009016720-cesy3wsR`

---

## 2. 3-Tier Cache Architecture (CRITICAL DESIGN PRINCIPLE)
The system uses a strictly decoupled 3-tier caching structure to eliminate Google quota exhaustion, spreadsheet concurrency locks, and double-caching lag:

```
[Tier 1: Client LocalStorage] ---> [Tier 2: FM-SA-01 Server] ---> [Tier 3: Central MasterCacheAPI]
     (24 Hours TTL)                     (Cache FORM_MASTER)              (10 Minutes TTL)
- questions, projects, approvers    - CacheService 6 Hours        - Single Source of Truth
- Instant render < 0.05s            - Local Sheet only            - Profiles, Tags, Sites
- Cleared on "🔄 อัปเดตข้อมูล"      - NO Central API cache        - Protects Central Master Sheet
```

### Detailed Tier Roles:
1. **Tier 1 (Client `localStorage` - 24 Hours)**:
   - Stores: `FMSA03_LOCAL_QUESTIONS`, `FMSA03_LOCAL_PROJECTS`, `FMSA03_LOCAL_APPROVERS`, `FMSA03_LOCAL_CACHE_TIME`.
   - On opening app: Immediately renders dropdowns and questions in < 0.05s (Fast-Path).
   - Refresh button ("🔄 อัปเดตข้อมูล" / `forceRefreshCache`): Clears `localStorage` and requests fresh data from the server.

2. **Tier 2 (Server `CacheService` in FM-SA-01 - 6 Hours)**:
   - File: `FormMasterRepo.js`
   - Stores: `FORM_MASTER_CACHE_V2` (checklist questions read from local Google Sheet tab `FORM_MASTER`).
   - TTL: 21,600 seconds (6 hours).
   - **RULE**: Do NOT add `CacheService` to `CentralApiService.js`. Central API calls must be delegated directly to Tier 3.

3. **Tier 3 (Central MasterCacheAPI Server Cache - 10 Minutes)**:
   - External Web App: `Config.getCentralAppUrl()`
   - Stores: User profiles, screen tags (`SA01`), approve tags (`จป.หัวหน้างาน`), sites (`site`).
   - TTL: 10 minutes (600 seconds) managed by Central API Web App.
   - **RULE**: Always send `forceFresh: false`. Admin informs users to wait 10 minutes after permission updates before pressing "อัปเดตข้อมูล".

---

## 3. LINE LIFF Fast-Path Authentication
- In `JS_Common.html` and `index.html`:
  - Uses `liff.getDecodedIDToken()` to obtain `sub` (LINE UID) and `name` without network round-trips.
  - Falls back to raw JWT decoding of `liff.getIDToken()` if needed.
  - Caches verified user session in `sessionStorage` (`FM_SA01_AUTH_SESSION`).
  - Does NOT trigger duplicate background `verifyUser` API calls on startup if session cache is active.

---

## 4. Backend Service Architecture
1. **`Router.js`**:
   - `doGet(e)`: Serves HTML or handles GET JSON API (`action=verifyUser`, `action=getChecklistForm`, etc.).
   - `doPost(e)`: Handles POST JSON API from GitHub Pages / Web App.
2. **`CentralApiService.js`**:
   - Pure API Connector: Posts JSON payloads with `token = Config.getSharedToken()`.
   - Methods: `verifyAccess(lineUid, screen)`, `getApproveList(approveTag)`, `getProjectList()`, `getUserMapByLineUid()`.
   - Never uses `CacheService` (delegates caching to Central API).
3. **`ChecklistService.js` & `ChecklistController.js`**:
   - `getChecklistFormData(lineUid, transDate)`: Returns questions, projects, approvers, and existing transaction.
   - `saveChecklist(payload)`: Validates required fields, ensures all questions answered (BR-3), checks transaction state (BR-2: locked if APPROVED or PENDING_L2).
4. **`ApprovalService.js` & `ApprovalController.js`**:
   - `getApprovalQueue(lineUid, monthFilter)`: Lists pending transactions where current user is approver.
   - `approveTransaction(payload)` & `rejectTransaction(payload)`: State transitions and audit trails.
5. **`FormMasterRepo.js`**:
   - Reads `FORM_MASTER` sheet tab using `getDisplayValues()` to preserve decimal section IDs like `1.10`.
   - Caches with `CacheService.getScriptCache()` (6 hours).
6. **`TransactionRepo.js`**:
   - Reads and writes to `FMSA01_TRANSACTION` sheet tab.
7. **`NotifyService.js`**:
   - Sends LINE messages to approver upon checklist submission.

---

## 5. Synchronization & Deployment Protocol
- **DO NOT USE `clasp push` or `clasp pull`**: Node.js v24 causes `ERR_STREAM_PREMATURE_CLOSE`.
- **Use `gas_sync.py`**:
  - Pull from GAS:
    ```powershell
    python gas_sync.py pull
    ```
  - Push to GAS (Auto-creates new version & updates deployment):
    ```powershell
    python -u gas_sync.py push
    ```
- **Git / GitHub Push**:
  ```powershell
  git add -A; git commit -m "commit message"; git push origin main
  ```
  *(Remember: In Windows PowerShell, use `;` instead of `&&`)*

---

## 6. Common Pitfalls & What NOT to Do
1. **Never set `forceFresh: true`**: Bypassing cache causes Google Sheets lock contention and `UrlFetch` rate-limit errors.
2. **Never add CacheService inside `CentralApiService.js`**: Doing so creates double-caching lag (up to 20 mins delay for permission updates).
3. **Never call `liff.getProfile()` during initial load**: Always decode the ID Token locally for sub-second startup.
4. **Keep `index.html` and partials (`JS_Checklist.html`, `JS_Common.html`) in sync**: `index.html` is the bundled file used by GitHub Pages.
