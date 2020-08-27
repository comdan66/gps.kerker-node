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
            up: migrate.up,
            down: migrate.down,
            title: file.groups.name,
            version: parseInt(file.groups.version, 10),
          }
        }).filter(t => t !== null)
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
    },
    todos (files, now, goal) {
      const todos = []

      if (now < goal)
        for (const file of files.sort((a, b) => a.version - b.version))
          now < file.version && file.version <= goal && todos.push({ func: migrate => file.up(migrate).execute(), title: file.title, version: file.version, goal: file.version, isUp: true })
      
      if (now > goal) {
        for (const file of files.sort((a, b) => b.version - a.version))
          now >= file.version && file.version > goal && todos.push({ func: migrate => file.down(migrate).execute(), title: file.title, version: file.version, goal: goal, isUp: false })
        
        for (let i = 0; i < todos.length - 1; i++)
          todos[i].goal = todos[i + 1].version
      }

      return todos
    }
  },
  init () {
    const { block: Block, cmd } = this.progress
    
    queue = this.requireOnce('lib', 'Queue.js').create()
    
    queue.enqueue(next => process.stdout.write("\n" + ' ' + this.xterm.color.yellow('【取得 Migration 版本】') + "\n") && next())

    queue.enqueue(next => Block('檢查 Migration Table 是否存在', cmd('Is Migration table exist?'))
      .doing(progress => this.db.query('show tables like "_Migration";')
        .then(tables => tables.length ? progress.success() : progress.failure('不存在'))
        .catch(error => progress.failure(null, error)))
      .go(next))

    queue.enqueue((next, exist) => exist ? next() : Block('建立 Migration Table', cmd('Create Migration table'))
      .doing(progress => this.db.query("CREATE TABLE `_Migration` (`id` int(11) unsigned NOT NULL AUTO_INCREMENT,`version` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '版本',`updateAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',`createAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '新增時間', PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;")
        .then(result => progress.success())
        .catch(error => progress.failure(null, error)))
      .go(next))

    queue.enqueue(next => Block('取得 Migration Table 資料', cmd('Get Migration table data'))
      .doing(progress => this.model._Migration.one()
        .then(migrate => migrate ? progress.result(migrate).success() : progress.result(migrate).failure('沒資料'))
        .catch(error => progress.failure(null, error)))
      .go(next))

    queue.enqueue((next, migrate) => migrate ? next(migrate) : Block('新增 Migration Table 資料', cmd('Insert Migration table data'))
      .doing(progress => this.model._Migration.create({ version: 0 })
        .then(result => progress.result(migrate).success())
        .catch(error => progress.failure(null, error)))
      .go(next))

    queue.enqueue((next, migrate) => migrate ? next(migrate) : Block('取得 Migration Table 資料', cmd('Get Migration table data'))
      .doing(progress => this.model._Migration.one()
        .then(migrate => migrate ? progress.result(migrate).success() : progress.failure('沒資料'))
        .catch(error => progress.failure(null, error)))
      .go(next))

    queue.enqueue((next, migrate) => migrate ? next(migrate) : this.error('錯誤，不該發生的異常！'))

    queue.enqueue((next, migrate) => Block('整理需執行 Migration 檔案', cmd('List Migration files'))
      .doing(progress => {
        const files = this.files()
        const refresh = this.getRefresh(process.argv.slice(2))
        const now = parseInt(migrate.version, 10)
        const top = files.length ? parseInt(files[files.length - 1].version, 10) : 0
        const goal  = parseInt(this.getVersion(process.argv.slice(2)) || (files[files.length - 1] && files[files.length - 1].version || 0), 10)
        const todos = refresh ? this.todos(files, now, 0).concat(this.todos(files, 0, top)) : this.todos(files, now, goal)
        progress.total(todos.length).result(migrate, todos).success()
      })
      .go(next))

    queue.enqueue((next, migrate, todos) => next(
      migrate,
      process.stdout.write("\n" + ' ' + this.xterm.color.yellow('【執行 Migration】') + "\n"),
      todos.forEach(todo => queue.enqueue((next, migrate) => Block('Migration ' + (todo.isUp ? this.xterm.color.cyan('更新', true) : this.xterm.color.red('調降', true)) + ' 至第 ' + this.xterm.color.gray(todo.goal, true) + ' 版', cmd('Migration ' + (todo.isUp ? 'up' : 'down') + ' to ' + todo.goal + ' version'), cmd('Migration version set ' + todo.goal))
        .doing(progress => todo.func(this.db.Migrate)
          .then(_ => migrate.save(migrate.version = todo.goal)
            .then(_ => progress.result(migrate).success())
            .catch(error => progress.failure(null, error)))
          .catch(error => progress.failure(null, error)))
        .go(next))),
      queue.enqueue(next => this.model._Migration.one()
        .then(migrate => process.stdout.write([,
          ' ' + this.xterm.color.yellow('【完成 Migration 更新】'),
          ' '.repeat(3) + '🎉  Yes! 已經完成版本更新！',
          ' '.repeat(3) + '⏰  啟動耗費時間' + this.xterm.color.gray('：').dim() + this.xterm.color.gray(this.during(), true),
          ' '.repeat(3) + '🚀  目前版本為' + this.xterm.color.gray('：').dim() + this.xterm.color.gray(migrate.version, true),,,
        ].join("\n")) && this.exit())
        .catch(this.error))))
  }
})
