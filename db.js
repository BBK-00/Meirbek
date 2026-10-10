/* db.js — деректер қабаты.
   Firebase бапталса: Firestore (барлық құрылғыға нақты уақытта жетеді).
   Бапталмаса: DEMO режимі (localStorage + BroadcastChannel, тек бір браузер). */
(function () {
  var cfg = window.APP_CONFIG || {}, fb = cfg.firebase || {};
  var useFb = !!(fb.apiKey && fb.projectId);
  var isObj = function (v) { return v && typeof v === 'object' && !Array.isArray(v); };
  var merge = function (a, b) {
    var o = {}, k; a = a || {};
    for (k in a) o[k] = a[k];
    for (k in b) o[k] = (isObj(b[k]) && isObj(o[k])) ? merge(o[k], b[k]) : b[k];
    return o;
  };

  /* ---------------- DEMO ---------------- */
  function demo() {
    var KEY = 'surface-demo-db', subs = [], bc = null;
    try { bc = new BroadcastChannel(KEY); } catch (e) {}
    var load = function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    var save = function (d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
    var fire = function () { subs.slice().forEach(function (s) { s(); }); };
    var changed = function () { fire(); if (bc) bc.postMessage(1); };
    if (bc) bc.onmessage = fire;
    window.addEventListener('storage', function (e) { if (e.key === KEY) fire(); });
    var sub = function (fn) { var alive = true, w = function () { if (alive) fn(); }; subs.push(w); w(); return function () { alive = false; subs = subs.filter(function (x) { return x !== w; }); }; };
    var get = function (p) { return load()[p] || null; };
    var patch = function (p, o) { var d = load(); d[p] = merge(d[p], o); save(d); changed(); return Promise.resolve(); };
    return {
      mode: 'demo',
      session: {
        get: function () { return Promise.resolve(get('lesson/current')); },
        set: function (o) { return patch('lesson/current', o); },
        on: function (cb) { return sub(function () { cb(get('lesson/current')); }); }
      },
      run: {
        get: function (id) { return Promise.resolve(get('runs/' + id)); },
        patch: function (id, o) { return patch('runs/' + id, o); },
        del: function (id) { var d = load(); delete d['runs/' + id]; save(d); changed(); return Promise.resolve(); },
        on: function (id, cb) { return sub(function () { cb(get('runs/' + id)); }); }
      },
      runs: {
        on: function (sid, cb) {
          return sub(function () {
            var d = load(), out = [];
            for (var k in d) if (k.indexOf('runs/') === 0 && d[k].sid === sid) out.push(merge({ id: k.slice(5) }, d[k]));
            cb(out);
          });
        }
      }
    };
  }

  /* ---------------- SERVER (node server.js) ---------------- */
  function server() {
    var cache = {}, ver = 0, subs = [];
    var fire = function () { subs.slice().forEach(function (s) { s(); }); };
    var post = function (u, o) {
      return fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) })
        .then(function (r) { return r.json(); }).then(function (r) { return poll(); });
    };
    var poll = function () {
      return fetch('/api/db', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (r) {
        if (r.ver !== ver) { ver = r.ver; cache = r.data || {}; fire(); }
      }).catch(function () {});
    };
    setInterval(poll, 1000); poll();
    var sub = function (fn) { var alive = true, w = function () { if (alive) fn(); }; subs.push(w); w(); return function () { alive = false; subs = subs.filter(function (x) { return x !== w; }); }; };
    var get = function (p) { return cache[p] || null; };
    var fresh = function (p) { return poll().then(function () { return get(p); }); };
    return {
      mode: 'server',
      session: {
        get: function () { return fresh('lesson/current'); },
        set: function (o) { return post('/api/patch', { p: 'lesson/current', o: o }); },
        on: function (cb) { return sub(function () { cb(get('lesson/current')); }); }
      },
      run: {
        get: function (id) { return fresh('runs/' + id); },
        patch: function (id, o) { return post('/api/patch', { p: 'runs/' + id, o: o }); },
        del: function (id) { return post('/api/del', { p: 'runs/' + id }); },
        on: function (id, cb) { return sub(function () { cb(get('runs/' + id)); }); }
      },
      runs: {
        on: function (sid, cb) {
          return sub(function () {
            var out = [];
            for (var k in cache) if (k.indexOf('runs/') === 0 && cache[k].sid === sid) out.push(merge({ id: k.slice(5) }, cache[k]));
            cb(out);
          });
        }
      }
    };
  }

  /* ---------------- FIREBASE ---------------- */
  function firebase() {
    var B = 'https://www.gstatic.com/firebasejs/10.12.2/';
    var ready = Promise.all([import(B + 'firebase-app.js'), import(B + 'firebase-firestore.js')]).then(function (m) {
      var fs = m[1], app = m[0].initializeApp(fb);
      return { fs: fs, db: fs.getFirestore(app) };
    });
    var withDb = function (fn) { return ready.then(fn); };
    var onDoc = function (path, cb) {
      var off = function () {}, dead = false;
      ready.then(function (x) {
        if (dead) return;
        off = x.fs.onSnapshot(x.fs.doc(x.db, path[0], path[1]), function (s) { cb(s.exists() ? s.data() : null); }, function (e) { console.error(e); });
      });
      return function () { dead = true; off(); };
    };
    return {
      mode: 'firebase',
      session: {
        get: function () { return withDb(function (x) { return x.fs.getDoc(x.fs.doc(x.db, 'lesson', 'current')).then(function (s) { return s.exists() ? s.data() : null; }); }); },
        set: function (o) { return withDb(function (x) { return x.fs.setDoc(x.fs.doc(x.db, 'lesson', 'current'), o, { merge: true }); }); },
        on: function (cb) { return onDoc(['lesson', 'current'], cb); }
      },
      run: {
        get: function (id) { return withDb(function (x) { return x.fs.getDoc(x.fs.doc(x.db, 'runs', id)).then(function (s) { return s.exists() ? s.data() : null; }); }); },
        patch: function (id, o) { return withDb(function (x) { return x.fs.setDoc(x.fs.doc(x.db, 'runs', id), o, { merge: true }); }); },
        del: function (id) { return withDb(function (x) { return x.fs.deleteDoc(x.fs.doc(x.db, 'runs', id)); }); },
        on: function (id, cb) { return onDoc(['runs', id], cb); }
      },
      runs: {
        on: function (sid, cb) {
          var off = function () {}, dead = false;
          ready.then(function (x) {
            if (dead) return;
            var q = x.fs.query(x.fs.collection(x.db, 'runs'), x.fs.where('sid', '==', sid));
            off = x.fs.onSnapshot(q, function (s) {
              var out = []; s.forEach(function (d) { var v = d.data(); v.id = d.id; out.push(v); }); cb(out);
            }, function (e) { console.error(e); });
          });
          return function () { dead = true; off(); };
        }
      }
    };
  }

  window.DB = useFb ? firebase() : cfg.server ? server() : demo();
})();
