/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

require('./lib/App')({
  data: {
    title: 'Migration',
    queue: null,
  },
  methods: {
    files () {
      try {
        return this.fs.readdirSync(this.path('migration')).map(file => {
          file = /^(?<version>[0-9]+)\-(?<name>.*)\.js$/g.exec(file)
          if (file === null) return null
          const migrate = this.require('migration', file.groups.version + '-' + file.groups.name + '.js')

          if (!migrate) return null

          return {
            version: parseInt(file.groups.version, 10),
            title: file.groups.name,
            up: migrate.up,
            down: migrate.down,
          }
        }).filter(t => t !== null).sort((a, b) => a.version - b.version)
      } catch { return [] }
    },
    getVersion (argvs) {
      for(let i = 0; i < argvs.length; i++)
        if (['-V', '--version'].includes(argvs[i]))
          if (argvs[i + 1] !== undefined && argvs[i + 1][0] != '-' && argvs[i + 1] >= 0)
            return argvs[i + 1]
      return null
    },
    getRefresh (argvs) {
      for(let i = 0; i < argvs.length; i++)
        if (['-R', '--refresh'].includes(argvs[i]))
          return true
      return false
    }
  },
  init () {
    const pad0 = t => (t < 100 ? t < 10 ? '00' : '0' : '') + t
    const { block: Block, cmd } = this.progress

    this.queue = this.requireOnce('lib', 'Queue.js').create()

    this.queue.enqueue(next => process.stdout.write("\n" + ' ' + this.xterm.color.yellow('【取得 Migration 版本】') + "\n") && next())
    
    this.queue.enqueue(next => Block('檢查 Migration Table 是否存在', cmd('Is Migration table exist?'))
      .doing(progress => this.db.sql('show tables like "_Migration";')
        .catch(error => progress.failure(null, error))
        .execute(tables => tables.length ? progress.success() : progress.failure('不存在')))
      .go(next))

    this.queue.enqueue((next, status) => status ? next() : Block('建立 Migration Table', cmd('Create Migration table'))
      .doing(progress => this.db.sql("CREATE TABLE `_Migration` (`id` int(11) unsigned NOT NULL AUTO_INCREMENT,`version` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '版本',`updateAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',`createAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '新增時間', PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;")
        .catch(error => progress.failure(null, error))
        .execute(result => progress.success()))
      .go(next))
    
    this.queue.enqueue(next => Block('取得 Migration Table 資料', cmd('Get Migration Table'))
      .doing(progress => this.db.one('_Migration')
        .catch(error => progress.failure(null, error))
        .execute(migrate => migrate ? progress.result(migrate).success() : progress.failure('沒資料')))
      .go(next))

    this.queue.enqueue((next, migrate) => migrate ? next(migrate) : Block('新增 Migration Table 資料', cmd('Insert Migration table data'))
      .doing(progress => this.db.create('_Migration', { version: 0 })
        .catch(error => progress.failure(null, error))
        .execute(result => progress.success()))
      .go(_ => next()))
    
    this.queue.enqueue((next, migrate) => migrate ? next(migrate) : Block('取得 Migration Table 資料', cmd('Get Migration Table'))
      .doing(progress => this.db.one('_Migration')
        .catch(error => progress.failure(null, error))
        .execute(migrate => migrate ? progress.result(migrate).success() : progress.failure('沒資料')))
      .go(next))

    this.queue.enqueue((next, migrate) => migrate ? next(migrate) : this.error('錯誤，不該發生的異常！'))
    
    this.queue.enqueue((next, migrate) => {
      const files = this.files()
      const now   = parseInt(migrate.version, 10)
      const goal  = parseInt(this.getVersion(process.argv.slice(2)) || (files[files.length - 1] && files[files.length - 1].version || 0), 10)

      return goal <= now
        ? goal == now
          ? next()
          : next({ todos: files.filter(file => file.version <= now && file.version > goal).map(file => ({ ...file, do: file.down })).reverse(), isDown: -1 })
        : next({ todos: files.filter(file => file.version > now && file.version <= goal).map(file => ({ ...file, do: file.up })) })
    })

    this.queue.enqueue((next, { todos, isDown = 0 } = {}) => next(
      todos && todos.length && process.stdout.write("\n" + ' ' + this.xterm.color.yellow('【執行 Migration】') + "\n") && todos.forEach(todo => this.queue.enqueue(next => Block((isDown < 0 ? this.xterm.color.red('調降', true) : this.xterm.color.cyan('更新', true)) + '至第 ' + this.xterm.color.gray(pad0(todo.version + isDown), true) + ' 版', cmd('Migration up to ' + pad0(todo.version + isDown) + ' version'))
        .doing(progress => this.db.sql(todo.do(this.db.Migrate))
          .catch(error => progress.failure(null, error))
          .execute(_ => progress.success()))
        .go(_ => Block('Migration 版號更新至第 ' + this.xterm.color.gray(pad0(todo.version + isDown), true).bold() + ' 版', cmd('Migration version set ' + pad0(todo.version + isDown)))
          .doing(progress => this.db.update('_Migration', { version: todo.version + isDown }, { id: 1 })
            .catch(error => progress.failure(null, error))
            .execute(_ => progress.success()))
          .go(next)))),
      this.queue.enqueue(next => this.db.one('_Migration')
        .catch(error => this.error(error))
        .execute(migrate => process.stdout.write([,
          ' ' + this.xterm.color.yellow('【完成 Migration 更新】'),
          ' '.repeat(3) + '🎉  Yes! 已經完成版本更新！',
          ' '.repeat(3) + '⏰  啟動耗費時間' + this.xterm.color.gray('：').dim() + this.xterm.color.gray(this.during(), true),
          ' '.repeat(3) + '🚀  目前版本為' + this.xterm.color.gray('：').dim() + this.xterm.color.gray(pad0(migrate.version), true),,,
        ].join("\n")) && this.exit()))))
  }
})
