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
      lng: 121.520158,
    },
    lastZoom: null,
    
    title: '',
    elapsed: '',
    length: 0,

    signals: [],
    markers: [],
    polylines: [],

    ani: false,
    anis: [],
    polyline: null,

    colors: ['#f5c801', '#fbbb03', '#fcab0a', '#fc9913', '#fb871d', '#fa7226', '#f95d30', '#f94739', '#f93748', '#f72b5e']
  },
  mounted () {
    Params({ id: null }, true)

    if (Params.id === null)
      return window.location.replace('/', this.error = '此活動不存在！')

    $.get(API + 'signals', { id: Params.id })
      .then(({ keys, event: { title, length, elapsed }, signals }) => GoogleMap.init(keys, _ => {
        this.initMap()

        this.title = title
        this.elapsed = elapsed
        this.length = length
        this.signals = signals

        return this.ani
          ? this.initPolyline(signals.map(({ lat, lng }) => new google.maps.LatLng(lat, lng)))
                .start(signals)
          : this.fetch(true)
      }))
      .fail(e => e.status && e.status == 400
        ? this.error = e.responseJSON && e.responseJSON.message || '不明原因錯誤！'
        : window.location.replace('/', this.error = '此活動不存在！'))
  },
  computed: {
    speeds () {
      let speeds = (this.ani ? this.anis : this.signals).map(signal => signal.speed).filter(speed => speed > 0)

      let max = null, min = null
      for (var i in speeds) {
        if (max === null || speeds[i] > max) max = Math.ceil(speeds[i])
        if (min === null || speeds[i] < min) min = Math.ceil(speeds[i])
      }

      speeds = []
      let unit = Math.round((max - min) / 8)
      unit = unit < 1 ? 1 : unit
      for (var i = min; i < max; i += unit) speeds.push(i);
      speeds.length < 10 && speeds.push(max)

      return speeds.filter(s => s !== null)
    },
    nowSpeed () {
      const length = this.anis.length
      return length ? Math.round(this.anis[this.anis.length - 1].speed) : null
    },
    nowLength () {
      if (!this.anis.length) return 0
      const lengths = []
      this.anis.reduce((a, b) => (a && lengths.push(this.calcLength(a.lat, a.lng, b.lat, b.lng)), b), null)
      return Math.round(lengths.reduce((a, b) => a + b, 0) / 1000 * 100) / 100
    }
  },
  methods: {
    initMap () {
      this.gmap = new google.maps.Map(this.$refs.map, { zoom: this.default.zoom, center: position(this.default), clickableIcons: false, disableDefaultUI: true, gestureHandling: 'greedy' })
      this.gmap.mapTypes.set('ms', new google.maps.StyledMapType([{stylers: [{gamma: 0}, {weight: 0.75}] }, {featureType: 'all', stylers: [{ visibility: 'on' }]}, {featureType: 'administrative', stylers: [{ visibility: 'on' }]}, {featureType: 'landscape', stylers: [{ visibility: 'on' }]}, {featureType: 'poi', stylers: [{ visibility: 'on' }]}, {featureType: 'road', stylers: [{ visibility: 'simplified' }]}, {featureType: 'road.arterial', stylers: [{ visibility: 'on' }]}, {featureType: 'transit', stylers: [{ visibility: 'on' }]}, {featureType: 'water', stylers: [{ color: '#b3d1ff', visibility: 'on' }]}, {elementType: "labels.icon", stylers:[{ visibility: 'off' }]}]));
      this.gmap.setMapTypeId('ms');
      this.gmap.addListener('zoom_changed', _ => this.gmap.zoom !== this.lastZoom && this.fetch(false, this.lastZoom = this.gmap.zoom))
      return this
    },
    initPolyline (positions) {
      return new google.maps.Polyline({
        map: this.gmap,
        strokeColor: 'rgba(27, 183, 31, 1.00)',
        strokeWeight: 2,
        path: positions
      }), this
    },
    calcLength: (aa, an, ba, bn) => {
      return aa = aa * (Math.PI / 180), an = an * (Math.PI / 180), ba = ba * (Math.PI / 180), bn = bn * (Math.PI / 180), (2 * Math.asin(Math.sqrt(Math.pow(Math.sin((aa - ba) / 2), 2) + Math.cos(aa) * Math.cos(ba) * Math.pow(Math.sin((an - bn) / 2), 2)))) * 6378137
    },
    speedColor (speed) {
      for (const i in this.speeds) if (speed <= this.speeds[i]) return this.colors[parseInt(i, 10)]
      return this.colors[0]
    },
    fetch (center = false) {
      if (this.ani) return

      this.markers.map(marker => marker.map = null).filter(marker => marker)
      this.markers = []

      this.polylines.map(polyline => polyline && polyline.setMap(null) && null).filter(polyline => polyline)
      this.polylines = []

      this.markers = cluster(this.signals, this.gmap.zoom, 1, true).map(subs => {
        const signal = subs.shift()
        const marker = Marker()
        marker.map = this.gmap
        marker.width = 16
        marker.height = 16
        marker.background = this.speedColor(signal.speed)
        marker.class = 'signal course-' + parseInt(signal.course / 10, 10)
        marker.position = position(signal)
        return marker
      })

      this.markers.reduce((a, b) => (a && this.polylines.push(((a, b) => {
        const polyline = new google.maps.Polyline({ map: this.gmap, strokeWeight: 5 })
        polyline.setPath([a.position, b.position])
        polyline.setOptions({ strokeColor: a.background })
        return polyline
      })(a, b)), b), null)

      if (!center) return

      const bounds = new google.maps.LatLngBounds()
      this.markers.map(marker => marker.position).forEach(log => bounds.extend(log))
      bounds.isEmpty() || this.gmap.fitBounds(bounds)
    },
    start (signals, i = 0) {
      const signal = signals.shift()
      if (!signal) return

      const position = new google.maps.LatLng(signal.lat, signal.lng)
      const size = signal.acc <= 40 ? signal.acc <= 30 ? signal.acc <= 20 ? signal.acc <= 10 ? signal.acc <= 5 ? 4 : 8 : 16 : 32 : 64 : 128
      const opacity = signal.acc <= 40 ? signal.acc <= 30 ? signal.acc <= 20 ? signal.acc <= 10 ? signal.acc <= 5 ? 100 : 80 : 60 : 40 : 20 : 10

      const marker = Marker()
      marker.map = this.gmap
      marker.width = size
      marker.height = size
      marker.background = this.speedColor(signal.speed)
      marker.class = 'log o' + opacity
      marker.position = position

      i % 10 || this.gmap.setCenter(marker.position)
      
      this.anis.push({ lat: signal.lat, lng: signal.lng, speed: signal.speed })
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
      div#length => *text=length
      
      template => *if=ani
        div#now-speed => *text=nowSpeed
        div#now-length => *text=nowLength
      
      div#speeds => :class='n' + speeds.length
        b => *for=(speed, i) in speeds   :key=i   *text=speed   :style={ backgroundColor: colors[i] }
      `)
})
