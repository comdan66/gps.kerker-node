/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

require('./core/App')({
  data: {
    title: '伺服器',
    queue: null,
    sockets: [
      { title:'LIVE', name: 'live' },
    ],
    https: null,
    socketIO: new Map(),
  },
  methods: {
    router (info) {
      const dirs = (info.pathname === '' ? 'index' : info.pathname).split('/')
      const file = dirs.pop()
      const api  = this[this.env.status == 'Production' ? 'requireOnce' : 'require']('app', 'controller', info.method.toLowerCase(), ...dirs, file + '.js') || this[this.env.status == 'Production' ? 'requireOnce' : 'require']('app', 'controller', '404.js')
      try { return api.call(this, info, this) }
      catch (error) { return info.output.e500(error) }
    },
  },
  init () {
    const { block: Block, cmd } = this.progress

    // 建立一組 Queue
    this.queue = this.requireOnce('core', 'Queue.js').create()
    
    // 標題
    this.queue.enqueue(next => process.stdout.write("\n" + ' ' + this.xterm.color.yellow('【開啟各項服務】') + "\n") && next())

    // 建立 https
    this.queue.enqueue(next => Block('建立 https 伺服器', cmd('時間', new Date()), cmd('網址', 'https://' + this.env.https.domain + ':' + this.env.https.port))
      .doing(progress => this.server('http', this.env.https,
        info  => this.router(info),
        https => progress.result(this.https = https).success(),
        error => progress.failure(null, error)))
      .go(next))

    // 建立 socket
    this.sockets.forEach(({ name }) => this.queue.enqueue((next, https) => Block('建立 socket 伺服器', cmd('時間', new Date()), cmd('路徑', '/' + name))
      .doing(progress => this.socket(name, https,
        socketIO => this.socketIO.set(name, socketIO) && progress.result(https).success(),
        error => progress.failure(null, error)))
      .go(next)))

    // 初始完成
    this.queue.enqueue(next => next(process.stdout.write([,
      ' ' + this.xterm.color.yellow('【完成伺服器啟動】'),
      ' '.repeat(3) + '🎉  Yes! 環境已經就緒惹！',
      ' '.repeat(3) + '⏰  啟動耗費時間' + this.xterm.color.gray('：').dim() + this.xterm.color.gray(this.during(), true),
      ' '.repeat(3) + '🔐  https 網址' + this.xterm.color.gray('：').dim() + this.xterm.color.blue('https://' + this.env.https.domain + ':' + this.env.https.port, true).italic().underline(),
      ' '.repeat(3) + '🚀  Socket 分別有' + this.xterm.color.gray('：').dim(),
      ...this.sockets.map(({ title, name }) => ' '.repeat(6) + this.xterm.color.purple('↳').dim() + ' ' + title + this.xterm.color.gray('：').dim() + this.xterm.color.purple('/' + name).italic().underline()),,
      ' ' + this.xterm.color.yellow('【以下為紀錄】'),,
      ].join("\n"))))
  }
})
