/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */
module.exports = {
  up (db) {
    db = db.create('PostLog', '上傳紀錄')
    db.attr('id').int().unsigned().notNull().autoIncrement().comment('ID')

    db.attr('uuid').varchar(190).collate('utf8mb4_unicode_ci').notNull().comment('UUID')
    // db.attr('deviceId').int().unsigned().notNull().default(0).comment('Device ID')
    // db.attr('eventId').int().unsigned().notNull().default(0).comment('Event ID')

    db.attr('raw').longtext().notNull().comment('Raw Data')
    
    db.attr('updateAt').datetime().notNull().default('CURRENT_TIMESTAMP').on('update', 'CURRENT_TIMESTAMP').comment('更新時間')
    db.attr('createAt').datetime().notNull().default('CURRENT_TIMESTAMP').comment('新增時間')

    db.primaryKey('id')

    db.index(['deviceId', 'eventId'])

    return db
  },
  down: db => db.drop('PostLog')
}