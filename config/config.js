'use strict'
var express = require('express');
var app = express();
const isDev = app.get('env') === 'production' ? false : true;
console.log({ isDev: isDev });
const config = {
    isDev: isDev,
    http_port: 8090,
    database: {
    },
    token_expire: 7 * 24 * 3600,
    // 管理后台密码加盐
    server_salt: "c781dc73b558cd5304ed9495b52d9791 - server-2021-06-21"
};
module.exports = config;