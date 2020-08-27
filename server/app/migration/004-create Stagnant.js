/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */
module.exports = {
  up (db) {
    db = db.create('Stagnant', '停滯')
    db.attr('id').int().unsigned().notNull().autoIncrement().comment('ID')

    db.attr('deviceId').int().unsigned().notNull().default(0).comment('Device ID')
    db.attr('eventId').int().unsigned().notNull().default(0).comment('Event ID')
    db.attr('signalId').int().unsigned().notNull().default(0).comment('Signal ID')

    db.attr('title').varchar(190).collate('utf8mb4_unicode_ci').notNull().default('').comment('標題')
    db.attr('latitude').decimal(8, 6).notNull().comment('緯度')
    db.attr('longitude').decimal(9, 6).notNull().comment('經度')

    db.attr('startAt').datetime().default(null).comment('開始時間')
    db.attr('endAt').datetime().default(null).comment('結束時間')
    db.attr('elapsed').int().unsigned().notNull().default(0).comment('停留多久，單位為秒')
    db.attr('enable').enum('yes', 'no').notNull().default('yes').collate('utf8mb4_unicode_ci').comment('是否採用，是、否')

    db.attr('updateAt').datetime().notNull().default('CURRENT_TIMESTAMP').on('update', 'CURRENT_TIMESTAMP').comment('更新時間')
    db.attr('createAt').datetime().notNull().default('CURRENT_TIMESTAMP').comment('新增時間')

    db.primaryKey('id')
    
    db.index(['signalId', 'enable'])

    return db
  },
  down: db => db.drop('Stagnant')
}