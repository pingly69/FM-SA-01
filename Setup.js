/**
 * Setup.js - ฟังก์ชันเริ่มต้นระบบ (One-time Initializer)
 * ใช้สำหรับตั้งค่า Script Properties และสร้าง Header/Master Data ใน Google Sheet
 */

function setupScriptProperties() {
  var props = {
    SPREADSHEET_ID: '1XXsywaAKQwWU4A2uGsvt6b2wxNVRJDIp-Z5nC3Bp8KM',
    CENTRAL_APP_URL: 'https://script.google.com/macros/s/AKfycbwhbYUFPHlMq5KrtHRZUNTjeHsKtSF2IW0bEzJZwL-hqBhzFx3gXR4ijL83ajPs0zcQDA/exec',
    SHARED_TOKEN: 'secret-token-12345',
    LIFF_ID: '2009016720-cesy3wsR',
    LINE_CHANNEL_ACCESS_TOKEN: 'K45XA5KmRF7LvubrCP62u0joB0MCNJWA0KjVd4EbKrtadLmFKOYSGLR/qsCo/UgY2v+pmcve5/hYyf0VQDo4RiU4nbYYjVFJ3Yik2qAWZaGF5UKlXhb1+vSLilGI2FiwfGUAy6H2LWubxOEmtnadkwdB04t89/1O/w1cDnyilFU=',
    APPROVE_TAG_L1: 'จป.หัวหน้างาน',
    APPROVE_TAG_L2: '-',
    SCREEN_TAG: 'SA01',
    PROJECT_DATASET_KEY: 'site',
    ENABLE_SHEET_FALLBACK: 'false',
    APPROVAL_STEPS: '1',
    TRANSACTION_SHEET_NAME: 'FMSA01_TRANSACTION',
    FORM_MASTER_SHEET_NAME: 'FORM_MASTER'
  };

  PropertiesService.getScriptProperties().setProperties(props);
  Logger.log('✅ Script Properties configured successfully!');
  viewScriptProperties();
}

function viewScriptProperties() {
  var p = PropertiesService.getScriptProperties().getProperties();
  Logger.log('📋 Current Script Properties: ' + JSON.stringify(p, null, 2));
}

