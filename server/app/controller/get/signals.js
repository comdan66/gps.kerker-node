/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const calcElapsed = sec => {
  if (sec === 0)
    return '瞬間…'

  const units = []
  const contitions = [{ base: 60, format: '秒' }, { base: 60, format: '分鐘' }, { base: 24, format: '小時' }, { base: 30, format: '天' }, { base: 12, format: '個月' }]

  for (const contition of contitions) {
    const dataUnit = sec % contition.base
    dataUnit == 0 || units.push(dataUnit + contition.format)
    sec = Math.floor(sec / contition.base)
    if (sec < 1) break
  }

  sec > 0 && units.push(sec + '年')
  units.length < 1 && units.push(sec + '秒')

  return units.reverse().join(' ')
}
module.exports = ({ output: { json }, params: { get: { id } } }, { env: { google: { keys } }, model: { Event, Signal } }) => {
  id
    ? Event.one(id)
      .then(event => event
        ? event.status == 'finished'
          ? Signal.all({ select: { latitude: 'lat', longitude: 'lng', horizontalAccuracy: 'acc', speed: 'speed', course: 'course', timeAt: 'timeAt' }, where: { raw: 'eventId = ? AND enable = ?', vals: [event.id, 'yes'] }, order: 'timeAt ASC' }, false)
            .then(signals => json({
              keys, event: {
                title: event.title,
                length: event.length,
                elapsed: calcElapsed(event.elapsed),
              },
              signals: signals.map(signal => ({
                lat: signal.lat,
                lng: signal.lng,
                acc: signal.acc,
                speed: isNaN(signal.speed) ? null : signal.speed * 3.6,
                course: signal.course,
                timeAt: signal.timeAt,
              }))
            }))
            .catch(error => json({ message: error.message }, 400))
          : json({ message: '此活動尚未完成！' }, 400)
        : json({ message: '此活動不存在！' }, 400))
      .catch(error => json({ message: error.message }, 400))
    : json({ message: '此活動不存在！' }, 404)
}