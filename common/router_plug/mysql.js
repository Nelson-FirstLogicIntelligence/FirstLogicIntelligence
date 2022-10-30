'use strict'
const ERROR_CODE = require('../../config/error_code.json')
const mysql = require('mysql');
const config = require('../../config/config')
const configYFI = require('./config')
const format = require('string-format')
const { v4: uuidv4 } = require('uuid');
const encrypt = require('./encrypt')
format.extend(String.prototype)
var moment = require('moment');

class Mysql {
    constructor() {
        this.pool = mysql.createPool({
            host: config.database.HOST,
            port: config.database.PORT,
            user: config.database.USERNAME,
            password: config.database.PASSWORD,
            database: config.database.DATABASE,
            charset: 'UTF8MB4_GENERAL_CI'
        });
    }

    /**  通用插入/更新操作
     * tableName 表名
     * keyValues 数据键值对
     * option 可选项
     *  keyName ID键名，用来新增的时候如果ID为空则自动给生成guid
     *  isEmptyNotUpdateed 为空不更新项，多个用逗号隔开
    */
    insert(tableName, keyValues, option) {
        var fieldNames = [];
        var fieldValues = [];
        var fieldParams = [];
        var updateSQL = "";
        mySQL.encryptKeyValueProcess(keyValues)
        if (option) {
            if (option.keyName && !keyValues[option.keyName]) {
                keyValues[option.keyName] = uuidv4();
            }
            if (option.isEmptyNotUpdateed) {
                var emptyNotUpdateed = option.isEmptyNotUpdateed.split(",");
                var emptyValue = option.emptyValue ? option.emptyValue : "";
                for (var notUpdatedIndex = 0; notUpdatedIndex < emptyNotUpdateed.length; notUpdatedIndex++) {
                    if (keyValues[emptyNotUpdateed[notUpdatedIndex]] === emptyValue) {
                        delete keyValues[emptyNotUpdateed[notUpdatedIndex]];
                    }
                }
            }
        }
        for (var fieldName in keyValues) {
            fieldNames.push(fieldName);
            fieldValues.push(keyValues[fieldName]);
            fieldParams.push('?');
            updateSQL += fieldName + "=?,"
        }
        if (updateSQL.length > 0) {
            updateSQL = updateSQL.substring(0, updateSQL.length - 1);
            fieldValues = fieldValues.concat(fieldValues);
        }
        return new Promise((resolve, reject) => {
            mySQL.pool.query('INSERT INTO {0} ({1}) values({2}) ON DUPLICATE KEY UPDATE {3}'.format(tableName, fieldNames.toString(), fieldParams.toString(), updateSQL), fieldValues, (error, results) => {
                if (error) {
                    reject(error)
                } else {
                    resolve({ code: 0 })
                }
            })
        })
    }

