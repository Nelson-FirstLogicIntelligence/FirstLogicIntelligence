/** 
 * 错误处理
*/
const ERROR_CODE = require('../../config/error_code.json')

//后期考虑安全性问题还是要改成类，把关键方法隐藏起来
var error = {
    /** 
     * 
     */
    throw: function (flag, ex, arguments, error_code) {
        console.error({ iError: true, flag: flag, ex: ex, argus: arguments });
        // throw new Error({ flag: "cache", ex: ex, arguments: arguments });
        result = {}
        result.code = error_code === undefined ? ERROR_CODE.ERROR_PARAMETER : error_code;
        result.errors = []
        if (ex && ex.message) {
            result.errors.push({ error_code: result.code, error_msg: ex.message })
        }
        else {
            result.errors.push({ error_code: result.code, error_msg: ex })
        }
        return result;
    }
}
module.exports = error;