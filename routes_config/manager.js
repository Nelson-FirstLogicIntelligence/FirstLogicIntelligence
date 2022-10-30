'use strict'
const { FLI } = require('../common/FirstLogicIntelligence')
const ERROR_CODE = require('../config/error_code.json')
const CONFIG = require('../config/config')
FLI.addPlug("business", "../common/plug_business")

/** router 配置
 * #开头表示post请求体参数
 * ~开头表示系统内置参数;如~user 用户信息 / ~lastResult 上一步骤执行返回的数据
 */
module.exports = {
    /****** 登出token清除 ******/
    "removeToken": {
        filters: [FLI.plug.commonFilter.authenticationManage, "{{#token}}"],
        routerOperate: [
            { key: "清除缓存", fun: FLI.plug.cache.remove, args: ["token:" + "{{#token}}"] }
        ],
        log: { main_type: "进出系统", child_type: "注销" }
    },

    /****** 登录 ******/
    "login": {
        filters: ["#name", "#password"]
        ,
        routerOperate: [
            { key: "验证验证码", args: ["{{~req}}", "{{#captcha}}"] },
            { key: "获取密码加密", fun: FLI.plug.encrypt.encode, args: ["{{#password}}", CONFIG.server_salt] },
            { key: "账号是否存在及锁定", args: ["{{~req}}", "{{#name}}", "{{~lastResult}}"] },
            { key: "生成登录凭据", fun: FLI.plug.user.uuidv4 },
            { key: "缓存凭据", fun: FLI.plug.cache.set, args: ["token:" + "{{~lastResult}}", 3600, "{{#name}}"] },
            { key: "获取用户数据", fun: FLI.plug.mysql.seleteSingle, args: ["account", "type", [{ field: "name", value: "{{#name}}" }]] },
            { key: "返回登录凭据", fun: FLI.plug.http.responseEnd, args: [{ token: "{{~results.生成登录凭据}}", type: "{{~results.获取用户数据}}" }] }
        ],
        log: { main_type: "进出系统", child_type: "登录" }
    },

    /****** 用户管理 ******/
    //查询用户列表
    "getUserList": {
        filters: [FLI.plug.commonFilter.authenticationManage],
        routerOperate: [
            { key: "获取排序字段", fun: FLI.plug.expression.ask, args: [{ symbol: "===", left: "{{#orderProp}}", right: undefined, result: "create_time", then: "{{#orderProp}}" }] },//create_time
            { key: "获取正逆排序关键字", fun: FLI.plug.expression.ask, args: [{ symbol: "===", left: "{{#orderAsc}}", right: true, result: "ASC", then: "DESC" }] },//DESC
            { key: "获取页码", fun: FLI.plug.expression.ask, args: [{ symbol: "===", left: "{{#current}}", right: undefined, result: undefined, then: "{{#current}}" }] },//DESC
            { key: "获取单页总数", fun: FLI.plug.expression.ask, args: [{ symbol: "===", left: "{{#size}}", right: undefined, result: undefined, then: "{{#size}}" }] },//DESC
            { key: "获取用户集合", fun: FLI.plug.mysql.getPageDataBySelect, args: ["account", "id,'' password,name,type,create_time", [{ field: "name", value: "{{#name}}", compareSymbol: "like" }, { field: "type", value: "{{#type}}" }, { field: "create_time", value: "{{#create_time}}", compareSymbol: "between" }], "{{~results.获取排序字段}} {{~results.获取正逆排序关键字}}", "{{~results.获取页码}}", "{{~results.获取单页总数}}"] },
            { key: "返回用户集合", fun: FLI.plug.http.responseEnd, args: ["{{~lastResult}}"] }
            //"('{{#orderProp}}'===(undefined||'undefined')?'createtime':'{{#orderProp}}')+({{#orderAsc}}===true?' ASC':' DESC')", "{{#current}}"
        ],
        export: {
            fileName: "用户清单",
            fields: [
                { key: "name", caption: '账号ID', field_type: 'string' },
                { key: "type", caption: '属性', field_type: 'int', dic: [{ value: 0, text: "超级管理员" }, { value: 1, text: "管理员" }] },
                { key: "create_time", caption: '添加时间', field_type: 'date' }],
            beforeExport: { fun: FLI.plug.business.verifyExportPwd, args: ["{{#pwd}}"] },
            log: { main_type: "导出", child_type: "用户列表" }
        }
    },

    //日志审计
    "getLogList": {
        filters: [FLI.plug.commonFilter.authenticationManage],
        routerOperate: [
            { key: "获取排序字段", fun: FLI.plug.expression.ask, args: [{ symbol: "===", left: "{{#orderProp}}", right: undefined, result: "create_time", then: "{{#orderProp}}" }] },//create_time
            { key: "获取正逆排序关键字", fun: FLI.plug.expression.ask, args: [{ symbol: "===", left: "{{#orderAsc}}", right: true, result: "ASC", then: "DESC" }] },//DESC
            { key: "获取页码", fun: FLI.plug.expression.ask, args: [{ symbol: "===", left: "{{#current}}", right: undefined, result: undefined, then: "{{#current}}" }] },//DESC
            { key: "获取单页总数", fun: FLI.plug.expression.ask, args: [{ symbol: "===", left: "{{#size}}", right: undefined, result: undefined, then: "{{#size}}" }] },//DESC
            { key: "获取日志集合", fun: FLI.plug.mysql.getPageDataBySelect, args: ["log", "*", [{ field: "main_type", value: "{{#main_type}}", compareSymbol: "=" }, { field: "child_type", value: "{{#child_type}}", compareSymbol: "=" }, { field: "create_time", value: "{{#create_time}}", compareSymbol: "between" }, { field: "ip", value: "{{#ip}}", compareSymbol: "like" }, { field: "login_name", value: "{{#login_name}}", compareSymbol: "like" }], "{{~results.获取排序字段}} {{~results.获取正逆排序关键字}}", "{{~results.获取页码}}", "{{~results.获取单页总数}}"] },
            { key: "返回日志集合", fun: FLI.plug.http.responseEnd, args: ["{{~lastResult}}"] }
        ]
    },

    //新增/编辑用户
    "addUser": {
        filters: [FLI.plug.commonFilter.authenticationManage, "{{#name}}"]
        ,
        routerOperate: [
            { key: "获取当前时间", fun: FLI.plug.date.getFormat, args: ["YYYY-MM-DD HH:mm:ss"] },
            { key: "密码复杂度校验", args: ["{{#password}}"], showError: { error_code: ERROR_CODE.ERROR_BAD_PASSWORD, error_msg: "密码必须包括长度8位以上，包含字母、数字及特殊符号" } },
            { key: "修改密码新旧密码一致性校验", args: ["{{#name}}", "{{#old_password}}", "{{#password}}"], showError: { error_code: ERROR_CODE.ERROR_BAD_PASSWORD, error_msg: "原密码不正确" } },
            { key: "获取密码加密", fun: FLI.plug.encrypt.encode, args: ["{{#password}}", CONFIG.server_salt] },
            { key: "添加用户", fun: FLI.plug.mysql.insert, args: ["account", { id: "{{#id}}", name: "{{#name}}", password: "{{~lastResult}}", type: "{{#type}}", create_time: "{{~results.获取当前时间}}" }, { keyName: "id", isEmptyNotUpdateed: "password", emptyValue: "79c515fffba583982cdba9c4033fb544" }] }
        ]
        // FLI.plug.vm2.convertToVM2Code("moment(new Date()).format('YYYY-MM-DD');", {}, ["moment"])
    },

    //删除
    "delUser": {
        filters: ["{{#id}}"]
        ,
        routerOperate: [
            { key: "删除用户", fun: FLI.plug.mysql.delete, args: ["account", { id: "{{#id}}" }] }
        ]
    }
}
