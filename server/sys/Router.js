/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Path = require('path')
const FileSystem = require('fs')

const Config = require(Path.lib + 'Config.js')

Path.api = Path.root + 'api' + Path.sep

const getGET = query => {
  query = query === null ? [] : query.split('&').filter(t => t !== '').map(t => t.split('=')).filter(t => t.length > 1).map(t => [t.shift(), t.join('=')])
  let gets = {}
  for (let i in query)
    gets[query[i].shift()] = query[i].shift()
  return gets
}

const Router = {
  index: 'index',
  notFound: '404',
  error (request, response, params, path, error) {
    response.writeHead(500, {'Content-Type': 'text/html; charset=UTF-8'})
    Config.val.env == 'Production'
      ? response.write("500 Erro!")
      : response.write("500 Erro! Message:" + error)
    response.end()
  },
  mapping (method, pathname, request, response, params) {
    pathname = pathname === '' ? this.index : pathname
    const dirs = pathname.split('/')
    const file = dirs.pop()

    params.gets = getGET(params.gets)

    try { params.json = JSON.parse(params.raw) }
    catch (e) { params.json = null }

    const api = Path.api + (dirs.length ? dirs.join(Path.sep) + Path.sep : '') + method + '-' + file + '.js'
    const notFound = Path.api + this.notFound + '.js'

    return FileSystem.promises.access(api, FileSystem.constants.R_OK)
      .then(_ => {
        if (Config.val.env != 'Production')
          delete require.cache[api]
        require(api)(request, response, params, pathname)
      })
      .catch(e => FileSystem.promises.access(notFound, FileSystem.constants.R_OK)
        .then(_ => {
          if (Config.val.env != 'Production')
            delete require.cache[notFound]
          require(notFound)(request, response, params, pathname, e.message)
        })
        .catch(_ => this.error(request, response, params, pathname, e.message)))
  }
}

module.exports = Router
