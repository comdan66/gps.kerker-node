/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2020, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Marker = function(parentEl) {
  if (!(this instanceof Marker)) return new Marker(parentEl)
  
  this.top      = 0
  this.left     = 0
  this.width    = 0
  this.height   = 0

  this.map      = null
  this.html     = null
  this.click    = null
  this.class    = null
  this.position = null
  this.background = null
  this.css      = {}

  this.parentEl = !(parentEl instanceof HTMLElement) ? parentEl instanceof Vue ? parentEl.$el : document.body : parentEl
  this.pixel    = null

  this.$$ = new Vue({
    data: this, methods: this,
    computed: {
      className () { return this.class },
      style () { return this.pixel && this.$el ? {
        ...this.css,
        position: 'absolute', display: 'inline-block', background: this.background,
        top: (this.pixel.y - (this.height || this.$el.offsetHeight) / 2) + this.top + 'px',
        left: (this.pixel.x - (this.width || this.$el.offsetWidth) / 2) + this.left + 'px',
        width: this.width + 'px',
        height: this.height + 'px' } : { display: 'none' } },
      on () { return this.click ? { click: this.click.bind(this) } : {} }
    },
    watch: {
      map: function() { return this.setMap(this.map) }.bind(this),
      position: function() { return this.draw() }.bind(this)
    },
    template: El.render(`div => :class=className   :style=style   *html=html   *on=on`)
  })
}

const GoogleMap = {
  closure: null,
  inited: false,
  base () {
    if (this.inited) return
    else this.inited = true

    void function() {
      Marker.prototype = Object.create(google.maps.OverlayView.prototype)
      Object.assign(Marker.prototype, {
        draw () { this.$$.pixel = this.$$.$el && this.$$.position ? this.getProjection().fromLatLngToDivPixel(this.$$.position) : null },
        onAdd () { this.$$.$el || this.parentEl.appendChild(this.$$.$mount().$el), this.getPanes().overlayImage.appendChild(this.$$.$el) },
        remove () { this.$$.$el && this.$$.$el.parentNode.removeChild(this.$$.$el), this.$$.$el = null }
      })
    }()

    this.closure && this.closure()
  },
  init (keys, closure) {
    window.gmc = function() { $(window).trigger('gm') }
    $(window).bind('gm', GoogleMap.base.bind(GoogleMap))

    this.closure = closure
    keys = keys[Math.floor((Math.random() * keys.length))]

    $.getScript('https://maps.googleapis.com/maps/api/js?' + (keys ? 'key=' + keys + '&' : '') + 'language=zh-TW&libraries=visualization&callback=gmc', GoogleMap.base.bind(GoogleMap))
  }
}

const markerCluster = (objs, zoom, unit, isLine, func) => {
  if (!objs.length)
    return func && func([]) || []

  var ts = {},
      ns = [],
      tl = isLine ? objs.length - 1 : objs.length

  for (var i = 0; i < objs.length; i++) {
    if (typeof ts[i] !== 'undefined')
      continue

    ts[i] = true
    var t = [objs[i]]

    for (var j = i + 1; j < tl; j++) {
      if (typeof ts[j] !== 'undefined')
        if (isLine) break
        else continue

      var d = Math.max(Math.abs(objs[i].lat - objs[j].lat), Math.abs(objs[i].lng - objs[j].lng))

      if (30 / Math.pow(2, zoom) / unit <= d)
        if (isLine) break
        else continue

      ts[j] = true
      t.push(objs[j])
    }
    ns.push(t)
  }

  ts = null
  return func && func(ns) || ns
}

const cluster = (objs, zoom, level, isLinear, closure) => {
  if (!objs.length)
    return closure && closure([]), []
  
  objs = [...objs]

  const tmps = new WeakMap()
  const last = isLinear ? objs.pop() : undefined
  const sets = [...objs.map((obj1, i) => {
    if (tmps.get(obj1)) return undefined

    tmps.set(obj1, true)
    let pass = false

    return [obj1, ...objs.slice(i + 1).map(obj2 => {
      if (pass || tmps.get(obj2))
        return pass || isLinear && (pass = true), undefined

      var distance = Math.max(Math.abs(obj1.lat - obj2.lat), Math.abs(obj1.lng - obj2.lng))

      if (30 / Math.pow(2, zoom) / level <= distance)
        return pass || isLinear && (pass = true), undefined

      tmps.set(obj2, true)

      return obj2
    }).filter(t => t)]
  }).filter(t => t), ...(last ? [[last]] : [])]

  return closure && closure(sets), sets
}

const position = latLng => new google.maps.LatLng(latLng.lat, latLng.lng) || null
