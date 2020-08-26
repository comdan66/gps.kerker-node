/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const insert = obj => {
  let keys = [], values = []

  for (let i in obj) {
    keys.push('`' + i + '`')
    values.push(obj[i] !== null ? "'" + obj[i] + "'" : 'NULL')
  }

  return { keys, values }
}

const update = obj => {
  let sets = []

  for (let i in obj)
    sets.push('`' + i + '`=' + (obj[i] !== null ? "'" + obj[i] + "'" : 'NULL'))

  return sets
}

const order = (table, obj) => {
  if (typeof obj == 'string')
    return obj

  if (typeof obj == 'object' && Array.isArray(obj))
    return obj.join(',')

  let order = []
  for (let key in obj)
    order.push(key + ' ' + obj[key])

  return order.join(',')
}

const select = (table, obj) => {
  if (typeof obj == 'string')
    return obj

  let select = []

  const isObj = obj => {
    let tmps = []
    for (let key in obj)
      tmps.push(key + ' AS ' + obj[key])
    return tmps
  }

  if (typeof obj == 'object' && !Array.isArray(obj))
    return isObj(obj).join(',')

  for (let key in obj)
    if (typeof obj[key] == 'string')
      select.push(obj[key])
    else if (typeof obj[key] == 'object')
      select = select.concat(isObj(obj[key]))

  return select.join(',')
}

const where = (table, obj) => {
  if (typeof obj == 'string')
    return obj

  const wheres = []
  for (let key in obj)
    wheres.push((key.indexOf('.') == -1 ? '`' + table + '`.`' + key + '`' : key) + (
      Array.isArray(obj[key])
        ? ' ' + obj[key].shift() + ' ' + obj[key].shift()
        : (' = ' + "'" + obj[key] + "'")))

  return wheres.join(' AND ')
}

const DB = function(sql, execute, error, isOne = false) {
  if (!(this instanceof DB)) return new DB(sql, execute, error, isOne)
  this.conn = null
  this._sql = sql
  this.error = null
  this.isOne = isOne

  error && this.catch(result => error(result))
  execute && this.execute(result => execute(result))
}

DB.prototype = {...DB.prototype, 
  catch (error) { return this.error = error, this },
  modify (modify) { return this._modify = modify, this },
  promise (func) { return new Promise((resolve, reject) => this.catch(reject).execute(result => resolve(func ? func(result) : result))) },
  execute (result) {
    if (DB.config === null) return this.error && this.error(new Error('尚未設定 MySQL Config！'))
    if (typeof DB.config.host == 'undefined' || typeof DB.config.user == 'undefined' || typeof DB.config.password == 'undefined' || typeof DB.config.database == 'undefined') return this.error && this.error(new Error('MySQL Config 格式有誤！'))

    const execute = result => DB.pool.getConnection((error, connection) => error
      ? this.error && this.error(error)
      : connection.query('' + this._sql, (error, res) => connection.release(error
        ? this.error && this.error(error)
        : result && result(this._modify ? this._modify(Array.isArray(res) && this.isOne === true ? res.shift() : res) : (Array.isArray(res) && this.isOne === true ? res.shift() : res)))))

    if (DB.pool !== null) return execute(result)

    const mysql = require('mysql')
    DB.pool = mysql.createPool(DB.config);
    execute(result)
  }
}

DB.pool = null
DB.config = null

DB.close = _ => DB.pool && DB.pool.end()
DB.update = (table, obj, w, execute, error) => { return DB.sql('UPDATE `' + table + '` SET ' + update(obj) + (w ? ' WHERE ' + where(table, w) : ''), execute, error) }
DB.delete = (table, w, execute, error) => { return DB.sql('DELETE FROM `' + table + '` WHERE ' + where(table, w), execute, error) }
DB.create = (table, obj, execute, error) => {
  const { keys, values } = insert(obj)
  return DB.sql("INSERT INTO `" + table + "`(" + keys.join(',') + ")VALUES(" + values.join(',') + ")", execute, error)
}
DB.creates = (table, objs, execute, error) => {
  const inserts = MigrateInserts(table, objs)

  Promise.all(inserts.sqls().map(sql => new Promise((resolve, reject) => DB.sql(sql, resolve, reject))))
    .catch(error)
    .then(execute)
}
DB.all = (table, option, execute, error, isOne = false) => {
  if (typeof option == 'function') isOne = !!error, error = execute, execute = option, option = {}
  isNaN(option) || (option = { where: { id: option } })
  option = option || {}

  const strs = ['SELECT', typeof option.select == 'undefined' ? '*' : select(table, option.select), 'FROM', '`' + table + '`']
  typeof option.joinIn != 'undefined' && strs.push('INNER JOIN `' + option.joinIn.table + '` ON `' + option.joinIn.table + '`.`' + option.joinIn.primary + '`=`' + table + '`.`' + option.joinIn.foreign + '`')
  typeof option.where != 'undefined'  && strs.push('WHERE ' + where(table, option.where))
  typeof option.group != 'undefined'  && strs.push('GROUP BY ' + option.group)
  typeof option.having != 'undefined' && strs.push('HAVING ' + option.having)
  typeof option.order != 'undefined'  && strs.push('ORDER BY ' + order(table, option.order))

  const limit  = typeof option.limit == 'undefined' ? 0 : parseInt(option.limit, 10)
  const offset = typeof option.offset == 'undefined' ? 0 : parseInt(option.offset, 10)

  if (limit || offset) strs.push('LIMIT ' + offset + ',' + limit)
  return DB.sql(strs.join(' '), execute, error, isOne)
}
DB.one = (table, option, execute, error) => { return isNaN(option) || (option = { where: { id: option } }), option = option || {}, option.limit = 1, DB.all(table, option, execute, error, true) }
DB.sql = (sql, execute, error, isOne = false) => DB(sql, execute, error, isOne)

