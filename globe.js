import createGlobe from 'cobe'
import { locations } from './locations.js'

const mount = document.querySelector('[data-globe]')
const canvas = document.createElement('canvas')
const placeLabel = document.querySelector('[data-globe-place]')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
mount.prepend(canvas)

const ORANGE = [1, 0.31, 0]
const buttons = locations.map((location, index) => {
  const button = document.createElement('button')
  button.className = 'globe-marker'
  button.type = 'button'
  button.setAttribute('aria-label', location.label)
  button.addEventListener('pointerenter', () => showHover(index))
  button.addEventListener('pointerleave', clearHover)
  button.addEventListener('focus', () => showHover(index))
  button.addEventListener('blur', clearHover)
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    focusLocation(index)
  })
  mount.appendChild(button)
  return button
})

let phi = 0
let theta = 0.18
let targetPhi = null
let focusedIndex = null
let hoveredIndex = null
let dragging = false
let dragDistance = 0
let previousX = 0
let globe

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

function showLabel(index) {
  showLabel(index)
}

function showHover(index) {
  hoveredIndex = index
  showLabel(index)
}

function clearHover() {
  hoveredIndex = null
  if (focusedIndex === null) placeLabel.hidden = true
  else showLabel(focusedIndex)
}

function focusLocation(index) {
  focusedIndex = index
  targetPhi = wrapAngle(-locations[index].lon * Math.PI / 180)
  placeLabel.textContent = locations[index].label
  placeLabel.hidden = false
}

function clearFocus() {
  focusedIndex = null
  targetPhi = null
  placeLabel.hidden = true
}

function updateMarkerButtons(size) {
  const radius = size * 0.39
  locations.forEach((location, index) => {
    const lat = location.lat * Math.PI / 180
    const lon = location.lon * Math.PI / 180 + phi
    const cosLat = Math.cos(lat)
    const x = cosLat * Math.sin(lon)
    const y = Math.sin(lat) * Math.cos(theta) - cosLat * Math.cos(lon) * Math.sin(theta)
    const z = Math.sin(lat) * Math.sin(theta) + cosLat * Math.cos(lon) * Math.cos(theta)
    const button = buttons[index]
    button.style.left = `${size / 2 + x * radius}px`
    button.style.top = `${size / 2 - y * radius}px`
    button.style.zIndex = index === hoveredIndex || index === focusedIndex ? '4' : '2'
    button.style.opacity = z > 0 ? '1' : '0'
    button.style.pointerEvents = z > 0 ? 'auto' : 'none'
  })
}

function buildGlobe() {
  const size = Math.min(mount.clientWidth, mount.clientHeight)
  const dpr = Math.min(window.devicePixelRatio, 2)
  globe?.destroy()
  globe = createGlobe(canvas, {
    devicePixelRatio: dpr,
    width: size * dpr,
    height: size * dpr,
    phi,
    theta,
    dark: 0,
    diffuse: 1.15,
    mapSamples: 24000,
    mapBrightness: 1.6,
    mapBaseBrightness: 0,
    baseColor: [0.93, 0.93, 0.93],
    markerColor: ORANGE,
    glowColor: [1, 1, 1],
    markers: locations.map(({ lat, lon }) => ({ location: [lat, lon], size: 0.055 })),
    opacity: 1,
    scale: 1,
    onRender: (state) => {
      if (targetPhi !== null) {
        const difference = wrapAngle(targetPhi - phi)
        phi = wrapAngle(phi + difference * 0.07)
      } else if (!dragging && !reduceMotion.matches) {
        phi += 0.0022
      }
      const pulse = reduceMotion.matches ? 0.055 : 0.055 + Math.sin(performance.now() * 0.0024) * 0.005
      state.phi = phi
      state.theta = theta
      state.markers = locations.map(({ lat, lon }, index) => ({
        location: [lat, lon],
        size: index === focusedIndex || index === hoveredIndex ? pulse * 1.16 : pulse,
        color: ORANGE,
      }))
      updateMarkerButtons(size)
    },
  })
}

canvas.addEventListener('pointerdown', (event) => {
  dragging = true
  dragDistance = 0
  previousX = event.clientX
  canvas.setPointerCapture(event.pointerId)
})
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return
  const movement = event.clientX - previousX
  dragDistance += Math.abs(movement)
  phi += movement * 0.006
  previousX = event.clientX
})
canvas.addEventListener('pointerup', () => { dragging = false })
canvas.addEventListener('pointercancel', () => { dragging = false })
mount.addEventListener('click', () => { if (dragDistance < 4) clearFocus() })
new ResizeObserver(buildGlobe).observe(mount)
buildGlobe()
