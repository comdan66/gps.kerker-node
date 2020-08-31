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
    polyline: null,
    signals: [],
    allLength: 0,
  },
  mounted () {
    Params({ id: null }, true)

    if (Params.id === null)
      return window.location.replace('/', this.error = '此活動不存在！')

    $.get(API + 'signals', { id: Params.id })
      .then(({ keys , signals }) => GoogleMap.init(keys, _ => {
        this.initMap()
        this.initPolyline()

        const positions = signals.map(({ lat, lng }) => new google.maps.LatLng(lat, lng))
        this.polyline.setPath(positions)

        const bounds = new google.maps.LatLngBounds()
        positions.forEach(signal => bounds.extend(signal))
        bounds.isEmpty() || this.gmap.fitBounds(bounds)

        const lengths = []
        signals.reduce((a, b) => (a && lengths.push(this.calcLength(a.lat, a.lng, b.lat, b.lng)), b), null)
        this.allLength = Math.round(lengths.reduce((a, b) => a + b, 0) / 1000 * 100) / 100

        this.start(signals)

      }))
      .fail(e => e.status && e.status == 400
        ? this.error = e.responseJSON && e.responseJSON.message || '不明原因錯誤！'
        : window.location.replace('/', this.error = '此活動不存在！'))
  },
  computed: {
    length () {
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
      this.polyline || (this.polyline = new google.maps.Polyline({ map: this.gmap, strokeColor: 'rgba(24, 136, 239, .5)', strokeWeight: 6 }))
    },
    calcLength: (aa, an, ba, bn) => {
      return aa = aa * (Math.PI / 180), an = an * (Math.PI / 180), ba = ba * (Math.PI / 180), bn = bn * (Math.PI / 180), (2 * Math.asin(Math.sqrt(Math.pow(Math.sin((aa - ba) / 2), 2) + Math.cos(aa) * Math.cos(ba) * Math.pow(Math.sin((an - bn) / 2), 2)))) * 6378137
    },
    start (signals, i = 0) {
      const signal = signals.shift()

      if (!signal) return
      const position = new google.maps.LatLng(signal.lat, signal.lng)

      marker = Marker()
      marker.map = this.gmap
      marker.width = 4
      marker.height = 4
      marker.class = 'log'
      marker.position = position
      
      i % 5 || this.gmap.setCenter(marker.position)
      
      this.signals.push({ lat: signal.lat, lng: signal.lng })
      setTimeout(_ => this.start(signals, ++i), 10)
    }
  },
  template: El.render(`
    main#app
      div#error => *if=error
        span => *text=error

      div#map => ref=map
      div#length => *text=length + '/' + allLength
      `)
})
