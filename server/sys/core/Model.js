/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

class DB {}

DB.pool = null
DB.config = null

const select = obj => {
  if (obj === undefined) return '*'
  
  if (typeof obj == 'string') return obj

  let select = []

  const isObj = obj => {
    let tmps = []
    for (let key in obj)
      tmps.push(key + ' AS ' + obj[key])
    return tmps
  }

  if (typeof obj == 'object' && !Array.isArray(obj))
    return isObj(obj).join(',')

  for (let token of obj)
    if (typeof token == 'string')
      select.push(token)
    else if (typeof token == 'object')
      select = select.concat(isObj(token))

  return select.join(',')
}
const order = obj => {
  if (typeof obj == 'string')
    return obj

  if (typeof obj == 'object' && Array.isArray(obj))
    return obj.join(',')

  let order = []
  for (let key in obj)
    order.push(key + ' ' + obj[key])

  return order.join(',')
}
const where = obj => {
  if (obj === undefined) return null

  isNaN(obj) || (obj = { raw: 'id = ?', vals: obj })
  const raws = []
  const vals = []

  if (typeof obj == 'string') return obj === '' ? null : { raw: obj, vals }
  if (typeof obj != 'object') return null


  Array.isArray(obj) || (obj = [obj])

  for (let { raw: r, vals: v } of obj) {
    raws.push(r)
    vals.push(...Array.isArray(v) ? v : [v])
  }

  return raws.length ? { raw: raws.join(' AND '), vals } : null
}
const query = option => {
  DB.pool.getConnection((error, connection) => {
    error
    ? option.reject && option.reject(error)
    : connection.query(option.sql, option.vals, (error, result) => connection.release(error
      ? option.reject && option.reject(error)
      : option.resolve && option.resolve(result)))
  })
}
const execute = option => {
  if (DB.config === null)
    return option.reject && option.reject(new Error('尚未設定 MySQL Config！'))

  if (DB.pool !== null)
    return query(option)
  
  for (const key of ['host', 'user', 'password', 'database'])
    if (DB.config[key] === undefined)
      return option.reject && option.reject(new Error('MySQL Config 格式有誤，缺少「' + key + '」設定值！'))

  const mysql = require('mysql')
  DB.pool = mysql.createPool(DB.config)

  return query(option)
}

class Model extends DB {
  constructor (cloumns) {
    super()

    this.attr  = {}
    this.dirty = {}

    for (let key in cloumns)
      this.attr[key] = cloumns[key], Object.defineProperty(this, key, {
        get: _ => this.attr[key],
        set: v => {
          this.attr[key] = v
          this.dirty[key] = v
        }
      })
  }

  async save () {
    return new Promise((resolve, reject) => Object.keys(this.dirty).length
      ? this.id === undefined
        ? reject(new Error('此物件沒有 ID'))
        : this.constructor.update(this.dirty, this.id)
          .then(result => resolve(result, this.dirty = {}))
          .catch(reject)
      : resolve(1))
  }

  async delete () {
    return this.id === undefined
      ? new Promise((_, reject) => reject(new Error('此物件沒有 ID')))
      : this.constructor.delete(this.id)
  }
}

DB.Model = Model
DB.close = _ => DB.pool && DB.pool.end()

DB.query = async (sql, vals) => new Promise((resolve, reject) => execute({ sql, vals, resolve, reject }))

DB.create = async function(table, object) {
  if (this !== DB) object = table, table = this
  let type = undefined
  if (typeof table == 'function') type = table, table = table.name
  
  const keys = []
  const vals = []

  object.updateAt === undefined && (object.updateAt = new Date())
  object.createAt === undefined && (object.createAt = new Date())

  for (let key in object)
    keys.push('`' + key + '`'), vals.push(object[key])

  const sql = "INSERT INTO `" + table + "`(" + keys.join(',') + ")VALUES(" + keys.map(_ => '?').join(',') + ");"
  return new Promise((resolve, reject) => execute({ sql, vals, resolve: ({ affectedRows, insertId }) => resolve(affectedRows == 1 && insertId != 0
    ? type
      ? new type({ ...object, id: insertId, })
      : object
    : undefined), reject }))
}

DB.all = async function(table, option, isType = true) {
  if (this !== DB) isType = option, option = table, table = this
  isType === undefined && (isType = true)
  
  let type = undefined
  if (typeof table == 'function') type = table, table = table.name
  if (type !== undefined && !isType) type = undefined

  isNaN(option) || (option = { where: option })
  option = option || {}

  const _where = where(option.where)
  const raws = ['SELECT', select(option.select), 'FROM', '`' + table + '`']
  const vals = []
  option.joinIn !== undefined && raws.push('INNER JOIN `' + option.joinIn.table + '` ON `' + option.joinIn.table + '`.`' + option.joinIn.primary + '`=`' + table + '`.`' + option.joinIn.foreign + '`')
  _where && (raws.push('WHERE ' + _where.raw), vals.push(..._where.vals))
  option.group  !== undefined && raws.push('GROUP BY ' + option.group)
  option.having !== undefined && raws.push('HAVING ' + option.having)
  option.order  !== undefined && raws.push('ORDER BY ' + order(option.order))

  const limit  = option.limit === undefined ? 0 : parseInt(option.limit, 10)
  const offset = option.offset === undefined ? 0 : parseInt(option.offset, 10)

  if (limit || offset) raws.push('LIMIT ' + offset + ',' + limit)

  return new Promise((resolve, reject) => execute({ sql: raws.join(' ') + ';', vals, resolve: results => resolve(type ? results.map(result => new type({ ...result })) : results.map(result => ({ ...result }))), reject }))
}

