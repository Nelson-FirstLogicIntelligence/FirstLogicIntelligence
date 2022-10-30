/** 业务相关插件
 * 
*/
const ERROR_CODE = require('../config/error_code.json')
const { FLI } = require('../common/FirstLogicIntelligence');

var business = {
    /** 列表数据手机号脱敏处理
     * list 列表数据
     * phoneKey 手机号字段名称，支持多字段（需要用数组，单字段无需）
     */
    formatListPhoneNODesensitization: function (list, phoneKey) {
        if (list && list.data && list.data.records && list.data.records.length > 0) {
            var rows = list.data.records;
            for (var index = 0; index < rows.length; index++) {
                var row = rows[index];
                if (typeof phoneKey === "object" && phoneKey.length > 1) {
                    for (var column_index = 0; column_index < phoneKey.length; column_index++) {
                        phoneNODesensitization(row, phoneKey[column_index]);
                    }
                }
                else {
                    phoneNODesensitization(row, phoneKey);
                }
            }
        }
        return list;
        function phoneNODesensitization(row, phoneKey) {
            if (row[phoneKey]) {
                row[phoneKey] = row[phoneKey].substring(0, row[phoneKey].length - 8) + "****" + row[phoneKey].substring(row[phoneKey].length - 4)
            }
        }
    },

    /**
     * 相关报表导出前密码验证
     * pwd -- 用户输入的密码
     */
    verifyExportPwd: async function (pwd) {
        pwd = FLI.plug.encrypt.decrypt(pwd)
        var random_six;
        if (pwd.indexOf("|") > 0) {
            random_six = pwd.substring(pwd.indexOf("|") + 1)
            var catch_random_six = await FLI.plug.cache.get("export:" + random_six)
            if (catch_random_six == random_six) {
                pwd = pwd.substring(0, pwd.indexOf("|"))
                FLI.plug.cache.remove("export:" + random_six)
            }
            else {
                return { code: ERROR_CODE.ERROR_CHECK_VERIFY_CODE, errors: [{ error_code: ERROR_CODE.ERROR_CHECK_VERIFY_CODE, error_msg: "wrong password" }] };
            }
        }
        else {
            return { code: ERROR_CODE.ERROR_CHECK_VERIFY_CODE, errors: [{ error_code: ERROR_CODE.ERROR_CHECK_VERIFY_CODE, error_msg: "wrong password" }] };
        }

        var exportPwdCount = await FLI.plug.mysql.seleteSingle("config", "count(1) count", [{ field: "type", value: "export_pwd" }, { field: "value", value: pwd }])
        if (exportPwdCount && exportPwdCount.count && exportPwdCount.count >= 1) {
            return { code: ERROR_CODE.ERROR_SUCCESS };
        }
        return { code: ERROR_CODE.ERROR_CHECK_VERIFY_CODE, errors: [{ error_code: ERROR_CODE.ERROR_CHECK_VERIFY_CODE, error_msg: "wrong password" }] };
    }
}
module.exports = business;