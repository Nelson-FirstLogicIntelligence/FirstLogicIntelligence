/** HTTP路由单元
 * 提供HTTP协议相关逻辑
*/
const ERROR_CODE = require('../../config/error_code.json')
const crypto = require('crypto')
const config = require('../../config/config')

//后期考虑安全性问题还是要改成类，把关键方法隐藏起来
var encrypt = {
    /** 
     * md5不可逆加密
     */
    encode: function (encrypt_str, salt) {
        salt = salt ? salt : "";
        const md5 = crypto.createHash('md5');
        const enc_password = md5.update(encrypt_str + salt).digest('hex');
        return enc_password;
    },
    encrypt: function (text) {
        var iv = Buffer.from("c781dc73b558cd53")
        const cipher = crypto.createCipheriv("aes-256-ctr", "vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3", iv);
        const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
        return encrypted.toString('hex');
    },
    decrypt: function (hash) {
        const decipher = crypto.createDecipheriv("aes-256-ctr", "vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3", Buffer.from("c781dc73b558cd53"));
        const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash, 'hex')), decipher.final()]);
        return decrpyted.toString();
    }
}
module.exports = encrypt;