/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

Load.init({
  data: {
    error: '',
    gmap: null,
    default: {
      zoom: 16,
      lat: 24.998270,
      lng: 121.520158
    },
    title: '',
    elapsed: '',
    speed: 0,
    polyline: null,
    signals: [],
    length: 0,
    colors: [
      '#f5c801', // 0~9
      '#fbbb03', // 10~19
      '#fcab0a', // 20~29
      '#fc9913', // 30~39
      '#fb871d', // 40~49
      '#fa7226', // 50~59
      '#f95d30', // 60~69
      '#f94739', // 70~79
      '#f93748', // 80~89
      '#f72b5e'] // 90~99
  },
  mounted () {
    Params({ id: null }, true)

    if (Params.id === null)
      return window.location.replace('/', this.error = '此活動不存在！')

    $.get(API + 'signals', { id: Params.id })
      .then(({ keys, event: { title, length, elapsed }, signals }) => GoogleMap.init(keys, _ => {
        this.initMap()
        this.initPolyline()

        const positions = signals.map(({ lat, lng }) => new google.maps.LatLng(lat, lng))
        this.polyline.setPath(positions)

        const bounds = new google.maps.LatLngBounds()
        positions.forEach(signal => bounds.extend(signal))
        bounds.isEmpty() || this.gmap.fitBounds(bounds)

        this.length = length
        this.title = title
        this.elapsed = this.calcElapsed(elapsed)

        const speeds = signals.map(signal => signal.speed).filter(speed => speed !== null && speed >= 0)
        this.speed = Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length * 100) / 100
        
        this.start(signals)
      }))
      .fail(e => e.status && e.status == 400
        ? this.error = e.responseJSON && e.responseJSON.message || '不明原因錯誤！'
        : window.location.replace('/', this.error = '此活動不存在！'))
  },
  computed: {
    nowSpeed () {
      const length = this.signals.length
      return length ? Math.round(this.signals[this.signals.length - 1].speed) : null
    },
    nowLength () {
      if (!this.signals.length) return 0
      const lengths = []
      this.signals.reduce((a, b) => (a && lengths.push(this.calcLength(a.lat, a.lng, b.lat, b.lng)), b), null)
      return Math.round(lengths.reduce((a, b) => a + b, 0) / 1000 * 100) / 100
    }
  },
  methods: {
    initMap () {
      this.gmap = new google.maps.Map(
        this.$refs.map, {
          zoom: this.default.zoom,
          center: position(this.default),
          clickableIcons: false,
          disableDefaultUI: true,
          gestureHandling: 'greedy' })
      this.gmap.mapTypes.set('ms', new google.maps.StyledMapType([{stylers: [{gamma: 0}, {weight: 0.75}] }, {featureType: 'all', stylers: [{ visibility: 'on' }]}, {featureType: 'administrative', stylers: [{ visibility: 'on' }]}, {featureType: 'landscape', stylers: [{ visibility: 'on' }]}, {featureType: 'poi', stylers: [{ visibility: 'on' }]}, {featureType: 'road', stylers: [{ visibility: 'simplified' }]}, {featureType: 'road.arterial', stylers: [{ visibility: 'on' }]}, {featureType: 'transit', stylers: [{ visibility: 'on' }]}, {featureType: 'water', stylers: [{ color: '#b3d1ff', visibility: 'on' }]}, {elementType: "labels.icon", stylers:[{ visibility: 'off' }]}]));
      this.gmap.setMapTypeId('ms');
    },
    initPolyline () {
      this.polyline || (this.polyline = new google.maps.Polyline({ map: this.gmap, strokeColor: 'rgba(27, 183, 31, 1.00)', strokeWeight: 2 }))
    },
    calcElapsed: sec => {
      if (sec === 0)
        return '瞬間…'

      const units = []
      const contitions = [{ base: 60, format: '秒' }, { base: 60, format: '分鐘' }, { base: 24, format: '小時' }, { base: 30, format: '天' }, { base: 12, format: '個月' }]

      for (const contition of contitions) {
        const dataUnit = sec % contition.base
        dataUnit == 0 || units.push(dataUnit + contition.format)
        sec = Math.floor(sec / contition.base)
        if (sec < 1) break
      }

      sec > 0 && units.push(sec + '年')
      units.length < 1 && units.push(sec + '秒')

      return units.reverse().join(' ')
    },
    calcLength: (aa, an, ba, bn) => {
      return aa = aa * (Math.PI / 180), an = an * (Math.PI / 180), ba = ba * (Math.PI / 180), bn = bn * (Math.PI / 180), (2 * Math.asin(Math.sqrt(Math.pow(Math.sin((aa - ba) / 2), 2) + Math.cos(aa) * Math.cos(ba) * Math.pow(Math.sin((an - bn) / 2), 2)))) * 6378137
    },
    calcSpeed (speed) {
      const max = this.colors.length - 1
      for (let i = 1; i < max; i++)
        if (speed < i * 10)
          return i - 1
      return max
    },
    start (signals, i = 0) {
      const signal = signals.shift()

      if (!signal) return
      const position = new google.maps.LatLng(signal.lat, signal.lng)
      
      const size = signal.acc <= 40
        ? signal.acc <= 30
          ? signal.acc <= 20
            ? signal.acc <= 10
              ? signal.acc <= 5
                ? 4
                : 8
              : 16
            : 32
          : 64
        : 128

      const opacity = signal.acc <= 40
        ? signal.acc <= 30
          ? signal.acc <= 20
            ? signal.acc <= 10
              ? signal.acc <= 5
                ? 100
                : 80
              : 60
            : 40
          : 20
        : 10

      marker = Marker()
      marker.map = this.gmap
      marker.width = size
      marker.height = size
      marker.background = this.colors[this.calcSpeed(signal.speed)]
      marker.class = 'log o' + opacity
      marker.position = position
      
      i % 5 || this.gmap.setCenter(marker.position)
      
      this.signals.push({ lat: signal.lat, lng: signal.lng, speed: signal.speed })
      setTimeout(_ => this.start(signals, ++i), 10)
    }
  },
  template: El.render(`
    main#app
      div#error => *if=error
        span => *text=error

      div#map => ref=map
      div#title => *text=title
      div#elapsed => *text=elapsed
      div#speed => *text=speed
      div#length => *text=length
      
      div#now-speed => *text=nowSpeed
      div#now-length => *text=nowLength
      
      div#speeds => :class='n' + colors.length
        b => *for=(color, i) in colors   :key=i   :a=i * 10   *text='~'   :b=i * 10 + 9   :style={ backgroundColor: color }
      `)
})
