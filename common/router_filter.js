/** 路由过滤器，比如身份验证，参数获取之类 */
const { promisify } = require("util");
const { readlink } = require('fs');
const { stringify } = require('querystring');
const ERROR_CODE = require('../config/error_code.json')
const routerBase = require('../common/router_base')
const commonFilter = require('../common/router_plug/commonFilter')

/****** 请求过来所有过滤器，如用户认证，参数空判断 
 * router.post('/modify-password', async (req, res, next) => {
    const routerFilter = [FLI.plug.commonFilter.authentication, "#name", { field: "#old", fun: FLI.plug.commonFilter.iEmpty }];
    FLI.plug.commonFilter.authentication(req, res, next, routerFilter);
}, async function (req, res, next) {
 * ******/
var routerFilter = {
    //执行所有过滤器
    execFilters: async (req, res, next, router_filter) => {
        // const result = { code: ERROR_CODE.ERROR_SUCCESS, errors: [] }
        for (var index = 0; index < router_filter.length; index++) {
            var verify_params_type = typeof router_filter[index];
            var error = {}
            switch (verify_params_type) {
                case "string":
                    //参数为空检查，简写
                    var field = routerBase.getConfigField(req, res, router_filter[index]);
                    var value = routerBase.getConfigValue(req, res, router_filter[index]);
                    error = await commonFilter.iEmpty(field, value);
                    break;
                case "function":
                    //某些固定方法验证，如用户身份
                    error = await router_filter[index](req, res);
                    break;
                case "object":
                    var fun = router_filter[index].fun;
                    var field = routerBase.getConfigField(req, res, router_filter[index].field);
                    var value = routerBase.getConfigValue(req, res, router_filter[index].field);
                    var argsAll = [field, value];
                    if (router_filter[index].args) {
                        var argsCopy = JSON.parse(JSON.stringify(router_filter[index].args));
                        if (typeof argsCopy === "object" && argsCopy.length > 0) {
                            //递归遍历所有参数 并 转换
                            argsCopy = routerBase.recursionJson(argsCopy, function (value) {
                                return routerBase.getConfigValue(req, res, value);
                            });
                        }
                        argsAll.push(argsCopy);
                    }
                    if (fun) {
                        error = await fun.apply(null, argsAll);
                    }
                    else {
                        //不存在参数过滤方法 直接按照为空处理
                        error = commonFilter.iEmpty(argsCopy);
                    }
                    break;
                default: break;
            }
            if (error) {
                // result.errors.push(error);
                res.end(JSON.stringify({ code: error.error_code }));
                return;
            }
        }
        // if (result.errors.length > 0) {
        //     result.code = ERROR_CODE.ERROR_PARAMETER;
        //     res.end(JSON.stringify(result));
        //     return;
        // }
        next();
    }
}

module.exports = routerFilter;