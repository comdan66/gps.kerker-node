/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

require('./sys/core/App')({
  data: {
    queue: null,
    sockets: ['live', 'test'],
    https: null,
    socketIO: new Map(),
  },
  methods: {
    router (info) {
      const dirs = (info.pathname === '' ? 'index' : info.pathname).split('/')
      const file = dirs.pop()
      const api  = this.exist('app', 'controller', info.method.toLowerCase(), ...dirs, file + '.js') || this.exist('app', 'controller', '404.js')
      try { return require(api).call(this, info, this) }
      catch (error) { return info.output.e500(error) }
    },
  },
  init () {
    this.queue = this.require('sys', 'core', 'Queue.js').create()
    
    this.queue.enqueue(next => next(process.stdout.write("\r\n" + '啟動伺服器 ' + "\n")))
    
    // 建立 Server
    this.queue.enqueue(next => this.server(
      info   => this.router(info),
      server => next(server, process.stdout.write(this.env.server.protocol + ' Server 完成' + "\n")),
      error  => this.error(error)))

    // 建立 socket
    this.sockets.forEach(name => this.queue.enqueue((next, server) => this.socket(name, server,
      socketIO => next(server, this.socketIO.set(name, socketIO), process.stdout.write('啟動 Web Socket Server ─ ' + name + ' 完成' + "\n")),
      error  => this.error(error))))

    this.queue.enqueue(next => next(process.stdout.write('完成啟動 ' + "\n")))

    this.queue.enqueue(next => next(process.stdout.write('開始記錄 ' + "\n")))
  }
})
