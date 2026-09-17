import { geoOrthographic, geoPath, geoGraticule10, geoContains, geoBounds, timer } from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'
import { locations } from './locations.js'

const mount = document.querySelector('[data-globe]')
const canvas = document.createElement('canvas')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
mount.prepend(canvas)

const buttons = locations.map((location, index) => {
  const button = document.createElement('button')
  button.className = 'globe-marker'
  button.type = 'button'
  button.setAttribute('aria-label', location.label)
  button.addEventListener('pointerenter', () => showHover(index))
  button.addEventListener('pointerleave', clearHover)
  button.addEventListener('focus', () => showHover(index))
  button.addEventListener('blur', clearHover)
  button.addEventListener('click', (event) => { event.stopPropagation(); focusLocation(index) })
  mount.appendChild(button)
  return button
})

let land = null
let dots = []
let rotation = [-18, -11, 0]
let target = null
let focusedIndex = null
let hoveredIndex = null
let dragging = false
let dragDistance = 0
let pointer = [0, 0]
let size = 600
let scale = 250
let ctx
let projection
let path

function showHover(index) { hoveredIndex = index }
function clearHover() { hoveredIndex = null }
function focusLocation(index) {
  focusedIndex = index
  target = [-locations[index].lon, -locations[index].lat, 0]
}
function clearFocus() { focusedIndex = null; target = null }
function wrap(value) { return ((value + 180) % 360 + 360) % 360 - 180 }
function visible(location) {
  const center = projection.invert([size / 2, size / 2])
  const lambda = (location.lon - center[0]) * Math.PI / 180
  const phi1 = location.lat * Math.PI / 180
  const phi2 = center[1] * Math.PI / 180
  return Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(lambda) > 0
}
function makeDots(feature, step = 2.6) {
  const result = []
  const [[minLon, minLat], [maxLon, maxLat]] = geoBounds(feature)
  for (let lat = Math.ceil(minLat / step) * step; lat <= maxLat; lat += step) {
    const offset = (Math.round(lat / step) & 1) * step / 2
    for (let lon = Math.ceil(minLon / step) * step + offset; lon <= maxLon; lon += step) {
      if (geoContains(feature, [lon, lat])) result.push([lon, lat])
    }
  }
  return result
}
function resize() {
  size = Math.floor(mount.clientWidth)
  const dpr = Math.min(devicePixelRatio || 1, 2)
  canvas.width = size * dpr; canvas.height = size * dpr
  canvas.style.width = `${size}px`; canvas.style.height = `${size}px`
  ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  scale = size * 0.28
  projection = geoOrthographic().translate([size / 2, size / 2]).scale(scale).clipAngle(90).precision(.4).rotate(rotation)
  path = geoPath(projection, ctx)
}
function render(now = 0) {
  if (!projection) return
  projection.rotate(rotation).scale(scale)
  ctx.clearRect(0, 0, size, size)
  ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#d8d8d6'; ctx.lineWidth = 1.1; ctx.stroke()
  ctx.beginPath(); path(geoGraticule10()); ctx.strokeStyle = 'rgba(40,40,38,.10)'; ctx.lineWidth = .65; ctx.stroke()
  if (land) {
    ctx.beginPath(); path(land); ctx.fillStyle = '#f2f2ef'; ctx.fill(); ctx.strokeStyle = '#babbb7'; ctx.lineWidth = .75; ctx.stroke()
    ctx.fillStyle = 'rgba(58,58,54,.52)'
    for (const dot of dots) {
      const point = projection(dot)
      if (point && visible({ lon: dot[0], lat: dot[1] })) { ctx.beginPath(); ctx.arc(point[0], point[1], Math.max(.72, size / 900), 0, Math.PI * 2); ctx.fill() }
    }
  }
  locations.forEach((location, index) => {
    const point = projection([location.lon, location.lat])
    const front = point && visible(location)
    const button = buttons[index]
    button.style.left = `${point?.[0] || -20}px`; button.style.top = `${point?.[1] || -20}px`
    button.style.opacity = front ? '1' : '0'; button.style.pointerEvents = front ? 'auto' : 'none'
    button.style.zIndex = index === hoveredIndex || index === focusedIndex ? '4' : '2'
    if (!front) return
    const active = index === focusedIndex || index === hoveredIndex
    const pulse = reduceMotion.matches ? 0 : (Math.sin(now * .0035 + index * .4) + 1) * .3
    ctx.beginPath(); ctx.arc(point[0], point[1], (active ? 4 : 3) + pulse, 0, Math.PI * 2); ctx.fillStyle = '#0000ff'; ctx.fill()
  })
}
function animate(elapsed) {
  if (target) {
    const dLon = wrap(target[0] - rotation[0]); const dLat = target[1] - rotation[1]
    rotation[0] += dLon * .075; rotation[1] += dLat * .075
  } else if (!dragging && !reduceMotion.matches) rotation[0] = wrap(rotation[0] + .075)
  render(elapsed)
}
canvas.addEventListener('pointerdown', (event) => { dragging = true; dragDistance = 0; pointer = [event.clientX, event.clientY]; canvas.setPointerCapture(event.pointerId) })
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return
  const dx = event.clientX - pointer[0], dy = event.clientY - pointer[1]
  dragDistance += Math.abs(dx) + Math.abs(dy); rotation[0] = wrap(rotation[0] + dx * .32); rotation[1] = Math.max(-80, Math.min(80, rotation[1] - dy * .32)); pointer = [event.clientX, event.clientY]
})
canvas.addEventListener('pointerup', () => { dragging = false })
canvas.addEventListener('pointercancel', () => { dragging = false })
canvas.addEventListener('wheel', (event) => { event.preventDefault(); scale = Math.max(size * .28, Math.min(size * .50, scale * (event.deltaY > 0 ? .93 : 1.07))) }, { passive: false })
mount.addEventListener('click', () => { if (dragDistance < 4) clearFocus() })
new ResizeObserver(resize).observe(mount)
resize()
fetch('./data/land.json').then(r => r.json()).then(value => { land = value; dots = value.features.flatMap(feature => makeDots(feature)); render() })
timer(animate)
