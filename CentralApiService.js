/**
 * CentralApiService.js - ตัวเชื่อมต่อ MasterCacheAPI และ Access Control Service
 * อ้างอิงเอกสาร: spec-users-profile-api.md (SPEC-IAM-2026-V2.0) และ integration-guide.md
 * 
 * หมายเหตุ: ฝั่งแอป Central API มีระบบ Cache (10 นาที) คอยป้องกัน Google Sheets อยู่แล้ว
 * และฝั่งหน้าจอก็มี LocalStorage จำไว้ 24 ชม. ดังนั้นไฟล์นี้จึงทำหน้าที่เป็น Pure API Connector
 * ส่งคำขอตรงไป-กลับโดยไม่ต้องเก็บแคชซ้ำซ้อน
 */

var CentralApiService = (function() {
  function postRequest_(payload) {
    var url = Config.getCentralAppUrl();
    var token = Config.getSharedToken();
    payload.token = token;

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      var response = UrlFetchApp.fetch(url, options);
      var text = response.getContentText();
      return JSON.parse(text);
    } catch (e) {
      Logger.log('[CentralApiService] HTTP Error calling ' + url + ': ' + e);
      throw new Error('ไม่สามารถเชื่อมต่อ Central API: ' + (e.message || e));
    }
  }

  return {
    /**
     * ตรวจสอบตัวตนและสิทธิ์เข้าถึงหน้าจอตาม spec-users-profile-api.md หมวด 4.1
     * @param {string} lineUid LINE UID ของผู้ใช้งาน
     * @param {string} [screen] รหัสหน้าจอ (default: 'SA01')
     * @returns {Object} { ok, authorized, statusCode, message, user }
     */
    verifyAccess: function(lineUid, screen) {
      if (!lineUid) {
        return {
          ok: false,
          authorized: false,
          statusCode: 'MISSING_LINE_UID',
          message: 'ไม่ได้ระบุ LINE UID'
        };
      }

      // รองรับ Mock Testing เมื่อรันนอก LINE LIFF ในโหมด Development
      if (lineUid.indexOf('MOCK_') === 0) {
        Logger.log('[CentralApiService] Using MOCK profile for ' + lineUid);
        return {
          ok: true,
          authorized: true,
          statusCode: 'ACCESS_GRANTED',
          message: 'Access granted (Mock)',
          user: {
            users_id: 'usr_mock_dev',
            users_name: 'ผู้ทดสอบระบบ (Dev Tester)',
            emp_no: 'EMP9999',
            email: 'tester@company.com',
            line_uid: lineUid,
            active: 'Y',
            screen_tags: ['SA01'],
            approve_tags: ['จป.หัวหน้างาน']
          }
        };
      }

      var targetScreen = screen || Config.getScreenTag();
      var payload = {
        action: 'verifyAccess',
        datasetKey: 'users_profile',
        line_uid: lineUid,
        screen: targetScreen,
        forceFresh: false
      };

      try {
        return postRequest_(payload);
      } catch (err) {
        Logger.log('[CentralApiService] verifyAccess failed: ' + err);
        return {
          ok: false,
          authorized: false,
          statusCode: 'API_CONNECTION_ERROR',
          message: 'เชื่อมต่อระบบตรวจสอบสิทธิ์กลางล้มเหลว: ' + err.message
        };
      }
    },

    /**
     * ดึงรายชื่อผู้อนุมัติตาม Tag ตาม spec-users-profile-api.md หมวด 4.2
     * @param {string} approveTag เช่น "จป.หัวหน้างาน" หรือ "จป.วิชาชีพ"
     * @returns {Array<Object>} รายชื่อผู้อนุมัติ [{ users_id, users_name, line_uid, emp_no, email }]
     */
    getApproveList: function(approveTag) {
      if (!approveTag) return [];

      var payload = {
        action: 'getApproveList',
        datasetKey: 'users_profile',
        approve_tag: approveTag,
        forceFresh: false
      };

      try {
        var res = postRequest_(payload);
        if (res && res.ok && Array.isArray(res.data)) {
          return res.data;
        }
        return [];
      } catch (e) {
        Logger.log('[CentralApiService] getApproveList failed for tag ' + approveTag + ': ' + e);
        return [];
      }
    },

    /**
     * ดึงรายชื่อโครงการ/สาขา จาก Central Cache (datasetKey: "site")
     * ตาม integration-guide.md
     * @returns {Array<string>} รายชื่อโครงการ
     */
    getProjectList: function() {
      var datasetKey = Config.getProjectDatasetKey() || 'site';
      var payload = {
        action: 'getList',
        datasetKey: datasetKey,
        forceFresh: false
      };

      try {
        var res = postRequest_(payload);
        if (res && res.ok && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (e) {
        Logger.log('[CentralApiService] getProjectList failed: ' + e);
      }

      // Fallback รายชื่อโครงการตัวอย่างกรณีระบบกลางขัดข้อง
      return [
        'สำนักงานใหญ่ (HQ)',
        'โครงการก่อสร้าง A (Bangkok)',
        'โรงงานผลิต 1 (Chonburi)',
        'คลังสินค้ากลาง (Rayong)',
        'ศูนย์กระจายสินค้า (Ayutthaya)'
      ];
    },

    /**
     * ดึง Map รายชื่อผู้ใช้ตาม LINE UID { [line_uid]: users_name }
     * เพื่อนำชื่อผู้ตรวจไปแสดงผลแทน LINE UID ในหน้าจออนุมัติ
     */
    getUserMapByLineUid: function() {
      var payload = {
        action: 'getList',
        datasetKey: 'users_profile',
        forceFresh: false
      };

      try {
        var res = postRequest_(payload);
        if (res && res.ok && res.data && res.data.byLineUid) {
          var simpleMap = {
            'MOCK_LINE_UID_001': 'นายสมเกียรติ มั่นคง (ช่างเทคนิค)',
            'MOCK_USER_001': 'ผู้ทดสอบระบบ (Dev Tester)'
          };
          var rawMap = res.data.byLineUid;
          for (var uid in rawMap) {
            if (rawMap.hasOwnProperty(uid)) {
              var u = rawMap[uid];
              if (u && u.users_name) {
                simpleMap[uid] = u.users_name;
              }
            }
          }
          return simpleMap;
        }
      } catch (e) {
        Logger.log('[CentralApiService] getUserMapByLineUid failed: ' + e);
      }

      return {};
    }
  };
})();
