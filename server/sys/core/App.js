/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const URL = require('url')
const Path = require('path')
const FileSystem = require('fs')
const formidable = require('formidable')
const querystring = require('querystring')
const root = Path.resolve(__dirname, ('..' + Path.sep).repeat(2)) + Path.sep

let DB = null
let CORS = {}

const getContentType = request => {
  return request = (request && request.headers && request.headers['content-type'] || '').split(';').map(item => item.trim()).shift(), ['application/json', 'text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data'].includes(request)
    ? request
    : null
}

const parsePost = text => {
  try { return { ...querystring.decode(text) } }
  catch (e) { return null }
}

const outputJson = item => {
  if (Array.isArray(item))
    return item.map(outputJson)

  if (typeof item == 'object' && item instanceof DB)
    return typeof item.json == 'function'
      ? item.json()
      : item.attr

  if (typeof item == 'object' && item !== null)
    for (const key in item)
      item[key] = outputJson(item[key])

  return item
}

const parseJson = text => {
  try { return JSON.parse(text) }
  catch (e) { return null }
}

const outputLog = ({ content = '', status = 200, type = 'html', request: { headers, connection: { remoteAddress: ip } }, response, method, protocol, pathname, url: { query } }) => {
  if (typeof content == 'object' && content !== null)
    if (content.toString === undefined)
      content = JSON.stringify(content), type = 'json'
    else
      content = content.toString(), type = 'html'

  return response.writeHead(status, type == 'html'
      ? { 'Content-Type': 'text/html; charset=UTF-8', ...CORS }
      : { 'Content-Type': 'application/json; charset=UTF-8', ...CORS }),
    response.write('' + content),
    response.end(),
    process.stdout.write("\r" + [new Date(), status, ip, method, protocol, '/' + pathname, query, headers['user-agent'] || ''].join(' ─ ') + "\n")
}

const disableColor = (_ => {
  for (let argv of process.argv.slice(2))
    if (['-P', '--plain'].includes(argv))
      return true
  return false
})()

