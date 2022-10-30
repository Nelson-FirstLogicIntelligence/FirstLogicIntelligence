'use strict'
var express = require('express');
var router = express.Router();
const ERROR_CODE = require('../config/error_code.json')
const { FLI } = require('../common/FirstLogicIntelligence')
var yfiRouter = FLI.createRouter(router, "manager");
const CONFIG = require('../config/config');
var svgCaptcha = require('svg-captcha');

function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
};

/** 生成登录验证码 */
router.get('/sign_captcha', async function (req, res, next) {
    var captcha = svgCaptcha.create({
        size: 4,// 验证码长度
        ignoreChars: '0o1i', // 验证码字符中排除 0o1i
        noise: 0, // 干扰线条的数量
        height: 38,
        color: '#0000CD',//ff0ff0
        background: '#F1F3F4',
        fontSize: 35,
        width: 90,
        url: '/captcha.png'
    });
    req.session.captcha = captcha.text;
    res.type('svg');
    res.status(200).send(captcha.data);
});

yfiRouter.action("login").operate("验证验证码").setFun(
    async function (req, captcha) {
        if (req && req.session && req.session.captcha && req.session.captcha.toUpperCase() == captcha.toUpperCase()) {
            return { code: ERROR_CODE.ERROR_SUCCESS };
        }
        else {
            return { code: ERROR_CODE.ERROR_CHECK_VERIFY_CODE, errors: [{ error_code: ERROR_CODE.ERROR_CHECK_VERIFY_CODE, error_msg: "验证码错误" }] };
        }
    }
)

yfiRouter.action("login").operate("账号是否存在及锁定").setFun(
    async function (req, user_name, password) {
        const wrongCountRedisKey = user_name + ":pwdWrongCount";
        //计算账号锁定
        var wrongCount = await FLI.plug.cache.get(wrongCountRedisKey);
        if (wrongCount && wrongCount >= 5) {
            return { code: ERROR_CODE.ERROR_PARAMETER, errors: [{ error_code: ERROR_CODE.ERROR_PARAMETER, error_msg: "密码连续输入错误5次，账号已经被锁定，请30分钟后重试" }] };
        }
        var iExist = await FLI.plug.mysql.iExist("account", [{ field: "name", value: user_name }, { field: "password", value: password }]);
        if (iExist === false) {
            if (wrongCount) {
                wrongCount++;
                if (wrongCount >= 5) {
                    FLI.plug.cache.set(wrongCountRedisKey, 0.5 * 3600, wrongCount);
                    return { code: ERROR_CODE.ERROR_PARAMETER, errors: [{ error_code: ERROR_CODE.ERROR_PARAMETER, error_msg: "密码连续输入错误5次，账号已经被锁定，请30分钟后重试" }] };
                }
            }
            else {
                wrongCount = 1;
            }
            FLI.plug.cache.set(wrongCountRedisKey, 0.5 * 3600, wrongCount);
            return { code: ERROR_CODE.ERROR_PARAMETER, errors: [{ error_code: ERROR_CODE.ERROR_PARAMETER, error_msg: "密码连续输入错误" + wrongCount + "次，连续5次错误账号将被锁定" }] };
        }
        FLI.plug.cache.remove(wrongCountRedisKey);
        req.session.login_name = user_name;
        return { code: ERROR_CODE.ERROR_SUCCESS };
    }
)

//密码复杂度校验
yfiRouter.action("addUser").operate("密码复杂度校验").setFun(
    async function (password) {
        //密码必须包括长度8位以上，包含字母、数字及特殊符号
        if (password) {
            var reg = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[~!@#$%^&*()_+`\-={}:";'<>?,.\/]).{8,64}$/;
            var keyWords = password.match(reg);
            if (keyWords && keyWords.length > 0) {
                return true;
            }
            else {
                return false;
            }
        }
        return true;
    }
)

yfiRouter.action("addUser").operate("修改密码新旧密码一致性校验").setFun(
    async function (user_name, old_password, password) {
        //原密码校验，只有新旧密码均填上时才需要校验
        if (old_password && password) {
            var encode_old_password = FLI.plug.encrypt.encode(old_password, CONFIG.server_salt)
            var iUserExist = await FLI.plug.mysql.iExist("account", [{ field: "name", value: user_name }, { field: "password", value: encode_old_password }])
            if (iUserExist === false) {
                return false;
            }
        }
        return true;
    }
)

module.exports = router;