DB.one = async function(table, option, isType = true) {
  if (this !== DB) isType = option, option = table, table = this
  isNaN(option) || (option = { where: option })
  option = option || {}, option.limit = 1
  return (await DB.all(table, option, isType)).shift()
}

DB.delete = async function(table, option) {
  if (this !== DB) option = table, table = this
  if (typeof table == 'function') table = table.name

  isNaN(option) || (option = { where: option })
  option = option || {}
  option = { where: option.where, order: option.order, limit: option.limit }

  const raws = ['DELETE FROM `' + table + '`']
  const vals = []

  const _where = where(option.where)
  _where && (raws.push('WHERE ' + _where.raw), vals.push(..._where.vals))
  option.order !== undefined && raws.push('ORDER BY ' + order(option.order))
  option.limit !== undefined && raws.push('LIMIT ' + parseInt(option.limit, 10))
  
  return new Promise((resolve, reject) => execute({ sql: raws.join(' ') + ';', vals, resolve: ({ affectedRows }) => resolve(affectedRows), reject }))
}

DB.update = async function(table, object, option) {
  if (this !== DB) option = object, object = table, table = this
  if (typeof table == 'function') table = table.name

  isNaN(option) || (option = { where: option })
  option = option || {}
  option = { where: option.where, order: option.order, limit: option.limit }

  const raws = ['UPDATE `' + table + '`']
  const keys = []
  const vals = []

  object.updateAt === undefined && (object.updateAt = new Date())

  for (let key in object)
    keys.push('`' + key + '` = ?'), vals.push(object[key])

  raws.push('SET ' + keys.join(','))
  const _where = where(option.where)
  _where && (raws.push('WHERE ' + _where.raw), vals.push(..._where.vals))
  option.order !== undefined && raws.push('ORDER BY ' + order(option.order))
  option.limit !== undefined && raws.push('LIMIT ' + parseInt(option.limit, 10))

  return new Promise((resolve, reject) => keys.length ? execute({ sql: raws.join(' ') + ';', vals, resolve: ({ affectedRows }) => resolve(affectedRows), reject }) : reject(new Error('格式錯誤，至少需要一個欄位修改！')))
}

DB.creates = async function(table, objects, length = 10) {
  if (this !== DB) length = objects, objects = table, table = this
  if (!objects.length) return new Promise(resolve => resolve(0))

  isNaN(length) && (length = 10)
  let type = undefined
  if (typeof table == 'function') type = table, table = table.name
  
  objects.forEach(object => {
    object.updateAt === undefined && (object.updateAt = new Date())
    object.createAt === undefined && (object.createAt = new Date())  
  })

  const pages = []
  while(objects.length) 
    pages.push(objects.splice(0, length))

  return new Promise((resolve, reject) => Promise.all(pages.map(objects => new Promise((resolve, reject) => {
    const firstKeys = Object.keys(objects[0])
    const keys = firstKeys.map(key => '`' + key + '`')
    const vals = objects.map(object => firstKeys.map(key => object[key] === undefined ? null : object[key])).reduce((a, b) => a.concat(b), [])
    const sql = "INSERT INTO `" + table + "`(" + keys.join(',') + ")VALUES" + objects.map(_ => '(' + keys.map(_ => '?').join(',') + ')').join(',') + ';'
    execute({ sql, vals, resolve: ({ affectedRows }) => resolve(affectedRows), reject })
  }))).then(results => resolve(results.reduce((a, b) => a + b, 0))).catch(reject))
}

// Migrate

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
  async execute () {
    return new Promise((resolve, reject) => execute({ sql: 'CREATE TABLE `' + this.table + '` (' + this.attrs.join(',') + ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' + (this.comment ? " COMMENT='" + this.comment + "'" : '') + ";", vals: [], resolve, reject }))
  },

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
const MigrateTruncate = function(table) {
  if (!(this instanceof MigrateTruncate)) return new MigrateTruncate(table)
  else this.table = table
}
const MigrateInserts = function(table, objects, length = 100) {
  if (!(this instanceof MigrateInserts)) return new MigrateInserts(table, objects, length)
  else this.table = table, this.objects = objects, this.length = length
}

MigrateDrop.prototype.execute     = async function() { return new Promise((resolve, reject) => execute({ sql: 'DROP TABLE IF EXISTS `' + this.table + '`;', vals: [], resolve, reject })) }
MigrateTruncate.prototype.execute = async function() { return new Promise((resolve, reject) => execute({ sql: 'TRUNCATE TABLE `' + this.table + '`;', vals: [], resolve, reject })) }
MigrateInserts.prototype.execute  = async function() { return DB.creates(this.table, this.objects, this.length) }

DB.Migrate = {
  create: (table, comment) => MigrateCreate(table, comment),
  drop: table => MigrateDrop(table),
  truncate: table => MigrateTruncate(table),
  inserts: (table, objects, length) => MigrateInserts(table, objects, length),
}

module.exports = DB
