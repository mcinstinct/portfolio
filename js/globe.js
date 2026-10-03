// Spinning dotted globe. Drag to rotate; fixed at its opening size. Needs d3geo.js, land.js, locations.js first.
(function () {
  var g = d3g, mount = document.querySelector('[data-globe]');
  var canvas = document.createElement('canvas');
  mount.appendChild(canvas);

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rotation = [-18, -11, 0], dragging = false, last = [0, 0];
  var size, scale, ctx, projection, path, dots = [];
  var small = function () { return matchMedia('(max-width: 760px)').matches; };

  function wrap(v) { return ((v + 180) % 360 + 360) % 360 - 180; }

  function makeDots(feature, step) {
    var out = [], b = g.geoBounds(feature);
    for (var lat = Math.ceil(b[0][1] / step) * step; lat <= b[1][1]; lat += step) {
      var off = (Math.round(lat / step) & 1) * step / 2;
      for (var lon = Math.ceil(b[0][0] / step) * step + off; lon <= b[1][0]; lon += step)
        if (g.geoContains(feature, [lon, lat])) out.push([lon, lat]);
    }
    return out;
  }

  function front(lon, lat) {
    var c = projection.invert([size / 2, size / 2]), r = Math.PI / 180;
    return Math.sin(lat * r) * Math.sin(c[1] * r) +
           Math.cos(lat * r) * Math.cos(c[1] * r) * Math.cos((lon - c[0]) * r) > 0;
  }

  function resize() {
    size = Math.floor(mount.clientWidth);
    var dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = canvas.height = size * dpr;
    canvas.style.width = canvas.style.height = size + 'px';
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = size * (small() ? 0.47 : 0.28);
    projection = g.geoOrthographic().translate([size / 2, size / 2]).scale(scale)
      .clipAngle(90).precision(0.4);
    path = g.geoPath(projection, ctx);
  }

  function draw(now) {
    projection.rotate(rotation).scale(scale);
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath(); path({ type: 'Sphere' });
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#d8d8d6'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.beginPath(); path(g.geoGraticule10());
    ctx.strokeStyle = 'rgba(40,40,38,.10)'; ctx.lineWidth = 0.65; ctx.stroke();
    ctx.beginPath(); path(LAND);
    ctx.fillStyle = '#f2f2ef'; ctx.fill(); ctx.strokeStyle = '#babbb7'; ctx.lineWidth = 0.75; ctx.stroke();

    ctx.fillStyle = 'rgba(58,58,54,.52)';
    dots.forEach(function (d) {
      var p = projection(d);
      if (p && front(d[0], d[1])) { ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(0.72, size / 900), 0, 7); ctx.fill(); }
    });

    ctx.fillStyle = '#0000ff';
    LOCATIONS.forEach(function (l, i) {
      var p = projection([l.lon, l.lat]);
      if (!p || !front(l.lon, l.lat)) return;
      var pulse = reduce ? 0 : (Math.sin(now * 0.0035 + i * 0.4) + 1) * 0.3;
      ctx.beginPath(); ctx.arc(p[0], p[1], 3 + pulse, 0, 7); ctx.fill();
    });
  }

  g.timer(function (t) {
    if (!dragging && !reduce) rotation[0] = wrap(rotation[0] + 0.075);
    draw(t);
  });

  function onGlobe(e) {
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left - size / 2;
    var y = e.clientY - rect.top - size / 2;
    return x * x + y * y <= scale * scale;
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (!onGlobe(e)) return;
    dragging = true; last = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    if (!onGlobe(e)) { last = [e.clientX, e.clientY]; return; }
    rotation[0] = wrap(rotation[0] + (e.clientX - last[0]) * 0.32);
    rotation[1] = Math.max(-80, Math.min(80, rotation[1] - (e.clientY - last[1]) * 0.32));
    last = [e.clientX, e.clientY];
  });
  canvas.addEventListener('pointerup', function () { dragging = false; });
  canvas.addEventListener('pointercancel', function () { dragging = false; });
  new ResizeObserver(resize).observe(mount);
  resize();
  LAND.features.forEach(function (f) { dots = dots.concat(makeDots(f, 2.6)); });
})();
