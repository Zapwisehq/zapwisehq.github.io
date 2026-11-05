/* ZAPWISE//OS sky v3.5 — bright-star catalog + local sidereal / alt-az projection.
   No network. Used by the weather card canvas for real sun, moon phase, and constellations. */
(function (w) {
"use strict";
var STARS = {
  Betelgeuse:[5.9195,7.4071,0.42], Rigel:[5.2423,-8.2017,0.13], Bellatrix:[5.4185,6.3497,1.64],
  Mintaka:[5.5334,-0.2991,2.23], Alnilam:[5.6036,-1.2019,1.69], Alnitak:[5.6793,-1.9426,1.77], Saiph:[5.7959,-9.6696,2.07],
  Dubhe:[11.0621,61.751,1.79], Merak:[11.0307,56.3824,2.37], Phecda:[11.8972,53.6948,2.44], Megrez:[12.2571,57.0326,3.31],
  Alioth:[12.9004,55.9598,1.77], Mizar:[13.3987,54.9254,2.27], Alkaid:[13.7923,49.3133,1.86],
  Schedar:[0.6751,56.5373,2.24], Caph:[0.1529,59.1498,2.28], "Gamma Cas":[0.9451,60.7167,2.47], Ruchbah:[1.4302,60.2353,2.68], Segin:[1.9066,63.6701,3.38],
  Sirius:[6.7525,-16.7161,-1.46], Procyon:[7.655,5.225,0.34], Capella:[5.2782,45.998,0.08], Aldebaran:[4.5987,16.5093,0.87],
  Pollux:[7.7553,28.0262,1.14], Regulus:[10.1395,11.9672,1.36], Spica:[13.4199,-11.1613,0.98], Arcturus:[14.261,19.1824,-0.05],
  Vega:[18.6156,38.7837,0.03], Deneb:[20.6905,45.2803,1.25], Altair:[19.8464,8.8683,0.76], Polaris:[2.5303,89.2641,1.98]
};
var LINES = {
  Orion:["Bellatrix","Betelgeuse","Alnitak","Alnilam","Mintaka","Bellatrix",null,"Betelgeuse","Saiph",null,"Rigel","Mintaka",null,"Saiph","Rigel"],
  "Big Dipper":["Dubhe","Merak","Phecda","Megrez","Alioth","Mizar","Alkaid",null,"Megrez","Dubhe"],
  Cassiopeia:["Caph","Schedar","Gamma Cas","Ruchbah","Segin"],
  "Summer Triangle":["Vega","Deneb",null,"Vega","Altair",null,"Deneb","Altair"]
};
var LABELS = { Orion:"Betelgeuse", "Big Dipper":"Alioth", Cassiopeia:"Schedar" };

function deg2rad(d){ return d*Math.PI/180; }
function rad2deg(r){ return r*180/Math.PI; }
function wrap360(d){ d%=360; return d<0?d+360:d; }

function julianDate(d){
  return d.getTime()/86400000 + 2440587.5;
}
/** Local mean sidereal time in degrees */
function lmstDeg(date, lonDeg){
  var jd = julianDate(date);
  var T = (jd - 2451545.0)/36525;
  var gmst = 280.46061837 + 360.98564736629*(jd-2451545) + 0.000387933*T*T - T*T*T/38710000;
  return wrap360(gmst + lonDeg);
}
function raDecToAltAz(raHours, decDeg, date, latDeg, lonDeg){
  var lst = lmstDeg(date, lonDeg);
  var ha = deg2rad(wrap360(lst - raHours*15));
  var dec = deg2rad(decDeg), lat = deg2rad(latDeg);
  var sinAlt = Math.sin(dec)*Math.sin(lat) + Math.cos(dec)*Math.cos(lat)*Math.cos(ha);
  var alt = Math.asin(Math.min(1, Math.max(-1, sinAlt)));
  var cosAz = (Math.sin(dec) - Math.sin(alt)*Math.sin(lat)) / (Math.cos(alt)*Math.cos(lat) || 1e-9);
  var az = Math.acos(Math.min(1, Math.max(-1, cosAz)));
  if (Math.sin(ha) > 0) az = 2*Math.PI - az;
  return { alt: rad2deg(alt), az: rad2deg(az) };
}
/** Sun ecliptic longitude approx (degrees), returns alt/az */
function sunAltAz(date, latDeg, lonDeg){
  var jd = julianDate(date);
  var n = jd - 2451545.0;
  var L = wrap360(280.460 + 0.9856474*n);
  var g = deg2rad(wrap360(357.528 + 0.9856003*n));
  var lam = deg2rad(L + 1.915*Math.sin(g) + 0.020*Math.sin(2*g));
  var eps = deg2rad(23.439 - 0.0000004*n);
  var ra = Math.atan2(Math.cos(eps)*Math.sin(lam), Math.cos(lam));
  var dec = Math.asin(Math.sin(eps)*Math.sin(lam));
  return raDecToAltAz(rad2deg(ra)/15, rad2deg(dec), date, latDeg, lonDeg);
}
/** Moon: phase 0..1 (0=new,0.5=full), illumination 0..1, age days, alt/az */
function moonState(date, latDeg, lonDeg){
  var jd = julianDate(date);
  var D = jd - 2451545.0;
  // Simplified Meeus-ish
  var L = wrap360(218.316 + 13.176396*D);
  var M = wrap360(134.963 + 13.064993*D);
  var F = wrap360(93.272 + 13.229350*D);
  var Ms = wrap360(357.529 + 0.985600*D);
  var lon = L + 6.289*Math.sin(deg2rad(M));
  var lat = 5.128*Math.sin(deg2rad(F));
  var dist = 385001 - 20905*Math.cos(deg2rad(M));
  var Ls = wrap360(280.460 + 0.9856474*D);
  var elong = wrap360(lon - Ls);
  var phaseAng = Math.acos(Math.cos(deg2rad(elong))); // rad
  var illum = (1 + Math.cos(phaseAng))/2;
  var age = wrap360(elong)/360 * 29.530588;
  var phase = wrap360(elong)/360; // 0 new → 0.5 full → 1 new
  // equatorial from ecliptic
  var eps = deg2rad(23.439);
  var lam = deg2rad(lon), beta = deg2rad(lat);
  var ra = Math.atan2(Math.cos(eps)*Math.sin(lam) - Math.sin(eps)*Math.tan(beta), Math.cos(lam));
  var dec = Math.asin(Math.sin(eps)*Math.sin(lam)*Math.cos(beta) + Math.cos(eps)*Math.sin(beta));
  var aa = raDecToAltAz(rad2deg(ra)/15, rad2deg(dec), date, latDeg, lonDeg);
  return { phase: phase, illum: illum, age: age, alt: aa.alt, az: aa.az, waxing: elong < 180 };
}
function skyPeriod(sunAlt){
  // sun altitude degrees
  if (sunAlt > 6) return "day";
  if (sunAlt > -0.5) return "golden";
  if (sunAlt > -6) return "sunset";
  if (sunAlt > -12) return "dusk";
  if (sunAlt > -18) return "twilight";
  return "night";
}
function projectSky(alt, az, W, H){
  // horizon at bottom ~85%, zenith near top; az 0=N → map so E is right when facing S-ish: use az with south-up optional
  // Screen: west left, east right, zenith top (looking south-ish for northern latitudes)
  var x = W * (0.5 + Math.sin(deg2rad(az)) * (90 - Math.max(alt,0))/180 * 0.95);
  var y = H * (0.88 - Math.sin(deg2rad(Math.max(alt,0))) * 0.78);
  return { x: x, y: y, on: alt > -2 };
}
function visibleSky(date, lat, lon, W, H){
  var out = { stars: [], lines: [], labels: [], sun: null, moon: null, period: "night" };
  var sun = sunAltAz(date, lat, lon);
  out.sun = Object.assign({}, sun, projectSky(sun.alt, sun.az, W, H));
  out.period = skyPeriod(sun.alt);
  var moon = moonState(date, lat, lon);
  out.moon = Object.assign({}, moon, projectSky(moon.alt, moon.az, W, H));
  Object.keys(STARS).forEach(function (name) {
    var s = STARS[name];
    var aa = raDecToAltAz(s[0], s[1], date, lat, lon);
    if (aa.alt < -1) return;
    var p = projectSky(aa.alt, aa.az, W, H);
    out.stars.push({ name: name, mag: s[2], x: p.x, y: p.y, alt: aa.alt });
  });
  var byName = {};
  out.stars.forEach(function (s) { byName[s.name] = s; });
  Object.keys(LINES).forEach(function (cname) {
    var pts = LINES[cname], seg = [];
    for (var i = 0; i < pts.length; i++) {
      if (pts[i] == null) { if (seg.length > 1) out.lines.push({ name: cname, pts: seg }); seg = []; continue; }
      var st = byName[pts[i]];
      if (!st) { if (seg.length > 1) out.lines.push({ name: cname, pts: seg }); seg = []; continue; }
      seg.push(st);
    }
    if (seg.length > 1) out.lines.push({ name: cname, pts: seg });
  });
  Object.keys(LABELS).forEach(function (cname) {
    var anchor = byName[LABELS[cname]];
    if (anchor) out.labels.push({ name: cname, x: anchor.x, y: anchor.y - 10 });
  });
  return out;
}
w.ZAPOS_SKY = {
  visible: visibleSky,
  sunAltAz: sunAltAz,
  moonState: moonState,
  skyPeriod: skyPeriod,
  project: projectSky
};
})(window);
