/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */
module.exports = {
  up (db) {
    db = db.create('Device', '裝置')
    db.attr('id').int().unsigned().notNull().autoIncrement().comment('ID')

    db.attr('name').varchar(190).collate('utf8mb4_unicode_ci').notNull().comment('標題')
    db.attr('token').varchar(190).collate('utf8mb4_unicode_ci').notNull().default('').comment('Token')
    db.attr('uuid').varchar(190).collate('utf8mb4_unicode_ci').notNull().comment('UUID')
    db.attr('system').enum('iOS', 'Andriod').collate('utf8mb4_unicode_ci').notNull().default('iOS').comment('平台')

    db.attr('updateAt').datetime().notNull().default('CURRENT_TIMESTAMP').on('update', 'CURRENT_TIMESTAMP').comment('更新時間')
    db.attr('createAt').datetime().notNull().default('CURRENT_TIMESTAMP').comment('新增時間')

    db.primaryKey('id')
    db.index(['uuid', 'system'])
    return db
  },
  down: db => db.drop('Device')
}