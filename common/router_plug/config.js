module.exports = {
    //需要加密的字段配置，在存取时通过基础架构自动解密加密
    // device tel device_tel
    // device_event tel
    // user tel
    encryptField: ["tel", "device_tel", "parent"]
}