const MigrateCreateAttr = function(name) {
  if (!(this instanceof MigrateCreateAttr)) return new MigrateCreateAttr(name)
  else this.tokens = ['`' + name + '`'], this._comment = null
}

MigrateCreateAttr.prototype = {...MigrateCreateAttr.prototype, 
  toString () { return this.tokens.join(' ') + (this._comment !== null ? ' COMMENT ' + "'" + this._comment + "'" : '') },
  val: val => val !== null ? val != 'CURRENT_TIMESTAMP' ? "'" + val + "'" : 'CURRENT_TIMESTAMP' : 'NULL',
  int (length) { return this.tokens.push('int(' + (!isNaN(length) ? length : 10) + ')'), this },
  tinyint (length) { return this.tokens.push('tinyint(' + (!isNaN(length) ? length : 10) + ')'), this },
  varchar (length) { return this.tokens.push('varchar(' + (!isNaN(length) ? length : 190) + ')'), this },
  enum (...items) { return this.tokens.push('enum(' + items.map(item => "'" + item + "'").join(',') + ')'), this },
  text () { return this.tokens.push('text'), this },
  decimal (maximum, digits) { return this.tokens.push('decimal(' + maximum + ',' + digits + ')'), this },
  datetime () { return this.tokens.push('datetime'), this },
  collate (code) { return this.tokens.push('COLLATE ' + code), this },
  notNull () { return this.tokens.push('NOT NULL'), this },
  comment (text) { return this._comment = text, this },
  autoIncrement () { return this.tokens.push('AUTO_INCREMENT'), this },
  unsigned () { return this.tokens.push('unsigned'), this },
  default (val) { return this.tokens.push('DEFAULT ' + this.val(val)), this },
  on (action, val) { return this.tokens.push('ON ' + action.toUpperCase() + ' ' + this.val(val)), this },
}

const MigrateCreate = function(table, comment) {
  if (!(this instanceof MigrateCreate)) return new MigrateCreate(table, comment)
  else this.table = table, this.comment = comment, this.attrs = [], this.columns = {}
}

MigrateCreate.prototype = {...MigrateCreate.prototype,
  toString () { return 'CREATE TABLE `' + this.table + '` (' + this.attrs.join(',') + ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' + (this.comment ? " COMMENT='" + this.comment + "'" : '') + ";" },
  primaryKey (column) { return typeof this.columns[column] == 'undefined' || this.attrs.push('PRIMARY KEY (`' + column + '`)'), this },
  index (columns, name) {
    columns = columns.filter(column => typeof this.columns[column] != 'undefined')
    return columns.length && this.attrs.push('KEY `' + (name === undefined || name === '' ? columns.join('_') : name) + '` (' + columns.map(column => '`' + column + '`').join(',') + ')'), this
  },
  attr (name, comment) {
    const attr = MigrateCreateAttr(name)
    comment === undefined || attr.comment(comment)
    return this.attrs.push(attr), this.columns[name] = attr, attr
  }
}

const MigrateDrop = function(table) {
  if (!(this instanceof MigrateDrop)) return new MigrateDrop(table)
  else this.table = table
}
MigrateDrop.prototype.toString = function() { return 'DROP TABLE IF EXISTS `' + this.table + '`;' }

const MigrateTruncate = function(table) {
  if (!(this instanceof MigrateTruncate)) return new MigrateTruncate(table)
  else this.table = table
}
MigrateTruncate.prototype.toString = function() { return 'TRUNCATE TABLE `' + this.table + '`;' }

const MigrateInserts = function(table, datas, length) {
  if (!(this instanceof MigrateInserts)) return new MigrateInserts(table, datas, length)
  else this.table = table, this.datas = datas, this.length = length || 100
}

MigrateInserts.prototype.sqls = function() {
  
  if (!this.datas.length) return []
  
  const firstKeys = []
  for (let key in this.datas[0])
    firstKeys.push(key)

  if (!firstKeys.length) return []

  const tmps = []
  for (let data of this.datas) {
    const tmp = {}
    for (let key of firstKeys)
      tmp[key] = data[key] === undefined ? null : data[key]
    tmps.push(tmp)
  }

  if (!tmps.length) return []
  
  const datas = tmps.map(insert)
  const keys = datas[0].keys
  let valuess = datas.map(data => '(' + data.values.join(',') + ')')
  sqls = []

  for (let i = 0; i < valuess.length; i += this.length)
    sqls.push("INSERT INTO `" + this.table + "`(" + keys.join(',') + ")VALUES" + valuess.splice(0, this.length).join(','))
  return sqls
}

MigrateInserts.prototype.toString = function() {
  return this.sqls().join(';')
}

DB.Migrate = {
  create: (table, comment) => MigrateCreate(table, comment),
  drop: table => MigrateDrop(table),
  inserts: (table, datas) => MigrateInserts(table, datas),
  truncate: table => MigrateTruncate(table),
}

module.exports = DB
