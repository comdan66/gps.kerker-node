/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

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
                elapsed: event.elapsed,
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