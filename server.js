/* server.js — бір сабаққа арналған жергілікті сервер (база да, тіркеу де керек емес).
   Іске қосу:  node server.js   → мекенжайлар консольде шығады.
   Деректер жадта және data.json файлында сақталады. */
var http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
var PORT = process.env.PORT || 8000, ROOT = __dirname, FILE = path.join(ROOT, 'data.json');
var TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.ico': 'image/x-icon' };
var isObj = function (v) { return v && typeof v === 'object' && !Array.isArray(v); };
var merge = function (a, b) {
  var o = {}, k; a = a || {};
  for (k in a) o[k] = a[k];
  for (k in b) o[k] = (isObj(b[k]) && isObj(o[k])) ? merge(o[k], b[k]) : b[k];
  return o;
};
var db = {}, ver = 1, timer = null;
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) {}
var changed = function () {
  ver++;
  clearTimeout(timer);
  timer = setTimeout(function () { fs.writeFile(FILE, JSON.stringify(db), function () {}); }, 300);
};
var json = function (res, o) { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
var body = function (req, cb) {
  var s = '';
  req.on('data', function (c) { s += c; if (s.length > 1e6) req.destroy(); });
  req.on('end', function () { try { cb(JSON.parse(s || '{}')); } catch (e) { cb({}); } });
};

http.createServer(function (req, res) {
  var url = req.url.split('?')[0];
  if (url === '/api/db' && req.method === 'GET') return json(res, { ver: ver, data: db });
  if (url === '/api/patch' && req.method === 'POST') return body(req, function (b) {
    if (typeof b.p === 'string' && isObj(b.o)) { db[b.p] = merge(db[b.p], b.o); changed(); }
    json(res, { ver: ver });
  });
  if (url === '/api/del' && req.method === 'POST') return body(req, function (b) {
    if (typeof b.p === 'string') { delete db[b.p]; changed(); }
    json(res, { ver: ver });
  });
  /* статикалық файлдар */
  if (url === '/') url = '/index.html';
  var f = path.normalize(path.join(ROOT, decodeURIComponent(url)));
  if (f.indexOf(ROOT) !== 0 || path.basename(f) === 'data.json' || path.basename(f) === 'server.js') { res.writeHead(403); return res.end(); }
  fs.readFile(f, function (err, buf) {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    if (path.basename(f) === 'config.js') buf = Buffer.concat([buf, Buffer.from('\nwindow.APP_CONFIG.server = true;\n')]);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}).listen(PORT, '0.0.0.0', function () {
  console.log('\nСервер қосылды.\n');
  console.log('  Мұғалім:  http://localhost:' + PORT + '/teacher.html');
  var n = os.networkInterfaces();
  Object.keys(n).forEach(function (k) {
    n[k].forEach(function (a) {
      if (a.family === 'IPv4' && !a.internal) console.log('  Студент:  http://' + a.address + ':' + PORT + '/index.html   (бір Wi-Fi ішінде)');
    });
  });
  console.log('\nТоқтату: Ctrl+C\n');
});
