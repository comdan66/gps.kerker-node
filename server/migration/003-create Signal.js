/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */
module.exports = {
  up (db) {
    db = db.create('Signal', '訊號')
    db.attr('id').int().unsigned().notNull().autoIncrement().comment('ID')

    db.attr('deviceId').int().unsigned().notNull().default(0).comment('Device ID')
    db.attr('eventId').int().unsigned().notNull().default(0).comment('Event ID')

    db.attr('latitude').decimal(8, 6).notNull().comment('緯度')
    db.attr('longitude').decimal(9, 6).notNull().comment('經度')
    db.attr('altitude').decimal(10, 2).default(null).comment('海拔高度，單位為公尺')

    db.attr('horizontalAccuracy').decimal(10, 2).unsigned().default(null).comment('水平準度，單位為公尺')
    db.attr('verticalAccuracy').decimal(10, 2).unsigned().default(null).comment('垂直準度，單位為公尺')
    db.attr('speedAccuracy').decimal(10, 2).unsigned().default(null).comment('速度準度，單位為每秒公尺')
    db.attr('courseAccuracy').decimal(10, 2).unsigned().default(null).comment('方向準度，度為單位')

    db.attr('floor').tinyint(4).default(null).comment('樓層')
    db.attr('speed').decimal(5, 2).unsigned().default(null).comment('速度，單位為每秒公尺')
    db.attr('course').decimal(5, 2).unsigned().default(null).comment('方向，北 0，南 180，東 90，西 270')
    
    db.attr('batteryLevel').tinyint(4).unsigned().default(null).comment('GPS 裝置電量，0 ~ 100')
    db.attr('batteryStatus').enum('unknown', 'unplugged', 'charging', 'full').default(null).collate('utf8mb4_unicode_ci').comment('電池狀態，未知、放電、充電、飽電(插電中)')

    db.attr('timeAt').int().unsigned().notNull().comment('Unix Time，單位為秒')
    db.attr('enable').enum('yes', 'no').notNull().default('yes').collate('utf8mb4_unicode_ci').comment('是否採用，是、否')
    db.attr('memo').varchar(190).collate('utf8mb4_unicode_ci').notNull().default('').comment('備註')

    db.attr('updateAt').datetime().notNull().default('CURRENT_TIMESTAMP').on('update', 'CURRENT_TIMESTAMP').comment('更新時間')
    db.attr('createAt').datetime().notNull().default('CURRENT_TIMESTAMP').comment('新增時間')

    db.primaryKey('id')
    db.index(['eventId', 'enable'])

    return db
  },
  down: db => db.drop('Signal')
}