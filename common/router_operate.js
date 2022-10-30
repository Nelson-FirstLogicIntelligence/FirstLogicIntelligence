/** 路由操作相关*/
//为什么router_filter参数直接传递req, res以及所有项是因为参数过滤不涉及调用其他通用类，而逻辑处理经常会调用其他类库（甚至不是架构内置的类库），所以不便传递这些参数
const ERROR_CODE = require('../config/error_code.json')
const CONFIG = require('../config/config')
const routerBase = require('../common/router_base')
const { ifError } = require('assert')

//后期考虑安全性问题还是要改成类，把关键方法隐藏起来
var routerOperate = {
    execOperate: async (req, res, next, router_operate, action) => {
        res.locals.variable = {};//局部变量保存
        //--------------这里需要改成逐步执行，支持异步函数返回值顺序往下执行?????????????????????暂时不急，后面遇到再改
        //--------------改后考虑支持多个异步同时执行返回数据，这个目前看来有点难（逻辑上应该能解决），需要考虑如何与顺序执行排斥问题
        if (router_operate && router_operate.length && router_operate.length > 0) {
            return await execRouterOperateUnit(0);
            //递归执行单个路由单元
            async function execRouterOperateUnit(index) {
                try {
                    var fun = router_operate[index].fun;
                    var argsCopy = []
                    if (router_operate[index].args !== undefined) {
                        argsCopy = JSON.parse(JSON.stringify(router_operate[index].args));
                    }
                    if (typeof argsCopy === "object" && argsCopy.length > 0) {
                        //递归遍历所有参数 并 转换
                        argsCopy = routerBase.recursionJson(argsCopy, function (value) {
                            return routerBase.getConfigValue(req, res, value);
                        });
                    }

                    var result;
                    if (fun) {
                        var _this = null;
                        if (router_operate[index].this) {
                            _this = router_operate[index].this
                        }
                        if (router_operate[index].async) {
                            argsCopy.push(async function (_result) {
                                result = _result;
                                return next({ async: true })
                            });
                            await fun.apply(_this, argsCopy);
                            return { async: true }
                        }
                        else {
                            result = await fun.apply(_this, argsCopy);
                            if (CONFIG.isDev) {
                                console.log(action + ".routerOperate." + router_operate[index].key);
                                console.log(argsCopy);
                                console.log(result);
                            }
                            return next()
                        }
                    }
                    else {
                        console.error("执行函数不存在：" + JSON.stringify(router_operate[index]));
                    }
                    function next(async) {
                        if (async) {
                            res.end(JSON.stringify(result))
                            return;
                        }
                        //路由单元执行结果满足抛错条件
                        if (typeof router_operate[index].showError == "object" && router_operate[index].showError.error_code && router_operate[index].showError.error_msg) {
                            var condition = router_operate[index].showError.condition;
                            if (condition === undefined) {
                                condition = false;
                            }
                            if (condition === result || (condition === "non-existent" && !result)) {
                                result = {}
                                result.code = router_operate[index].showError.error_code;
                                result.errors = []
                                result.errors.push({ error_code: router_operate[index].showError.error_code, error_msg: router_operate[index].showError.error_msg })
                                return result;
                            }
                        }

                        //如果返回的结果中包含错误信息则直接抛错
                        if (result && typeof result == "object" && result.errors && result.errors.length && result.errors.length > 0) {
                            // result.code = result.code === undefined ? ERROR_CODE.ERROR_PARAMETER : result.code;
                            result.code = ERROR_CODE.ERROR_PARAMETER
                            return result;
                        }
                        //识别到直接返回信息
                        if (result && result.iEnd == true) {
                            delete result.iEnd;
                            return result;
                        }
                        res.locals.variable["_" + index] = result;
                        res.locals.variable.lastResult = result;
                        if (router_operate[index].key) {
                            //save fun result
                            res.locals.variable[router_operate[index].key] = result;
                        }
                        index++;
                        if (index < router_operate.length) {
                            return execRouterOperateUnit(index);
                        }
                        return result;
                    }
                }
                catch (ex) {
                    ex.code = ERROR_CODE.ERROR_PARAMETER;
                    return ex;
                }
            }
        }
    }
}

module.exports = routerOperate;