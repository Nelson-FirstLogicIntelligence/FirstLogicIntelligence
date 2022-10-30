/** 日期相关处理
 * 
*/
const ERROR_CODE = require('../../config/error_code.json')
var moment = require('moment');

//后期考虑安全性问题还是要改成类，把关键方法隐藏起来
var date = {
    /** 获取日期
     * format 格式化字符串 YYYY-MM-DD HH:mm:ss
     * add 加减时间 1/-1/-2
     * addType 加减时间类型 day/hour
     */
    getFormat: function (format, add, addType) {
        var m = new moment(new Date());
        if (add !== undefined && addType !== undefined) {
            m.add(add, addType);
        }
        return m.format(format);
    },
    /** 获取日期
     * date —— Date 类型
     */
    getFormatByDate: function (date, format, add, addType) {
        var m = new moment(date);
        if (add !== undefined && addType !== undefined) {
            m.add(add, addType);
        }
        return m.format(format);
    },
    moment: moment
}
module.exports = date;