/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */


module.exports = ({ output: { json }, params: { get: { id } } }, { env: { google: { keys } }, model: { Event, Signal } }) => {
  json({a: 12})
  // process.exit(1)
}