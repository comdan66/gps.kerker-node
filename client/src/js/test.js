/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

Load.init({
  data: {
    error: '',
    socket: null,
  },
  mounted () {
    this.socket = io.connect(SOCKET, { path: '/test', reconnection: false })

    this.socket.on('connect', _ => {
      console.error('connect');
      this.socket.emit('inited', 1)
    })
    
    this.socket.on('connect_error', _ => {
      console.error('connect_error');
    })

    this.socket.on('disconnect', _ => {
      console.error('disconnect');
    })
  },
  template: El.render(`
    main#app
      div#error => *if=error
        span => *text=error
      `)
})
