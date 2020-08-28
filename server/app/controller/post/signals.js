/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const calc = (aa, an, ba, bn) => {
  return aa = aa * (Math.PI / 180), an = an * (Math.PI / 180), ba = ba * (Math.PI / 180), bn = bn * (Math.PI / 180), (2 * Math.asin(Math.sqrt(Math.pow(Math.sin((aa - ba) / 2), 2) + Math.cos(aa) * Math.cos(ba) * Math.pow(Math.sin((an - bn) / 2), 2)))) * 6378137
}

module.exports = ({ output, params, request }, { socketIO: IO, db: DB, model: { Device, Event, Signal, PostLog } }) => {

  const response = _ => {
    const { device, event } = this

    const elapsed = Signal.all({
      select: ['timeAt'],
      order: 'id DESC',
      where: { raw: 'deviceId = ? AND eventId = ?', vals: [device.id, event.id] } }, false)

    const length = Signal.all({
      select: ['latitude', 'longitude'],
      order: 'id DESC',
      where: { raw: 'deviceId = ? AND eventId = ? AND enable = ?', vals: [device.id, event.id, 'yes'] } }, false)

    Promise.all([elapsed, length])
      .then(([elapsed, length]) => {
        elapsed = elapsed.map(signal => signal.timeAt).sort((a, b) => b - a)
        elapsed = elapsed.length > 1 ? elapsed.shift() - elapsed.pop() : 0
        event.elapsed = elapsed

        elapsed = []
        length.reduce((a, b) => (a && elapsed.push(calc(a.latitude, a.longitude, b.latitude, b.longitude)), b), null)
        event.length = Math.round(elapsed.reduce((a, b) => a + b, 0) / 1000 * 100) / 100

        event.save()
          .then(_ => output.json({ id: event.id, elapsed: event.elapsed, length: event.length }))
          .catch(error => output.json({ message: error.message }, 400))
      })
      .catch(error => output.json({ message: error.message }, 400))
  }

  const createSignals = object => Signal.creates(object.event.signals.map(signal => ({...signal, eventId: object.event.id, deviceId: object.id })))
    .then(response)
    .catch(error => output.json({ message: error.message }, 400))

  const createEvent = object => Event.create({ deviceId: object.id, title: object.event.title })
    .then(({ id }) => (object.event.id = id, findEvent(object)))
    .catch(error => output.json({ message: error.message }, 400))

  const findEvent = object => Event.one(object.event.id)
    .then(event => event
      ? (object.event = { ...object.event, ...event.attr }, createSignals(object, this.event = event))
      : createEvent(object))
    .catch(error => output.json({ message: error.message }, 400))

  const createDevice = object => Device.create({ name: object.name, uuid: object.uuid, system: object.system })
    .then(({ id }) => (object.id = id, findDevice(object)))
    .catch(error => output.json({ message: error.message }, 400))

  const findDevice = object => Device.one({ where: { raw: 'uuid = ? AND system = ?', vals: [object.uuid, object.system] } })
    .then(device => device
      ? (object = { ...object, ...device.attr }, findEvent(object, this.device = device))
      : createDevice(object))
    .catch(error => output.json({ message: error.message }, 400))

  findDevice(params.json)

  PostLog.create({
    uuid: params.json.uuid,
    raw: params.raw,
  })
  .then(_ => console.error('log ok'))
  .catch(e => console.error('log fail, msg：' + e.message))
}
