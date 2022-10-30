/** HTTP路由单元
 * 提供HTTP协议相关逻辑
*/
const ERROR_CODE = require('../../config/error_code.json')

//后期考虑安全性问题还是要改成类，把关键方法隐藏起来
var http = {
    //返回指定数据 rtnJSON必须是JSON Object; excludeField 是不返回的字段数组
    responseEnd: function (rtnJSON, excludeField) {
        rtnJSON.iEnd = true;
        rtnJSON.code = rtnJSON.code ? rtnJSON.code : ERROR_CODE.ERROR_SUCCESS;
        if (excludeField && excludeField.length) {
            for (var index = 0; index < excludeField.length; index++) {
                delete rtnJSON[excludeField[index]];
            }
        }
        return rtnJSON;
    }
}
module.exports = http;