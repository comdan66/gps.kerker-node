/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2019, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  status: 'Development', // Development, Testing, Staging, Production

  https: {
    domain: '',
    port: 8716,
    key: null,
    cert: null
  },

  mysql: {
    host: "",
    user: "",
    password: "",
    database: "",
    port: 3306,
    charset : 'utf8mb4', // 編碼格式
    waitForConnections : true, // 無可用連線時是否等待pool連線釋放(預設為true)
    connectionLimit : 10 // 連線池可建立的總連線數上限(預設最多為10個連線數)
  },

  s3: {
    domain: '',
    bucket: '',
    access: '',
    secret: '',
    prefix: null,
  }
}
