/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = ({ env, model: { Device, Event, Signal, PostLog } }, SocketIO, sockets) => ({
  signals (socket, id) {
    Event.one(id)
      .then(event => event
        ? event.status == 'finished'
          ? Signal.all({ select: { latitude: 'lat', longitude: 'lng', horizontalAccuracy: 'acc' }, where: { raw: 'eventId = ? AND enable = ?', vals: [event.id, 'yes'] }, order: 'timeAt ASC' }, false)
            .then(signals => socket.emit('signals', signals.map(signal => ({
              lat: signal.lat,
              lng: signal.lng,
              acc: signal.acc,
              speed: signal.speed,
              course: signal.course,
              timeAt: signal.timeAt,
            }))))
            .catch(error => socket.emit('displayError', error.message))
          : socket.emit('displayError', '此活動尚未完成！')
        : socket.emit('displayError', '此活動不存在！'))
      .catch(error => socket.emit('displayError', error.message))
  },
  fetch (id) {
    // this.signals(SocketIO.sockets, id)
  },
  connection (socket) {
    // 通知所有連線更新線上人數

    socket.on('inited', id => this.signals(socket, id))

    socket.on('mounted', _ => socket.emit('keys', env.google.keys))

    SocketIO.sockets.emit('online', sockets.size)
  },
  disconnect () {
    // 通知所有連線更新線上人數
    SocketIO.sockets.emit('online', sockets.size)
  }
})
