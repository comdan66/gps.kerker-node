/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = ({ output, params, request }, { db: DB }) => {

  const createSignals = object => DB.creates('Signal', object.event.signals.map(signal => ({...signal, eventId: object.event.id, deviceId: object.id })),
    results => output.json({ message: 'ok', deviceName: object.name, eventId: object.event.id, eventTitle: object.event.title }),
    error => output.json({ message: error.message }, 400))

  const createEvent = object => DB.create('Event', { deviceId: object.id, title: object.event.title },
    ({ insertId: id }) => (object.event.id = id, findEvent(object)),
    error => output.json({ message: error.message }, 400))

  const findEvent = object => DB.one('Event', object.event.id,
    event => event
      ? (object.event = { ...object.event, ...event }, createSignals(object))
      : createEvent(object),
    error => output.json({ message: error.message }, 400))

  const createDevice = object => DB.create('Device', { name: object.name, uuid: object.uuid, token: 'a', system: object.system },
    ({ insertId: id }) => (object.id = id, findDevice(object)),
    error => output.json({ message: error.message }, 400))

  const findDevice = object => DB.one('Device', { token: object.token, system: object.system },
    device => device
      ? (object = {...object, ...device}, findEvent(object))
      : createDevice(object),
    error => output.json({ message: error.message }, 400))

  findDevice(params.json)
}
