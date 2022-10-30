/** 表达式处理
 * 
*/
const ERROR_CODE = require('../../config/error_code.json')
const redis = require('redis');
const { promisify } = require("util");
const myRedis = redis.createClient();
const myRedisGet = promisify(myRedis.get).bind(myRedis);

//后期考虑安全性问题还是要改成类，把关键方法隐藏起来
var expression = {
    /** 问号表达式
     * exp--{ exp: "===", left: "{{#orderProp}}", right: undefined, result: "createtime", then: "{{#orderProp}}" }
     */
    ask: function (exp) {
        var result = undefined;
        switch (exp.symbol) {
            case "===":
                result = exp.left === exp.right ? exp.result : exp.then;
                return result;
                break;
            default: break;
        }
    }
}
module.exports = expression;