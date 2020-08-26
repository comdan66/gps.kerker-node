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
  try {
    this._doing && this._doing({
      get counter () { Progress.do() },
      total (total) {
        return Progress.total(total), this
      },
      success (...argvs) {
        Progress.success(...argvs)
        closure && closure(true, this._result)
      },
      failure (...argvs) {
        Progress.failure(...argvs)
        closure && closure(false, this._result)
      },
      result (result) { return this._result = result, this }
    })
  } catch (e) {
    console.error('e', e)
    process.exit(1)
    Progress.failure()
    closure && closure(false, this._result)
  }
}

const Progress = {
  index: 0,
  count: 0,
  lines: [],
  color: null,

  print: (...strs) => process.stdout.write("\r" + strs.join('')),

  error (...errors) {
    Progress.color
      ? errors.length && this.print("\n" + ' ' + Progress.color.red('【錯誤訊息】') + "\n" + errors.map(error => ' '.repeat(3) + Progress.color.purple('◉') + ' ' + (error instanceof Error ? error.stack : error) + "\n").join('') + "\n")
      : errors.length && this.print("\n" + ' ' + '【錯誤訊息】' + "\n" + errors.map(error => ' '.repeat(3) + '◉' + ' ' + (error instanceof Error ? error.stack : error) + "\n").join('') + "\n")

    process.emit('SIGINT')
  },
  doing (...actions) {
    return actions = actions.filter(action => action !== null), actions.length
      ? Progress.color
        ? (Progress.lines = actions.map((t, i) => '\x1b[K' + ' '.repeat(3 + (i ? 2 : i * 2)) + t.replace(/(^\s*)/g, '$1' + (i ? Progress.color.purple('↳').dim() : Progress.color.purple('◉')) + ' ')), this.print(Progress.lines.join("\n") + Progress.color.black('…', true).dim() + ' '))
        : (Progress.lines = actions.map((t, i) => '\x1b[K' + ' '.repeat(3 + (i ? 2 : i * 2)) + t.replace(/(^\s*)/g, '$1' + (i ? '↳' : '◉') + ' ')), this.print(Progress.lines.join("\n") + '…' + ' '))
      : this.do(), this
  },
  do () {
    return Progress.index += 1, Progress.index > Progress.count && (Progress.index = Progress.count), this.percent(), this
  },
  percent(text) {
    const percent = _ => {
      return _ = Progress.count ? Math.ceil(Progress.index * 100) / Progress.count : 100, _ = parseInt(_ <= 100 ? _ >= 0 ? _ : 0 : 100, 10), (_ < 100 ? _ < 10 ? '  ' + _ : ' ' + _ : _) + '%'
    }
    const lines = [...Progress.lines]

    if (Progress.color)
      lines[0] += Progress.color.gray('(' + Progress.index + '/' + Progress.count + ')').dim() + ' ' + Progress.color.black('─', true).dim() + ' ' + percent() + (text ? ' ' + Progress.color.black('─', true).dim() + ' ' + text : '')
    else
      lines[0] += '(' + Progress.index + '/' + Progress.count + ')' + ' ' + '─' + ' ' + percent() + (text ? ' ' + '─' + ' ' + text : '')

    return this.print((lines.length > 1 ? '\x1b[' + (lines.length - 1) + 'A' : '') + "\r" + lines.join("\n")), this
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
      this.percent(Progress.color ? Progress.color.green(message) : message).clean(),
      this.print("\n"),
      this
  },
  failure (message = null, ...error) {
    return message = message === null ? '錯誤' : message,
      this.percent(Progress.color ? Progress.color.red(message) : message),
      this.print("\n"),
      error.length && this.error(...error),
      this
  },
  okla (message) {
    return this.success(message)
  },
  cmd (desc, action = null) {
    if (Progress.color)
      return Progress.color.gray(desc, true).dim() + (action !== null ? Progress.color.gray('：').dim() + Progress.color.gray(action, true).dim().italic() : '')
    else
      return desc + (action !== null ? '：' + action : '')
  },
  block: (...argvs) => {
    return Block(...argvs)
  }
}

module.exports = Progress