    //通用删除操作
    async delete(tableName, keyValues) {
        var fieldValues = [];
        var where = "";
        var keyIndex = 0;
        mySQL.encryptKeyValueProcess(keyValues)
        for (var fieldName in keyValues) {
            fieldValues.push(keyValues[fieldName]);
            if (keyIndex == 0) {
                where += fieldName + " = ?";
            }
            else {
                where += " and " + fieldName + " = ?";
            }
            keyIndex++;
        }
        return new Promise((resolve, reject) => {
            mySQL.pool.query('DELETE FROM {0} WHERE {1}'.format(tableName, where), fieldValues, (error, results) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(results)
                }
            })
        })
    }

    /**
     * 通用分页查询操作
     * @param {*} tableName 
     * @param {*} fields 
     * @param {*} keyValues 
     * @param {*} order 
     * @param {*} pageIndex 
     * @param {*} pageSize 
     * @returns 
     */
    async getPageDataBySelect(tableName, fields, keyValues, order, pageIndex, pageSize) {
        var data = await mySQL.select(tableName, fields, keyValues, order, pageIndex, pageSize);
        var count = await mySQL.select(tableName, "count(1) count", keyValues);
        if (count && count.length == 1) {
            var pageData = {
                code: 0,
                msg: "success",
                data: {
                    records: data,
                    total: count[0].count,
                    size: pageSize,
                    current: pageIndex
                }
            }
        }
        else {
            throw new Error("count error");
        }
        return pageData;
    }
    /**
     * 
     * @param {*} tableName 
     * @param {*} fields 
     * @param {*} keyValues 
     * @param {*} order 
     * @param {*} pageIndex 
     * @param {*} pageSize 
     * @returns 
     */
    async selectBySQL(SQL, fieldValues) {
        return new Promise((resolve, reject) => {
            mySQL.pool.query(SQL, fieldValues, (error, results) => {
                if (error) {
                    reject(error)
                } else {
                    mySQL.decryptFieldProcess(results);
                    resolve(results)
                }
            })
        })
    }

    /** 通用查询操作
     * demo:FLI.plug.mysql.select("user", "tel", { parent })
    */
    async select(tableName, fields, keyValues, order, pageIndex, pageSize) {
        var fieldValues = [];
        var where = "";
        var keyIndex = 0;
        var limit = "";
        var orderby = "";
        if (keyValues) {
            if (typeof keyValues === 'object' && keyValues.length && keyValues.length > 0) {
                mySQL.encryptKeyValuesProcess(keyValues)
                for (var index = 0; index < keyValues.length; index++) {
                    if (keyValues[index].value !== undefined && keyValues[index].value !== null) {
                        var compareSymbolWhere = "";
                        switch (keyValues[index].compareSymbol) {
                            case "like":
                                compareSymbolWhere = " LIKE '%" + keyValues[index].value + "%'";
                                break;
                            case "between":
                                if (keyValues[index].value.length && keyValues[index].value[0] && keyValues[index].value[1]) {
                                    var startDate = moment(keyValues[index].value[0]).format("YYYY-MM-DD");
                                    var endDate = moment(keyValues[index].value[1]).add(1, 'days').format("YYYY-MM-DD");
                                    compareSymbolWhere = " BETWEEN '" + startDate + "' AND '" + endDate + "'";
                                }
                                break;
                            case "judge null":
                                if (keyValues[index].value == 0) {
                                    compareSymbolWhere = " is null";
                                }
                                else if (keyValues[index].value == 1) {
                                    compareSymbolWhere = " is not null";
                                }
                                break;
                            case undefined:
                                fieldValues.push(keyValues[index].value);
                                compareSymbolWhere = " = ?";
                                break;
                            default:
                                fieldValues.push(keyValues[index].value);
                                compareSymbolWhere = " " + keyValues[index].compareSymbol + " ?";
                                break;
                        }
                        if (compareSymbolWhere) {
                            if (keyIndex == 0) {
                                where += " WHERE ";
                            }
                            else {
                                where += " AND ";
                            }
                            where += keyValues[index].field + compareSymbolWhere;
                        }
                        keyIndex++;
                    }
                }
            }
            else {
                throw new Error("keyValues is not correct," + JSON.stringify(keyValues));
            }
        }
        if (pageIndex !== undefined && pageSize !== undefined) {
            limit += "LIMIT " + pageSize * (pageIndex - 1) + "," + pageSize;
        }
        if (order) {
            orderby = "ORDER BY " + order;
        }
        //tableName如果涉及join的转换
        if (typeof tableName == "object") {
            var _tableName = "";
            if (tableName.length && tableName.length > 0) {
                for (var tableName_index = 0; tableName_index < tableName.length; tableName_index++) {
                    if (tableName[tableName_index].table) {
                        if (tableName[tableName_index].join) {
                            _tableName += " " + tableName[tableName_index].join + " " + tableName[tableName_index].table + " " + (tableName[tableName_index].alias ? tableName[tableName_index].alias : "") + " on";
                            if (tableName[tableName_index].equal && tableName[tableName_index].equal.length && tableName[tableName_index].equal.length > 0) {
                                for (var join_index = 0; join_index < tableName[tableName_index].equal.length; join_index++) {
                                    var join_expression = tableName[tableName_index].equal[join_index];
                                    if (join_index == 0) {
                                        _tableName += " " + join_expression.left + " = " + join_expression.right;
                                    }
                                    else {
                                        _tableName += " and " + join_expression.left + " = " + join_expression.right;
                                    }
                                }
                            }
                        }
                        else {
                            _tableName += tableName[tableName_index].table + " " + (tableName[tableName_index].alias ? tableName[tableName_index].alias : "");
                        }
                    }
                }
            }
            else {
                throw new Error({ flag: "select-tableName", ex: "tableName数据不负责规范", tableName: tableName });
            }
            tableName = _tableName;
        }
        return new Promise((resolve, reject) => {
            mySQL.pool.query('SELECT {0} FROM {1} {2} {3} {4}'.format(fields, tableName, where, orderby, limit), fieldValues, (error, results) => {
                if (error) {
                    reject(error)
                } else {
                    mySQL.decryptFieldProcess(results);
                    resolve(results)
                }
            })
        })
    }

    //通用单条记录查询操作
    async seleteSingle(tableName, fields, keyValues) {
        var records = await mySQL.select(tableName, fields, keyValues);
        if (records && records.length == 1) {
            return records[0];
        }
        return false;
    }

    //通用存在操作
    async iExist(tableName, keyValues) {
        var records = await mySQL.select(tableName, 1, keyValues);
        if (records && records.length > 0) {
            return true;
        }
        return false;
    }

    //process insert/delete KeyValues
    encryptKeyValueProcess(keyValues) {
        if (configYFI.encryptField && configYFI.encryptField.length > 0) {
            for (var fieldName in keyValues) {
                if (configYFI.encryptField.includes(fieldName) && keyValues[fieldName]) {
                    keyValues[fieldName] = encrypt.encrypt(keyValues[fieldName]);
                }
            }
        }
    }

    //process where condition
    encryptKeyValuesProcess(keyValues) {
        if (configYFI.encryptField && configYFI.encryptField.length > 0) {
            for (var index = 0; index < keyValues.length; index++) {
                var actualFieldName = keyValues[index].field;
                //exist alias
                if (actualFieldName.indexOf(".") > -1) {
                    actualFieldName = actualFieldName.substring(actualFieldName.indexOf(".") + 1)
                }
                if (configYFI.encryptField.includes(actualFieldName) && keyValues[index].value) {
                    keyValues[index].value = encrypt.encrypt(keyValues[index].value);
                }
            }
        }
    }

    decryptFieldProcess(results) {
        if (configYFI.encryptField && configYFI.encryptField.length > 0) {
            for (var result_index = 0; result_index < results.length; result_index++) {
                var row = results[result_index]
                for (var column in row) {
                    if (configYFI.encryptField.includes(column) && row[column]) {
                        row[column] = encrypt.decrypt(row[column]);
                    }
                }
            }
        }
    }
}
const mySQL = new Mysql();
module.exports = mySQL;