module.exports = function(instance) {
  const startAt = new Date().getTime()

  instance = {
    ...instance.data,
    ...instance.methods,
    model: {},

    path (...argvs)        { return root + argvs.join(Path.sep) },
    end ()                 { return this.db && this.db.close(), this },
    sigint ()              { return this.end(), process.exit(1), this },
    exit (code = 0)        { return this.end(), process.exit(code), this },
    error (...messages)    { return this.xterm ? messages.length && process.stdout.write("\r\n\n" + ' ' + this.xterm.color.red('【錯誤訊息】') + "\n" + messages.map(message => ' '.repeat(3) + this.xterm.color.purple('◉') + ' ' + (message instanceof Error ? message.stack : message) + "\n").join('') + "\n") : messages.length && process.stdout.write("\r\n\n" + ' ' + '【錯誤訊息】' + "\n" + messages.map(message => ' '.repeat(3) + '◉' + ' ' + (message instanceof Error ? message.stack : message) + "\n").join('') + "\n"), this.sigint(), this },
    requireOnce (...argvs) { try { return FileSystem.accessSync(argvs = this.path(...argvs), FileSystem.constants.R_OK), require(argvs) } catch (e) { return undefined } },
    require (...argvs)     { return delete require.cache[this.path(...argvs)], this.requireOnce(...argvs) },
    
    during () {
      const units = [], contitions = [{ base: 60, format: '秒' }, { base: 60, format: '分鐘' }, { base: 24, format: '小時' }, { base: 30, format: '天' }, { base: 12, format: '個月' }]
      let now = parseInt((new Date().getTime() - startAt) / 1000, 10), nowUnit = null

      if (now === 0)
        return '太快了…'

      for (var i in contitions)
        if (nowUnit = now % contitions[i].base, nowUnit == 0 || units.push(nowUnit + contitions[i].format), now = Math.floor(now / contitions[i].base), now < 1)
          break

      return now > 0 && units.push(now + ' 年'), units.length < 1 && units.push(now + ' 秒'), units.reverse().join(' ')
    },

    server (protocol, option, closure, success, failure) {
      const server = require(protocol).Server(protocol == 'https' ? option.option : undefined)
      server.on('error', failure)
      server.listen(option.port, _ => success(server))
      server.on('request', (request, response) => {
        const url      = URL.parse(request.url)
        const params   = { post: {}, file: {}, get: parsePost(url.query), raw: '', json: null }
        const method   = request.method.toUpperCase()
        const pathname = url.pathname.replace(/\/+/gm, '/').replace(/\/$|^\//gm, '')
        const info     = { request, response, method, protocol, pathname, params, url }
        const output   = {
          e500: error => outputLog({ content: '500 Internal Server Error！' + (this.env.status != 'Production' && error ? "\n\n" + (error instanceof Error ? error.stack : error) : ''), status: 500, type: 'html', ...info }),
          text: (content, status) => outputLog({ content, status, type: 'html', ...info }),
          html: (content, status) => outputLog({ content, status, type: 'html', ...info }),
          json: (obj, status) => { if (typeof obj == 'object' && obj !== null) outputLog({ content: JSON.stringify(outputJson(obj)), status, type: 'json', ...info }); else throw new Error('格式錯誤！') },
        }

        switch (getContentType(request)) {
          default: return closure && closure({ ...info, output })

          case 'application/json': case 'text/plain':
            const param = []
            request.on('data', chunk => param.push(chunk))
            return request.on('end', _ => closure
              ? closure({ ...info, output }, params.raw = Buffer.concat(param).toString('utf8'), params.json = parseJson(params.raw))
              : null)

          case 'application/x-www-form-urlencoded': case 'multipart/form-data':
            return formidable({ multiples: true }).parse(request, (error, fields, files) => closure
              ? error
                ? closure({ ...info, output })
                : closure({ ...info, output }, params.post = fields, params.file = files)
              : null);
        }
      })

      return this
    },
    socket (name, server, success, failure) {
      const file = name.replace(/^\/|\/$/gm, '').replace('/', Path.sep) + '.js'
      const socket = this.requireOnce('app', 'socket', file)

      if (!socket) return failure('載入 Socket「' + file + '」失敗'), this
      
      const SocketIO = require('socket.io').listen(server, { path: '/' + name })
      const sockets  = new Map()
      const setting  = socket(this, SocketIO, sockets)

      SocketIO.sockets.on('connection', socket => {
        sockets.set(socket, 1)
        setting.connection && setting.connection(socket)

        socket.on('disconnect', _ => {
          sockets.delete(socket)
          setting.disconnect && setting.disconnect(socket)
        })
      })

      return success(setting), this
    },

    init (app) {},

    ...instance,
  }

  delete instance.data
  delete instance.methods

  const methods = {}
  for (let key in instance)
    if (typeof instance[key] == 'function')
      methods[key] = instance[key], delete instance[key], Object.defineProperty(instance, key, { get: _ => methods[key].bind(instance), set: v => methods[key] = v })  

  // 載入顏色、Model、FileSystem Lib
  instance.xterm = instance.requireOnce('sys', 'core', 'Xterm.js')
  instance.db    = instance.requireOnce('sys', 'core', 'Model.js')
  instance.fs    = FileSystem

  // 環境設定
  instance.env   = instance.requireOnce('sys', 'env.js')

  // Lib 設定
  instance.progress = instance.requireOnce('sys', 'core', 'Progress.js')
  instance.xterm.enable = !disableColor
  instance.xterm && instance.xterm.enable && instance.progress && (instance.progress.xterm = instance.xterm)
  instance.env   || instance.error('找不到 env.js 檔案，請複製 env.example.js 內容並新增 env.js 檔案後再重試一次！')
  instance.db    || instance.error('Model 無法取得 Lib！')
  instance.db    && instance.env.mysql ? (instance.db.config = instance.env.mysql) : (instance.db = null)

  // 載入 Models
  instance.fs.readdirSync(instance.path('app', 'model', '')).filter(file => file.match(/\.js$/)).map(file => file.replace(/\.js$/gm, '')).forEach(model => instance.model[model] = instance.requireOnce('app', 'model', model + '.js'))
  instance.model._Migration = class _Migration extends instance.db.Model {}

  // 設定 https
  try {
    instance.env.https.option = { key: FileSystem.readFileSync(instance.env.status != 'Production' ? instance.path('sys', 'ssl', 'server.key') : instance.env.https.key), cert: FileSystem.readFileSync(instance.env.status != 'Production' ? instance.path('sys', 'ssl', 'server.crt') : instance.env.https.cert) }
    delete instance.env.https.key
    delete instance.env.https.cert
  } catch (e) {
    instance.error('https key、cert 讀取錯誤！', e)
  }

  // 定義時間格式
  process.env.TZ = 'Asia/Taipei'
  // 清除畫面
  instance.xterm.enable && process.stdout.write("\x1b[2J\x1b[0f")
  // 中斷時
  process.on('SIGINT', instance.sigint)
  
  // 修正原生 prototype
  const pad0 = t => (t < 10 ? '0' : '') + t
  Date.prototype.toString = function() { return this.format('Y-m-d H:i:s') }
  Date.prototype.format = function(format) {
    return format.replace('Y', this.getFullYear())
      .replace('m', pad0(this.getMonth() + 1))
      .replace('d', pad0(this.getDate()))
      .replace('H', pad0(this.getHours()))
      .replace('i', pad0(this.getMinutes()))
      .replace('s', pad0(this.getSeconds()))
  }

  // 標題
  instance.title && process.stdout.write("\n" + ' ' + instance.xterm.color.gray('§').dim() + ' ' + instance.xterm.color.gray(instance.title, true) + "\n")
  
  // 給予此檔案全域
  DB = instance.db
  CORS = instance.env.cors

  // 開始
  instance.init(this)
}
