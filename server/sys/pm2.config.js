/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  apps : [
    {
      name: 'dev',
      
      script: '../Server.js',
      args: '-P',
      
      log_file: 'log/Server.log',
      
      watch: '../../',
      ignore_watch: 'log',

      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'production',
      script: '../Server.js',
      args: '-P',
      log_file: 'log/Server.log',
      max_memory_restart: '512M',
      instances: 4,

      cron_restart: '0 * * * *',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
