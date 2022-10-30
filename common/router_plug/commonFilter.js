/** 控制器通用过滤器
 * 
*/
const ERROR_CODE = require('../../config/error_code.json')
const redis = require('redis');
const { promisify } = require("util");
const config = require('../../config/config');
const mysql = require('./mysql')
const rds = redis.createClient();
const redisGetAsync = promisify(rds.get).bind(rds);

//后期考虑安全性问题还是要改成类，把关键方法隐藏起来
var commonFilter = {
    //用户身份token验证,管理端
    authenticationManage: async (req, res) => {
        var token;
        // 参数错误
        if (req.method == "POST") {
            token = req.headers.authorization
        }
        else if (req.method == "GET") {
            // token = req.query["token"]ß
            token = req.cookies.token
        }
        // 参数错误
        if (!token) {
            return { error_code: ERROR_CODE.ERROR_TOKEN_EXPIRED, error_msg: "用户身份错误" }
        }

        const user = await check_token(token)
        if (!user) {
            return { error_code: ERROR_CODE.ERROR_TOKEN_EXPIRED, error_msg: "用户身份错误" }
        }
        async function check_token(token) {
            const tel = await redisGetAsync("token:" + token)
            if (!tel) {
                return null
            }
            return tel
        }
    },
    //用户身份token验证,用户端
    authentication: async (req, res) => {
        const token = req.headers.authorization

        // 参数错误
        if (!token) {
            return { error_code: ERROR_CODE.ERROR_TOKEN_EXPIRED, error_msg: "用户身份错误" }
        }

        const user = await check_token(token)
        if (!user) {
            return { error_code: ERROR_CODE.ERROR_TOKEN_EXPIRED, error_msg: "用户身份错误" }
        }
        res.locals.user = user;
        async function check_token(token) {
            const tel = await redisGetAsync("token:" + token)
            if (!tel) {
                return null
            }
            const user = await mysqlYFI.select([{ table: "user", alias: "u" }, { table: "device", alias: "d", join: "left join", equal: [{ left: "d.tel", right: "u.tel" }] }], "u.*,d.device_id,d.device_tel", [{ field: "u.tel", value: tel, compareSymbol: "=" }])
            if (results.length != 0) user = user[0]
            user.is_child = user.parent ? 1 : 0;
            if (!user || !user.password) {
                return null
            }
            rds.setex("token:" + token, config.token_expire, tel)
            return user
        }
    },
    //参数为空判断 commonFilter 默认是字段名，也可能是对象
    iEmpty: async (field, value, error_code, error_msg) => {
        if (value === "" || value === undefined || value === null) {
            return { error_code: error_code ? error_code : ERROR_CODE.ERROR_PARAMETER, error_msg: error_msg ? error_msg : field + " 不能为空" }
        }
    },
    //有值则报错
    unEmpty: async (field, value, error_code, error_msg) => {
        if (!commonFilter.iEmpty(field, value, error_code, error_msg)) {
            return { error_code: error_code ? error_code : ERROR_CODE.ERROR_PARAMETER, error_msg: error_msg ? error_msg : field + " 不能存在" }
        }
    },
    //国际号码验证，前面是'+'开头
    iInternationalTel: async (field, value, error_code, error_msg) => {
        if (!value.startsWith('+')) {
            return { error_code: error_code ? error_code : ERROR_CODE.ERROR_PARAMETER, error_msg: error_msg ? error_msg : field + " 参数必须以+开头" }
        }
    },
    //数字范围验证
    digit: async (field, value, min, max, error_code, error_msg) => {
        var errorMsg = error_msg ? error_msg : field + " 参数需是数字";
        if (typeof value === 'number' && !isNaN(value) && value === parseInt(value, 10)) {
            if (value > max || value < min) {
                errorMsg += "且在" + min + "至" + max + "之间";
            }
            else {
                return undefined;
            }
        }
        return { error_code: error_code ? error_code : ERROR_CODE.ERROR_PARAMETER, error_msg: error_msg ? error_msg : field + " 参数需是数字且符合范围" }
    }
}
module.exports = commonFilter;