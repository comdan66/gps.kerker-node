/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

Load.init({
  data: {
    style: {
      color: 'rgba(120, 120, 120, 1.00);'
    },
    version: '5.2.0'
  },
  mounted () {
  },
  computed: {
  },
  methods: {
    date (format) {
      const pad0 = t => (t < 10 ? '0' : '') + t
      const date = new Date()
      return format.replace('Y', date.getFullYear())
        .replace('m', pad0(date.getMonth() + 1))
        .replace('d', pad0(date.getDate()))
        .replace('H', pad0(date.getHours()))
        .replace('i', pad0(date.getMinutes()))
        .replace('s', pad0(date.getSeconds()))
    }
  },
  template: El.render(`
    main#app
      h1 => *text='你好，世界！'
      div => :style=style
        span => *text='這是 '
        b    => *text='Ginkgo'
        span => *text='，你目前版本是 '
        b    => *text=version
      br
      span => *text=date('Y-m-d H:i:s')
      `)
})
