/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Xterm = function(text) {
  if (!(this instanceof Xterm)) return new Xterm(text)
  this.text = text
  this.codes = []
}

Xterm.enable = true

Xterm.prototype = { ...Xterm.prototype,
  toString () { return !Xterm.enable ? '' + this.text : this.codes.reduce((a, b) => b + a + '\x1b[0m', this.text) },
  bold () { return this.code('\x1b[1m') },
  dim () { return this.code('\x1b[2m') },
  italic () { return this.code('\x1b[3m') },
  underline () { return this.code('\x1b[4m') },
  blink () { return this.code('\x1b[5m') },
  inverted () { return this.code('\x1b[7m') },
  hidden () { return this.code('\x1b[8m') },
  code (code) { return this.codes.push(code), this },
  color (code) { return this.code('\x1b[38;5;' + code + 'm') },
  background (code) { return this.code('\x1b[48;5;' + code + 'm') },
}

Xterm.color = {
  black:   (text, light) => Xterm(text).color(light ?  8 : 0),
  red:     (text, light) => Xterm(text).color(light ?  9 : 1),
  green:   (text, light) => Xterm(text).color(light ? 10 : 2),
  yellow:  (text, light) => Xterm(text).color(light ? 11 : 3),
  blue:    (text, light) => Xterm(text).color(light ? 12 : 4),
  purple:  (text, light) => Xterm(text).color(light ? 13 : 5),
  cyan:    (text, light) => Xterm(text).color(light ? 14 : 6),
  gray:    (text, light) => Xterm(text).color(light ? 15 : 7),
}

Xterm.background = {
  black:   (text, light) => Xterm(text).background(light ?  8 : 0),
  red:     (text, light) => Xterm(text).background(light ?  9 : 1),
  green:   (text, light) => Xterm(text).background(light ? 10 : 2),
  yellow:  (text, light) => Xterm(text).background(light ? 11 : 3),
  blue:    (text, light) => Xterm(text).background(light ? 12 : 4),
  purple:  (text, light) => Xterm(text).background(light ? 13 : 5),
  cyan:    (text, light) => Xterm(text).background(light ? 14 : 6),
  gray:    (text, light) => Xterm(text).background(light ? 15 : 7),
}

module.exports = Xterm
