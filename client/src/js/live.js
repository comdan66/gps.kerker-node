/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

Load.init({
  data: {
    error: '',
    total: 0,
    gmap: null,
    default: {
      zoom: 16,
      lat: 24.998270,
      lng: 121.520158
    },
    // lastZoom: null,
    // socket: null,
    
    // devices: [],
    // device: null,

    // markers: [],
    // polylines: [],
    polyline: null,
    datas: []

    // speedsClick: false,

    // colors: ['#f5c801', '#fbbb03', '#fcab0a', '#fc9913', '#fb871d', '#fa7226', '#f95d30', '#f94739', '#f93748', '#f72b5e']
  },
  mounted () {
    this.socket = io.connect(SOCKET, { path: '/live', reconnection: false })

    this.socket.on('connect', _ => this.socket.emit('inited'))
    this.socket.on('online', total => this.total = total)
    this.socket.on('keys', keys => GoogleMap.init(keys, _ => {

      this.gmap = new google.maps.Map(
        this.$refs.map, {
          zoom: this.default.zoom,
          center: position(this.default),
          clickableIcons: false,
          disableDefaultUI: true,
          gestureHandling: 'greedy' })

        this.polyline = new google.maps.Polyline({ map: this.gmap, strokeColor: 'rgba(66, 133, 244, 1.00)', strokeWeight: 3 })
        this.polyline.setPath([].map(([a, b]) => new google.maps.LatLng(a, b)))

        // setInterval(_ => {
        //   const data = this.datas.shift()
        //   console.error(data.shift());
        //   const acc = data.shift() / 3

        //   const marker = Marker()
        //   marker.map = this.gmap
        //   marker.width = acc
        //   marker.height = acc
        //   marker.class = 'pp'
        //   marker.position = new google.maps.LatLng(data.shift(), data.shift())
          
        //   this.gmap.setCenter(marker.position)
        // }, 50)

    //     this.gmap.addListener('zoom_changed', _ => this.gmap.zoom !== this.lastZoom && this.fetchAll(false, this.lastZoom = this.gmap.zoom))
    //     this.gmap.addListener('click', e => console.error(e.latLng.lat() + ', ' + e.latLng.lng()))

    //     this.socket.on('logs', devices => {
    //       return this.devices = devices, this.device === null && this.devices.length
    //         ? this.fetchAll(this.device = this.devices[0])
    //         : this.fetchAll(false, this.device = this.devices.filter(device => device.id == this.device.id).shift())
    //     })

    }))
    this.socket.on('aaa', _ => {
      console.error(_);
    })
    this.socket.on('connect_error', _ => this.error = '連線失敗，請稍後再試！')
    this.socket.on('disconnect', _ => this.error = '已經斷線，請重新整理畫面！')

  },
  computed: {

  },
  methods: {
    
  },
  template: El.render(`
    main#app
      div#error => *if=error
        span => *text=error

      div#map => ref=map

      div#online => *text=total

      `)
})
