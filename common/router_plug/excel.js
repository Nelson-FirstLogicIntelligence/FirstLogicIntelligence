/** 
 * excel相关处理
 * ref:https://github.com/functionscope/Node-Excel-Export
 * ref:https://cloud.tencent.com/developer/article/1653844
*/
const ERROR_CODE = require('../../config/error_code.json')
var excelExport = require('excel-export');
var yfiDate = require('./date')
const routerBase = require('../../common/router_base')
const log = require('./log')

//后期考虑安全性问题还是要改成类，把关键方法隐藏起来
var excel = {
    /**
     * 路由插件
     */
    $newRouterFlag: {
        actionKeyName: "export",
        actionType: "get",//get请求
        actionName: "{{~actionName}}" + "-export",
        // params: ["routerOperate"],
        /**
         * 
         * @param {action配置} action_config 
         * @param {执行routerOperate返回的数据} operate_result 
         */
        exec: async function (req, res, action_config, operate_result, route_name, action) {
            try {
                if (action_config && action_config.export && action_config.export.beforeExport) {
                    var argsCopy = []
                    if (action_config.export.beforeExport.args !== undefined) {
                        argsCopy = JSON.parse(JSON.stringify(action_config.export.beforeExport.args));
                    }
                    if (typeof argsCopy === "object" && argsCopy.length > 0) {
                        //递归遍历所有参数 并 转换
                        argsCopy = routerBase.recursionJson(argsCopy, function (value) {
                            return routerBase.getConfigValue(req, res, value);
                        });
                    }
                    var beforeExportResult = await action_config.export.beforeExport.fun.apply(null, argsCopy);
                    if (beforeExportResult && beforeExportResult.code !== ERROR_CODE.ERROR_SUCCESS && beforeExportResult.errors && beforeExportResult.errors.length > 0) {
                        res.end(beforeExportResult.errors[0].error_msg)
                        return;
                    }
                }
                var keyConifg = action_config.export;
                let conf = {};
                let fileName = keyConifg.fileName;
                conf.name = "sheet1";//这里标识在excel底部的表名
                conf.cols = keyConifg.fields;
                conf.rows = [];
                if (conf.cols && conf.cols.length) {
                    conf.cols.forEach(col => {
                        col.type = "string";
                        switch (col.field_type) {
                            case "int":
                                (function (col) {
                                    col.beforeCellWrite = function (row, cellData) {
                                        if (col.dic && col.dic.length && col.dic.length > 0) {
                                            col.dic.forEach(dic => {
                                                if (dic.value == cellData) {
                                                    cellData = dic.text;
                                                }
                                            })
                                        }
                                        return cellData;
                                    }
                                })(col)
                                break;
                            case "date":
                                (function (col) {
                                    col.beforeCellWrite = function (row, cellData) {
                                        if (cellData) {
                                            cellData = yfiDate.getFormatByDate(cellData, "YYYY-MM-DD");
                                        }
                                        return cellData;
                                    }
                                })(col)
                                break;
                            case "datetime":
                                (function (col) {
                                    col.beforeCellWrite = function (row, cellData) {
                                        if (cellData) {
                                            cellData = yfiDate.getFormatByDate(cellData, "YYYY-MM-DD HH:mm:ss");
                                        }
                                        return cellData;
                                    }
                                })(col)
                                break;
                            default: break;
                        }
                    })
                }
                if (operate_result && operate_result.data && operate_result.data.records && operate_result.data.records.length) {
                    // ['one', '2020-11-12', "1", 3.14]
                    operate_result.data.records.forEach(record => {
                        var row = [];
                        if (conf.cols && conf.cols.length) {
                            conf.cols.forEach(col => {
                                row.push(record[col.key]);
                            })
                        }
                        conf.rows.push(row);
                    });
                }
                if (action_config && action_config.export && action_config.export.log) {
                    await log.addLog(req, route_name, action, action_config.export.log);
                }
                excel.export(res, conf.cols, conf.rows, fileName);
            }
            catch (ex) {
                throw new Error({ flag: "excel.exec", msg: ex });
            }
        }
    },
    /**
     * 只支持get请求直接返回文件流
     * @param {列头定义} fields 
     * @param {数据} data 
     * @param {文件名，不含后缀} file_name 
     * @param {excel内容表头名，可空} title 
     */
    export: function (res, fields, data, file_name, title) {
        try {
            let conf = {};
            let fileName = file_name;
            title = title || "sheet1";
            conf.name = title;//这里标识在excel底部的表名
            if (fields && fields.length && fields.length > 0) {
                conf.cols = fields;
                conf.rows = data;
                let result = excelExport.execute(conf);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats;charset=utf-8');
                res.setHeader("Content-Disposition", "attachment; filename=" + encodeURIComponent(fileName) + ".xls");//中文名需要进行url转码
                res.setTimeout(30 * 60 * 1000)//防止网络原因造成超时。
                res.end(result, 'binary')
            }
            else {
                throw new Error({ flag: "excel.export", msg: "列头定义错误", fields });
            }
        }
        catch (ex) {
            throw new Error({ flag: "excel.export", msg: ex });
        }
    }
}
module.exports = excel;