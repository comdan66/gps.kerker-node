/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = ({ env }, SocketIO, sockets) => ({
  connection (socket) {
    socket.on('inited', id => {
      console.error(id);
    })

    SocketIO.sockets.emit('online', sockets.size)
  },
  disconnect () {
    SocketIO.sockets.emit('online', sockets.size)
  }
})
