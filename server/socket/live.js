/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = (app, SocketIO, sockets) => ({
  emitAll (id) {
    // this.sql(logs => SocketIO.sockets.emit('logs', logs))
    SocketIO.sockets.emit('aaa', 'sockets.size')
  },
  connection (socket) {
    // 通知所有連線更新線上人數
    socket.on('inited', _ => socket.emit('keys', app.env.google.keys))
    SocketIO.sockets.emit('online', sockets.size)
  },
  disconnect () {
    // 通知所有連線更新線上人數
    SocketIO.sockets.emit('online', sockets.size)
  }
})
