(function () {
  var dev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]beta(=1)?(&|$)/.test(location.search);
  if (!/^\/beta(\/|$)/.test(location.pathname) && !dev) return;
  window.PS_BETA = {
    // yo, Joseezz y Eskeleto (los de ADMINS en js/net/ranking.js) y, desde el 10-11-2026, un beta tester más (sólo la beta,
    // no es admin; en el servidor tiene que estar también para que le deje pasar la cabecera X-PS-Beta)
    uids: ['rshaa5gKD3fXw6lE4PPXITbowaG2', '6FsLZLayF3g9k1AqEi65DAlscPw2', 'U3lLnE9VejcZhgJNN4BQGlW7ksc2', 'Vst8OQONspM8LASbGKMaeBrGu5O2'],
    ok: function (uid) { return window.PS_BETA.uids.indexOf(uid) >= 0; }
  };
  var P = 'beta:';
  try {
    var S = Storage.prototype;
    var get = S.getItem, set = S.setItem, rem = S.removeItem, key = S.key;
    var len = Object.getOwnPropertyDescriptor(S, 'length').get;
    var mine = function (st) {
      var out = [];
      for (var i = 0, n = len.call(st); i < n; i++) { var k = key.call(st, i); if (k && k.indexOf(P) === 0) out.push(k.slice(P.length)); }
      return out;
    };
    S.getItem = function (k) { return get.call(this, P + k); };
    S.setItem = function (k, v) { return set.call(this, P + k, v); };
    S.removeItem = function (k) { return rem.call(this, P + k); };
    S.key = function (i) { var m = mine(this); return i >= 0 && i < m.length ? m[i] : null; };
    S.clear = function () { var m = mine(this); for (var i = 0; i < m.length; i++) rem.call(this, P + m[i]); };
    Object.defineProperty(S, 'length', { configurable: true, enumerable: true, get: function () { return mine(this).length; } });
  } catch (e) { /* sin almacenamiento: no hay nada que separar */ }
  var again = typeof WeakSet === 'function' ? new WeakSet() : null;
  addEventListener('storage', function (e) {
    if (!again || again.has(e)) return;
    e.stopImmediatePropagation();
    if (!e.key || e.key.indexOf(P) !== 0) return;
    var copy = new StorageEvent('storage', { key: e.key.slice(P.length), oldValue: e.oldValue, newValue: e.newValue, url: e.url, storageArea: e.storageArea });
    again.add(copy);
    dispatchEvent(copy);
  }, true);
})();
