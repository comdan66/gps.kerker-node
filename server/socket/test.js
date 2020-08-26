/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = (app, SocketIO, sockets) => ({
  connection (socket) {
    // 通知所有連線更新線上人數
    SocketIO.sockets.emit('online', sockets.size)
  },
  disconnect () {
    // 通知所有連線更新線上人數
    SocketIO.sockets.emit('online', sockets.size)
  }
})