function initDatabaseSheets() {
  var ssId = Config.getSpreadsheetId();
  if (!ssId) {
    throw new Error('ไม่พบ SPREADSHEET_ID กรุณาเรียก setupScriptProperties() ก่อน');
  }

  var ss = SpreadsheetApp.openById(ssId);

  // 1. ตาราง FORM_MASTER
  var masterSheetName = Config.getFormMasterSheetName();
  var masterSheet = ss.getSheetByName(masterSheetName);
  if (!masterSheet) {
    masterSheet = ss.insertSheet(masterSheetName);
  }

  var masterHeaders = ['record_id', 'item_name', 'header_flag', 'score'];
  var currentMasterData = masterSheet.getDataRange().getValues();

  // สร้าง Header ถ้ายังไม่มี
  if (currentMasterData.length === 0 || currentMasterData[0].length === 0 || currentMasterData[0][0] !== 'record_id') {
    masterSheet.clear();
    masterSheet.appendRow(masterHeaders);
    var mHeaderRange = masterSheet.getRange(1, 1, 1, masterHeaders.length);
    mHeaderRange.setFontWeight('bold');
    mHeaderRange.setBackground('#1E293B');
    mHeaderRange.setFontColor('#FFFFFF');
    masterSheet.setFrozenRows(1);
  }

  // เติมชุดคำถามตัวอย่างของ FM-SA-03 ถ้ามีแค่แถว Header
  if (masterSheet.getLastRow() <= 1) {
    var defaultQuestions = [
      [1, '1. อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล (PPE)', 'Y', 0],
      [2, 'พนักงานและผู้รับเหมาสวมหมวกนิรภัยตลอดเวลาในพื้นที่ปฏิบัติงาน', 'N', 0],
      [3, 'สวมรองเท้านิรภัย (Safety Shoes) สภาพสมบูรณ์และได้มาตรฐาน', 'N', 0],
      [4, 'สวมแว่นตานิรภัย/กระบังหน้า ขณะทำงานที่มีประกายไฟหรือเศษวัสดุกระเด็น', 'N', 0],
      [5, 'สวมถุงมือที่เหมาะสมกับลักษณะงาน', 'N', 0],
      [6, 'สวมเข็มขัดนิรภัยแบบเต็มตัว (Full Body Harness) เมื่อทำงานบนที่สูงเกิน 2 เมตร', 'N', 0],

      [7, '2. สภาพแวดล้อมและพื้นที่ปฏิบัติงาน (Workplace & Environment)', 'Y', 0],
      [8, 'ทางเดินและบันไดสะอาด ปราศจากสิ่งกีดขวางหรือคราบน้ำมันลื่น', 'N', 0],
      [9, 'มีการจัดเก็บสายไฟ สายลม อย่างเป็นระเบียบ ไม่พาดผ่านทางสัญจร', 'N', 0],
      [10, 'แสงสว่างในพื้นที่ปฏิบัติงานเพียงพอและปลอดภัยต่อการทำงาน', 'N', 0],
      [11, 'มีการติดตั้งป้ายเตือนอันตรายและแผงกั้นในจุดเสี่ยงชัดเจน', 'N', 0],

      [7, '3. เครื่องจักร เครื่องมือ และอุปกรณ์ไฟฟ้า (Machinery & Electrical Tools)', 'Y', 0],
      [13, 'เครื่องจักรและเครื่องมือผ่านการตรวจสภาพประจำวันก่อนเริ่มใช้งาน', 'N', 0],
      [14, 'การ์ดป้องกันอันตราย (Machine Guard) ติดตั้งครบถ้วนและพร้อมใช้งาน', 'N', 0],
      [15, 'ปลั๊กและสายไฟไม่มีรอยฉีกขาดหรือชำรุด มีการต่อสายดินอย่างถูกต้อง', 'N', 0],
      [16, 'มีตู้ไฟควบคุมพร้อมระบบเบรกเกอร์ตัดไฟรั่ว (ELCB/RCD) ที่ทำงานได้ปกติ', 'N', 0],

      [17, '4. การป้องกันและระงับอัคคีภัย (Fire Prevention)', 'Y', 0],
      [18, 'ถังดับเพลิงอยู่ในสภาพพร้อมใช้งาน เข็มวัดแรงดันอยู่ในเกณฑ์ปกติ', 'N', 0],
      [19, 'บริเวณหน้าถังดับเพลิงโล่ง ไม่มีสิ่งของวางกีดขวางการหยิบใช้', 'N', 0],
      [20, 'งานที่มีประกายไฟ (Hot Work) มีการจัดเตรียมอุปกรณ์ดับเพลิงและผ้ากันสะเก็ดไฟ', 'N', 0],
      [21, 'ไม่มีการสะสมของวัสดุติดไฟหรือสารเคมีไวไฟในบริเวณปฏิบัติงาน', 'N', 0],

      [22, '5. สุขอนามัยและการปฐมพยาบาล (Health & Hygiene)', 'Y', 0],
      [23, 'มีจุดบริการน้ำดื่มสะอาดและถูกสุขลักษณะสำหรับผู้ปฏิบัติงาน', 'N', 0],
      [24, 'กล่องปฐมพยาบาลมีเวชภัณฑ์จำเป็นครบถ้วนและไม่หมดอายุ', 'N', 0],
      [25, 'ห้องน้ำและพื้นที่พักผ่อนสะอาด ถูกสุขอนามัย', 'N', 0]
    ];

    var range = masterSheet.getRange(2, 1, defaultQuestions.length, masterHeaders.length);
    range.setValues(defaultQuestions);
    masterSheet.autoResizeColumns(1, masterHeaders.length);
    Logger.log('✅ เติมรายการคำถามเริ่มต้นใน FORM_MASTER เรียบร้อย (' + defaultQuestions.length + ' รายการ)');
  }

  // 2. ตาราง Transaction
  var transSheetName = Config.getTransactionSheetName();
  var transSheet = ss.getSheetByName(transSheetName);
  if (!transSheet) {
    transSheet = ss.insertSheet(transSheetName);
  }

  var transHeaders = [
    'TRANS_RECORD_ID',
    'TRANS_DATE',
    'PROJECT',
    'Line_UID',
    'CREATE_DATETIME',
    'UPDATE_DATETIME',
    'approve_profile1',
    'approve_profile2',
    'STATUS',
    'APPROVE1_DATETIME',
    'APPROVE1_RESULT',
    'APPROVE2_DATETIME',
    'APPROVE2_RESULT',
    'REJECT_REASON',
    'RESUBMIT_COUNT',
    'ANSWERS_JSON',
    'USER_NAME'
  ];

  var currentTransData = transSheet.getDataRange().getValues();
  if (currentTransData.length === 0 || currentTransData[0].length === 0 || currentTransData[0][0] !== 'TRANS_RECORD_ID') {
    transSheet.clear();
    transSheet.appendRow(transHeaders);
    var tHeaderRange = transSheet.getRange(1, 1, 1, transHeaders.length);
    tHeaderRange.setFontWeight('bold');
    tHeaderRange.setBackground('#1E293B');
    tHeaderRange.setFontColor('#FFFFFF');
    transSheet.setFrozenRows(1);
    transSheet.autoResizeColumns(1, transHeaders.length);
    Logger.log('✅ สร้าง Header ตาราง FMSA01_TRANSACTION เรียบร้อย (17 Columns)');
  }

  // ล้าง Cache เก่าเพื่อให้อ่านค่าใหม่ทันที
  try {
    CacheService.getScriptCache().remove('FORM_MASTER_CACHE_V1');
  } catch (e) {}

  Logger.log('🎉 ฐานข้อมูล Google Sheets พร้อมใช้งาน 100%!');
}

/**
 * ฟังก์ชัน All-in-One สำหรับรันเตรียมระบบครั้งแรก
 */
function runInitialSetup() {
  setupScriptProperties();
  initDatabaseSheets();
  setupFormMasterCacheTrigger();
  Logger.log('🚀 Initial setup completed successfully!');
}
