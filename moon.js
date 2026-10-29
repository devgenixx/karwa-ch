// Moonrise maths. Low-precision lunar theory (main Meeus terms), good to about 1 to 2 minutes for India.
(function (root) {
  var PI = Math.PI, sin = Math.sin, cos = Math.cos, tan = Math.tan,
      asin = Math.asin, atan2 = Math.atan2, rad = PI / 180,
      dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397;

  function toDays(date) { return date.valueOf() / dayMs - 0.5 + J1970 - J2000; }

  function position(date, lat, lng) {
    var d = toDays(date),
        L = rad * (218.3164477 + 13.17639648 * d),
        Mm = rad * (134.9633964 + 13.06499295 * d),
        F = rad * (93.2720950 + 13.22935024 * d),
        D = rad * (297.8501921 + 12.19074912 * d),
        Ms = rad * (357.5291092 + 0.98560028 * d);

    var l = L + rad * (6.2888 * sin(Mm) + 1.2740 * sin(2 * D - Mm) + 0.6583 * sin(2 * D)
                     + 0.2136 * sin(2 * Mm) - 0.1856 * sin(Ms) - 0.1143 * sin(2 * F)
                     + 0.0588 * sin(2 * D - 2 * Mm) + 0.0572 * sin(2 * D - Ms - Mm)
                     + 0.0533 * sin(2 * D + Mm) + 0.0459 * sin(2 * D - Ms)
                     + 0.0410 * sin(Mm - Ms) - 0.0348 * sin(D) - 0.0305 * sin(Ms + Mm)
                     + 0.0153 * sin(2 * D - 2 * F) - 0.0125 * sin(Mm + 2 * F)
                     + 0.0107 * sin(4 * D - Mm));
    var b = rad * (5.1281 * sin(F) + 0.2806 * sin(Mm + F) + 0.2777 * sin(Mm - F)
                 + 0.1732 * sin(2 * D - F) + 0.0554 * sin(2 * D - Mm + F)
                 + 0.0463 * sin(2 * D - Mm - F) + 0.0326 * sin(2 * D + F)
                 + 0.0172 * sin(2 * Mm + F));
    var dist = 385001 - 20905 * cos(Mm) - 3699 * cos(2 * D - Mm) - 2956 * cos(2 * D)
             - 570 * cos(2 * Mm) + 246 * cos(2 * D - 2 * Mm);

    var ra = atan2(sin(l) * cos(e) - tan(b) * sin(e), cos(l)),
        dec = asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l)),
        phi = rad * lat,
        H = rad * (280.16 + 360.9856235 * d) + rad * lng - ra;

    return {
      alt: asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H)),
      // bearing from north, clockwise, in degrees
      bearing: (atan2(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi)) / rad + 180 + 360) % 360,
      dist: dist
    };
  }

  function sunPosition(date, lat, lng) {
    var d = toDays(date),
        M = rad * (357.5291 + 0.98560028 * d),
        L = M + rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)) + rad * 102.9372 + PI,
        ra = atan2(sin(L) * cos(e), cos(L)),
        dec = asin(sin(e) * sin(L)),
        phi = rad * lat,
        H = rad * (280.16 + 360.9856235 * d) + rad * lng - ra;
    return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H)) + rad * 0.833; // 0 at sunrise/sunset
  }

  // First time after `from` (within 24h) when f goes from below 0 to above (up) or the reverse.
  function crossing(from, f, up) {
    var step = 10 * 60e3, t0 = from.valueOf(), h0 = f(from);
    for (var t = t0 + step; t <= t0 + dayMs; t += step) {
      var h1 = f(new Date(t));
      if (up ? (h0 < 0 && h1 >= 0) : (h0 >= 0 && h1 < 0)) {
        var lo = t - step, hi = t;
        for (var i = 0; i < 20; i++) {
          var mid = (lo + hi) / 2, below = f(new Date(mid)) < 0;
          if (below === up) lo = mid; else hi = mid;
        }
        return new Date(hi);
      }
      h0 = h1;
    }
    return null;
  }

  // Sun's real altitude in degrees (negative after sunset). Twilight brightness follows this.
  function sunAltitude(date, lat, lng) { return (sunPosition(date, lat, lng) - rad * 0.833) / rad; }

  function sunsetAfter(from, lat, lng) {
    return crossing(from, function (t) { return sunPosition(t, lat, lng); }, false);
  }

  // Altitude above the "moonrise line": centre of the disc touching the horizon, with parallax and
  // refraction. This is the convention Indian panchangs use (matches published Karwa Chauth times).
  function aboveHorizon(date, lat, lng) {
    var p = position(date, lat, lng);
    return p.alt - (asin(6378.14 / p.dist) - rad * 0.5667);
  }

  // First moonrise between `from` and `from + 24h`, or null.
  function riseAfter(from, lat, lng) {
    var rise = crossing(from, function (t) { return aboveHorizon(t, lat, lng); }, true);
    return rise && { time: rise, bearing: position(rise, lat, lng).bearing };
  }

  root.Moon = { position: position, riseAfter: riseAfter, sunsetAfter: sunsetAfter, sunAltitude: sunAltitude };
  if (typeof module !== 'undefined') module.exports = root.Moon;
})(typeof window !== 'undefined' ? window : this);
