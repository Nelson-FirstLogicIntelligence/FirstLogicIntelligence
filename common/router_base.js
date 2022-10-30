const { VM } = require('vm2');
var vm = new VM({
    timeout: 1000,
    sandbox: {},
    require: {
        external: true
    }
});

module.exports = {
    //获取字段名称，目前只是用于返回展示名称用，没有实际运算操作
    getConfigField: function (req, res, field) {
        var rtnField = null;
        var reg = /(?<=\{\{).+(?=\}\})/g
        var keyWords = reg.exec(field);
        if (keyWords && keyWords.length == 1) {
            field = keyWords[0];
        }
        else {
            return field;
        }
        if (field) {
            var firstCharacter = field.substring(0, 1);
            // #开头表示post请求体参数
            // ~开头表示系统内置参数;如~user 用户信息 / ~lastResult 上一步骤执行返回的数据
            switch (firstCharacter) {
                case "#":
                    rtnField = field.substring(1);
                    break;
                case "~":
                    rtnField = field.substring(1);
                    break;
                default:
                    rtnField = field;
                    break;
            }
        }
        return rtnField;
    },
    getConfigValue: function (req, res, field) {
        var rtnValue = field;
        var iExpression = false;//是否表达式
        if (field) {
            //正则文档：https://www.cnblogs.com/deerchao/archive/2006/08/24/zhengzhe30fengzhongjiaocheng.html#introduction
            var reg = /(?<=\{\{).+?(?=\}\})/g
            var keyWords = field.match(reg);
            if (keyWords && keyWords.length > 0) {
                for (var index = 0; index < keyWords.length; index++) {
                    var value;
                    var keyword = keyWords[index];
                    var firstCharacter = keyword.substring(0, 1);//正则匹配，支持多个
                    // #开头表示post请求体参数
                    // ~开头表示系统内置参数;如~user 用户信息 / ~lastResult 上一步骤执行返回的数据
                    switch (firstCharacter) {
                        case "#":
                            value = req.body[keyword.substring(1)];
                            if (!value) {
                                var queryP = req.query[keyword.substring(1)];
                                if (queryP) {
                                    if ((queryP.substring(0, 1) == "[" || queryP.substring(0, 1) == "{") && (queryP.substring(queryP.length - 1) == "]" || queryP.substring(queryP.length - 1) == "}")) {
                                        try {
                                            value = JSON.parse(queryP);
                                        }
                                        catch (ex) {
                                            throw new Error({ flag: "getConfigValue", ex: ex, queryP: queryP });
                                        }
                                    }
                                    else {
                                        value = queryP;
                                    }
                                }
                            }
                            break;
                        case "~":
                            //获取第一个到 '.' 位置的参数名
                            var firstWords = keyword.substring(1, keyword.indexOf('.') > -1 ? keyword.indexOf('.') : keyword.length);
                            switch (firstWords) {
                                case "results":
                                    value = res.locals.variable;
                                    if (keyword.indexOf('.') > -1) {
                                        var keyLevels = keyword.split(".");
                                        for (var keyLevels_index = 1; keyLevels_index < keyLevels.length; keyLevels_index++) {
                                            var theLevelKeyWords = keyLevels[keyLevels_index];
                                            value = value[theLevelKeyWords];
                                        }
                                    }
                                    break;
                                case "lastResult":
                                    value = res.locals.variable.lastResult;
                                    if (keyword.indexOf('.') > -1) {
                                        var keyLevels = keyword.split(".");
                                        for (var keyLevels_index = 1; keyLevels_index < keyLevels.length; keyLevels_index++) {
                                            var theLevelKeyWords = keyLevels[keyLevels_index];
                                            value = value[theLevelKeyWords];
                                        }
                                    }
                                    break;
                                case "user":
                                    value = res.locals.user;
                                    if (keyword.indexOf('.') > -1) {
                                        var keyLevels = keyword.split(".");
                                        for (var keyLevels_index = 1; keyLevels_index < keyLevels.length; keyLevels_index++) {
                                            var theLevelKeyWords = keyLevels[keyLevels_index];
                                            value = value[theLevelKeyWords];
                                        }
                                    }
                                    break;
                                case "res":
                                    rtnValue = res;
                                    break;
                                case "req":
                                    value = req;
                                    break;
                                default: break;
                            }
                            break;
                        default:
                            value = keyword;
                            break;
                    }
                    //如果长度超出正则匹配的字符串，则必定是field是字符串，需要减掉头尾系统关键字符号{{}}
                    if (field.length - 4 > keyword.length) {
                        iExpression = true;
                        //----------------如果value是null会不会有问题????????????????待排查---------------------
                        field = field.replace("{{" + keyword + "}}", value);
                        rtnValue = field;
                    }
                    else {
                        rtnValue = value;
                    }
                }
            }
        }
        if (iExpression) {
            // rtnValue = vm.run(rtnValue);
            // rtnValue = vm.run("moment(new Date()).add(1, 'days').format('YYYY-MM-DD')");
        }
        return rtnValue;
    },
    recursionJson: function (jsons, deal_fun) {
        if (typeof jsons === "object" && jsons.length) {
            //array
            for (var index = 0; index < jsons.length; index++) {
                if (typeof jsons[index] === "string") {
                    jsons[index] = deal_fun(jsons[index]);
                }
                else if (typeof jsons[index] === "object") {
                    jsons[index] = this.recursionJson(jsons[index], deal_fun);
                }
            }
        }
        else if (typeof jsons === "object" && !jsons.length) {
            //key value
            for (var key in jsons) {
                if (typeof jsons[key] === "string") {
                    jsons[key] = deal_fun(jsons[key]);
                }
                else if (typeof jsons[key] === "object") {
                    jsons[key] = this.recursionJson(jsons[key], deal_fun);
                }
            }
        }
        else {
        }
        return jsons;
    }
};
