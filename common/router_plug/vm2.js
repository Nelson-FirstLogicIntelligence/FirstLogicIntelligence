/** vm2动态JavaScript执行类:https://github.com/patriksimek/vm2
 * 
 */

const ERROR_CODE = require('../../config/error_code.json')
// const { NodeVM } = require('vm2');
// const vm = new NodeVM({
//     require: {
//         external: true
//     }
// });

//后期考虑安全性问题还是要改成类，把关键方法隐藏起来
var vm2 = {
    /**
     * 转换可执行的js代码
     * @param {*} code 执行代码
     * @param {*} params 代码中参数变量 {key,value}
     * @param {*} requires 引用包 ["moment",""]
     * @returns 
     */
    convertToVM2Code: function (code, params, requires) {

    }
}
module.exports = vm2;