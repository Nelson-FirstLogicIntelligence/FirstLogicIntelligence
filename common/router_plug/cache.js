/** 缓存路由单元
 * 
*/
const ERROR_CODE = require('../../config/error_code.json')
const redis = require('redis');
const { promisify } = require("util");
const myRedis = redis.createClient();
const myRedisGet = promisify(myRedis.get).bind(myRedis);

//后期考虑安全性问题还是要改成类，把关键方法隐藏起来
var cache = {
    /** 加密服务
     * 
     */
    get: myRedisGet,
    set: function () {
        myRedis.setex.apply(myRedis, arguments)
    },
    remove: function () {
        myRedis.del.apply(myRedis, arguments)
    }
}
module.exports = cache;