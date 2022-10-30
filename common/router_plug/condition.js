/** 程序条件判断路由单元
*/
const ERROR_CODE = require('../../config/error_code.json')

//后期考虑安全性问题还是要改成类，把关键方法隐藏起来
var condition = {
    /** if判断操作
     * args: [["==", "~lastResult", true], ["==", "~lastResult.tel", "~user.tel"]]
    */
    if: function () {
        if (arguments.length > 0) {
            for (var index = 0; index < arguments.length; index++) {
                var expression = arguments[index];
                var firstSymbol = expression[0];
                switch (firstSymbol) {
                    case "existent":
                        if (!expression[1]) {
                            return false;
                        }
                        break;
                    case "==":
                        if (expression[1] != expression[2]) {
                            return false;
                        }
                        break;
                    case ">":
                        break;
                    case ">=":
                        return expression[1] >= expression[2] ? true : false;
                        break;
                    case "<":
                        break;
                    case "<=":
                        break;
                    default: break;
                }
            }
        }
        return true;
    }
}
module.exports = condition;