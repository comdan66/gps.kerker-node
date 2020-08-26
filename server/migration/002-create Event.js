/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */
module.exports = {
  up (db) {
    db = db.create('Event', '活動')
    db.attr('id').int().unsigned().notNull().autoIncrement().comment('ID')
    
    db.attr('deviceId').int().unsigned().notNull().default(0).comment('Device ID')
    
    db.attr('title').varchar(190).collate('utf8mb4_unicode_ci').notNull().comment('標題')
    db.attr('length').decimal(7, 2).default(0).comment('長度，單位為公里')
    db.attr('elapsed').int().unsigned().notNull().default(0).comment('耗時，單位為秒')
    db.attr('status').enum('moving', 'finished', 'error').notNull().default('moving').collate('utf8mb4_unicode_ci').comment('狀態')

    db.attr('updateAt').datetime().notNull().default('CURRENT_TIMESTAMP').on('update', 'CURRENT_TIMESTAMP').comment('更新時間')
    db.attr('createAt').datetime().notNull().default('CURRENT_TIMESTAMP').comment('新增時間')

    db.primaryKey('id')
    db.index(['deviceId', 'enable'])

    return db
  },
  down: db => db.drop('Event')
}