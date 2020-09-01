/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Block = function(...argvs) {
  return this instanceof Block
    ? this.actions(argvs)
    : new Block(...argvs)
}

Block.prototype.actions = function(actions) { return this._actions = actions, this }
Block.prototype.total = function(total) { return this._total = total, this }
Block.prototype.doing = function(doing) { return this._doing = doing, this }
Block.prototype.go = function(closure) {
  Progress.doing(...this._actions).total(this._total || 1)
  const results = []

  try {
    this._doing && this._doing({
      get counter () { Progress.do() },
      total (total) {
        return Progress.total(total), this
      },
      success (...argvs) {
        Progress.success(...argvs)
        closure && closure(...results, true)
      },
      failure (...argvs) {
        Progress.failure(...argvs)
        closure && closure(...results, false)
      },
      result (...argvs) { return results.push(...argvs), this }
    })
  } catch (e) {
    console.error('e', e)
    process.exit(1)
    Progress.failure()
    closure && closure(...results, false)
  }
}

const Progress = {
  index: 0,
  count: 0,
  lines: [],
  xterm: null,

  print: (...strs) => process.stdout.write("\r" + strs.join('')),

  error (...errors) {
    Progress.xterm
      ? errors.length && this.print("\n" + ' ' + Progress.xterm.color.red('【錯誤訊息】') + "\n" + errors.map(error => ' '.repeat(3) + Progress.xterm.color.purple('◉') + ' ' + (error instanceof Error ? error.stack : error) + "\n").join('') + "\n")
      : errors.length && this.print("\n" + ' ' + '【錯誤訊息】' + "\n" + errors.map(error => ' '.repeat(3) + '◉' + ' ' + (error instanceof Error ? error.stack : error) + "\n").join('') + "\n")

    process.emit('SIGINT')
  },
  doing (...actions) {
    return actions = actions.filter(action => action !== null), actions.length
      ? Progress.xterm
        ? (Progress.lines = actions.map((t, i) => '\x1b[K' + ' '.repeat(3 + (i ? 2 : i * 2)) + t.replace(/(^\s*)/g, '$1' + (i ? Progress.xterm.color.purple('↳').dim() : Progress.xterm.color.purple('◉')) + ' ')), this.print(Progress.lines.join("\n") + Progress.xterm.color.black('…', true).dim() + ' '))
        : (Progress.lines = actions.map((t, i) => ' '.repeat(3 + (i ? 2 : i * 2)) + t.replace(/(^\s*)/g, '$1' + (i ? '↳' : '◉') + ' ')), this.print(Progress.lines.join("\n") + '…' + ' '))
      : this.do(), this
  },
  do () {
    return Progress.index += 1, Progress.index > Progress.count && (Progress.index = Progress.count), this.percent(), this
  },
  percent(text) {
    const percent = _ => (_ = Progress.count ? Math.ceil(Progress.index * 100) / Progress.count : 100, _ = parseInt(_ <= 100 ? _ >= 0 ? _ : 0 : 100, 10), (_ < 100 ? _ < 10 ? '  ' + _ : ' ' + _ : _) + '%')

    const lines = [...Progress.lines]

    if (Progress.xterm)
      lines[0] += (Progress.count ? Progress.xterm.color.gray('(' + Progress.index + '/' + Progress.count + ')').dim() + ' ' + Progress.xterm.color.black('─', true).dim() + ' ' + percent() : '') + (text ? ' ' + Progress.xterm.color.black('─', true).dim() + ' ' + text : '')
    else
      lines[0] += (Progress.count ? '(' + Progress.index + '/' + Progress.count + ')' + ' ' + '─' + ' ' + percent() : '') + (text ? ' ' + '─' + ' ' + text : '')

    return this.print((lines.length > 1 ? Progress.xterm ? '\x1b[' + (lines.length - 1) + 'A' : "\n" : '') + "\r" + lines.join("\n")), this
  },
  clean() {
    return Progress.lines = [], Progress.index = 0, Progress.count = 0, this
  },
  total (total) {
    return Progress.count = total, Progress.index = 0, this.percent()
  },
  success (message = null) {
    return Progress.index = Progress.count,
      message = message === null ? '完成' : message,
      this.percent(Progress.xterm ? Progress.xterm.color.green(message) : message).clean(),
      this.print("\n"),
      this
  },
  failure (message = null, ...error) {
    return message = message === null ? '錯誤' : message,
      this.percent(Progress.xterm ? Progress.xterm.color.red(message) : message),
      this.print("\n"),
      error.length && this.error(...error),
      this
  },
  okla (message) {
    return this.success(message)
  },
  cmd (desc, action = null) {
    if (Progress.xterm)
      return Progress.xterm.color.gray(desc, true).dim() + (action !== null ? Progress.xterm.color.gray('：').dim() + Progress.xterm.color.gray(action, true).dim().italic() : '')
    else
      return desc + (action !== null ? '：' + action : '')
  },
  block: (...argvs) => {
    return Block(...argvs)
  }
}

module.exports = Progress
