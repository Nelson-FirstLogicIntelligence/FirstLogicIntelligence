'use strict'
const { FLI } = require('../common/FirstLogicIntelligence')
const ERROR_CODE = require('../config/error_code.json')
const CONFIG = require('../config/config')

/**
 * 通用函数
 */
module.exports = {
    //登录
    "login": {
        filters: ["{{#tel}}", "{{#password}}", { field: "{{#tel}}", fun: FLI.plug.commonFilter.iInternationalTel }]
        ,
        routerOperate: [//对的，这里的系统关键字用{{}}括起来就行了，卧槽、、！！？/。》！、！？>!.
            { key: "获取密码加密", fun: FLI.plug.encrypt.encode, args: ["{{#password}}", CONFIG.server_salt] },
            { key: "账号是否存在", fun: FLI.plug.mysql.iExist, args: ["user", [{ field: "tel", value: "{{#tel}}" }, { field: "password", value: "{{~lastResult}}" }]], showError: { error_code: ERROR_CODE.ERROR_BAD_PASSWORD, error_msg: "用户名或密码错误" } },
            { key: "生成登录凭据", fun: FLI.plug.user.uuidv4 },
            { key: "缓存token", fun: FLI.plug.cache.set, args: ["token:{{~lastResult}}", 7 * 24 * 3600, "{{#tel}}"] },
            { key: "返回登录凭据", fun: FLI.plug.http.responseEnd, args: [{ token: "{{~results.生成登录凭据}}" }] }
        ]
    }
}
