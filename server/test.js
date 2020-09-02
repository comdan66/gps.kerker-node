/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

let a = "abcd"
a[1] = 'e'
let b = a.substr(0, 3)
console.error(a);
console.error(b);


// let a = []
//   setInterval(_ => {
//     a.push(_ => {})
//     console.error('=> ', process.memoryUsage().rss / 1024 / 1024);
//     console.error('   ', process.memoryUsage().heapTotal / 1024 / 1024);
//     console.error('   ', process.memoryUsage().heapUsed / 1024 / 1024);
//     console.error('   ', process.memoryUsage().external / 1024 / 1024);
//     console.error('   ');
//   }, 1 * 1000)
  
//   setInterval(_ => {
//     console.error('clean');
    
//     a = []
//   }, 10 * 1000)
