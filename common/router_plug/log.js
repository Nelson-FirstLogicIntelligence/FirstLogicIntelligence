/** 系统日志服务
 * 
*/
const ERROR_CODE = require('../../config/error_code.json')
const mysql = require('./mysql')
const user = require('./user')
const redis = require('redis');
const { promisify } = require("util");
const rds = redis.createClient();
const redisGetAsync = promisify(rds.get).bind(rds);
const date = require('./date')

var log = {
    /** 新增日志
     * 
     */
    addLog: async function (req, route, action, log_config) {
        var main_type = log_config.main_type || ""
        var child_type = log_config.child_type || ""
        var create_time = date.getFormat("YYYY-MM-DD HH:mm:ss")
        // 参数错误
        if (req.method == "POST") {
            token = req.headers.authorization
        }
        else if (req.method == "GET") {
            token = req.query["token"]
        }
        var login_name = ""
        if (token) {
            login_name = await redisGetAsync("token:" + token)
        }
        if (!login_name && action === "login") {
            login_name = req.body["name"]
        }
        if (!login_name) {
            login_name = req.session.login_name
        }
        var login_type = "back_end"
        var ip = req.headers['x-real-ip']
        if (ip) ip = ip.match(/\d+\.\d+\.\d+\.\d+/)
        if (ip && ip.length > 0) ip = ip[0]
        mysql.insert("log", { id: user.uuidv4(), main_type: main_type, child_type: child_type, create_time: create_time, ip: ip, login_name: login_name, login_type: login_type, action: action, route: route })
    }
}
module.exports = log;