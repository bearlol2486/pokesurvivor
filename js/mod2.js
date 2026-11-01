// PokéSurvivor Mod Panel v3 — uses real property names + enemy nuke
// Player: hp/maxHp/atkMul/spd/critChance/level/xp
// Damage: per-move dmg, not on player — can't directly set
// One-Hit: set all enemies hp to 1 each tick
// Defense: hook player.hurt to no-op (god mode already does this via hp=maxHp)
(function(){
    if (window._mp_loaded) return;
    window._mp_loaded = true;

    function findGameObject() {
        for (var k in window) {
            try {
                var v = window[k];
                if (v && typeof v === 'object' && v.BUILT === true && v.Game) {
                    return v;
                }
            } catch(e) {}
        }
        return null;
    }

    function getEnemies(GAME) {
        // Use EnemyMgr.all() which returns array of enemies
        var out = [];
        try {
            var em = GAME.EnemyMgr;
            if (em && em.all) {
                var arr = em.all();
                if (Array.isArray(arr)) {
                    return arr;
                }
            }
        } catch(e) {}
        // Fallback: scan GAME for arrays with hp
        function tryAdd(arr) {
            if (!Array.isArray(arr)) return;
            for (var i = 0; i < arr.length; i++) {
                var o = arr[i];
                if (o && typeof o === 'object' && 'hp' in o && 'maxHp' in o && !o.BUILT) {
                    out.push(o);
                }
            }
        }
        for (var k in GAME) {
            try { tryAdd(GAME[k]); } catch(e){}
        }
        return out;
    }

    function scanEnemies(GAME) {
        return getEnemies(GAME);
    }

    function makePanel(GAME) {
        // Remove any existing panel first (handles bfcache restore case)
        var old = document.getElementById('_ps_modpanel');
        if (old) old.remove();
        var sg = document.createElement('div');
        sg.id = '_ps_modpanel';
        sg.style.cssText = 'position:fixed;top:80px;left:10px;z-index:99999;width:240px;background:#0e0f13;border:1px solid #00a2ff;border-radius:8px;font-family:monospace;color:#eee;font-size:12px;padding:8px;user-select:none;';
        document.body.appendChild(sg);

        var title = document.createElement('div');
        title.textContent = 'Mod Panel v3';
        title.style.cssText = 'color:#00a2ff;font-weight:bold;padding:4px 0 8px;cursor:move;';
        sg.appendChild(title);

        var closeBtn = document.createElement('button');
        closeBtn.textContent = 'X';
        closeBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:20px;height:20px;background:#281419;color:#ff6464;border:none;border-radius:3px;cursor:pointer;font-size:11px;';
        sg.appendChild(closeBtn);
        closeBtn.onclick = function(){ sg.style.display = 'none'; };

        var body = document.createElement('div');
        sg.appendChild(body);

        function _row(labelText) {
            var r = document.createElement('div');
            r.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #1a1a1e;';
            var l = document.createElement('span');
            l.textContent = labelText;
            l.style.color = '#ccc';
            r.appendChild(l);
            body.appendChild(r);
            return r;
        }

        function _btn(text, color, fn) {
            var b = document.createElement('button');
            b.textContent = text;
            b.style.cssText = 'background:' + (color || '#3c3c41') + ';color:#fff;border:none;border-radius:3px;padding:2px 8px;cursor:pointer;font-size:10px;';
            b.onclick = fn;
            return b;
        }

        function _statRow(label, setFn) {
            var r = _row(label);
            var val = document.createElement('span');
            val.textContent = '?';
            val.style.color = '#00ff88';
            r.insertBefore(val, r.lastChild);
            var b = _btn('MAX', '#b41818', function(){
                var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
                if (!p) return;
                try { setFn(p); val.textContent = 'SET'; } catch(e) { val.textContent = 'ERR'; }
            });
            r.appendChild(b);
            return val;
        }

        function _toggle(label, stateKey, onText, offText, onColor, offColor) {
            var r = _row(label);
            var b = _btn(offText, offColor, function(){
                window['_mp_' + stateKey] = !window['_mp_' + stateKey];
                b.textContent = window['_mp_' + stateKey] ? onText : offText;
                b.style.background = window['_mp_' + stateKey] ? onColor : offColor;
            });
            r.appendChild(b);
        }

        var hpVal = _statRow('HP', function(p){ p.hp = p.maxHp; });
        var maxHpVal = _statRow('MaxHP', function(p){ p.maxHp = 99999; p.hp = 99999; });
        var atkVal = _statRow('ATK Mul', function(p){ p.atkMul = 99; });
        var spdVal = _statRow('SPD', function(p){ p.spd = 500; });
        var critVal = _statRow('CRIT', function(p){ p.critChance = 1.0; });
        var lvlVal = _statRow('LEVEL', function(p){ p.level = 99; p.xp = 0; });

        _toggle('God Mode', 'godmode', 'ON', 'OFF', '#00b450', '#3c3c41');
        _toggle('Kill Aura', 'killaura', 'ON', 'OFF', '#b41818', '#3c3c41');
        _toggle('ATK Lock', 'atklock', 'ON', 'OFF', '#b41818', '#3c3c41');
        _toggle('SPD Lock', 'spdlock', 'ON', 'OFF', '#00a2ff', '#3c3c41');

        var status = document.createElement('div');
        status.textContent = 'waiting...';
        status.style.cssText = 'color:#888;padding:4px 0;font-size:10px;';
        body.appendChild(status);

        var drag = false, ds = null, sp = null;
        title.addEventListener('mousedown', function(e) {
            drag = true; ds = {x:e.clientX, y:e.clientY}; sp = {x:parseInt(sg.style.left), y:parseInt(sg.style.top)};
        });
        title.addEventListener('touchstart', function(e) {
            var t = e.touches[0];
            drag = true; ds = {x:t.clientX, y:t.clientY}; sp = {x:parseInt(sg.style.left), y:parseInt(sg.style.top)};
        });
        document.addEventListener('mousemove', function(e) {
            if (!drag) return;
            sg.style.left = (sp.x + e.clientX - ds.x) + 'px';
            sg.style.top = (sp.y + e.clientY - ds.y) + 'px';
        });
        document.addEventListener('touchmove', function(e) {
            if (!drag) return;
            var t = e.touches[0];
            sg.style.left = (sp.x + t.clientX - ds.x) + 'px';
            sg.style.top = (sp.y + t.clientY - ds.y) + 'px';
        });
        document.addEventListener('mouseup', function(){ drag = false; });
        document.addEventListener('touchend', function(){ drag = false; });

        setInterval(function() {
            var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
            if (!p) { status.textContent = 'no player (start a run)'; return; }
            status.textContent = 'player active';
            try { hpVal.textContent = Math.floor(p.hp) + '/' + Math.floor(p.maxHp); } catch(e){}
            try { maxHpVal.textContent = Math.floor(p.maxHp); } catch(e){}
            try { atkVal.textContent = (p.atkMul || 0).toFixed(2); } catch(e){}
            try { spdVal.textContent = (p.spd || 0).toFixed(1); } catch(e){}
            try { critVal.textContent = ((p.critChance || 0) * 100).toFixed(0) + '%'; } catch(e){}
            try { lvlVal.textContent = p.level; } catch(e){}
            // Apply locks
            if (window._mp_godmode) { try { p.hp = p.maxHp; } catch(e){} }
            if (window._mp_atklock) { try { p.atkMul = 99; } catch(e){} }
            if (window._mp_spdlock) { try { p.spd = 500; } catch(e){} }
            // Kill Aura: set all enemies hp to 0 and mark dead
            if (window._mp_killaura) {
                try {
                    var enemies = scanEnemies(window.GAME);
                    var killed = 0;
                    for (var i = 0; i < enemies.length; i++) {
                        var e = enemies[i];
                        if (e && e.hp !== undefined && e.hp > 0) {
                            e.hp = 0;
                            if ('dead' in e) e.dead = true;
                            if ('maxHp' in e) e.maxHp = 1;
                            killed++;
                        }
                    }
                    status.textContent = 'killaura: ' + killed + ' enemies killed';
                } catch(err) {}
            }
        }, 200);
    }

    function tryInject() {
        var tries = 0;
        var iv = setInterval(function() {
            tries++;
            var g = findGameObject();
            if (g) {
                window.GAME = g;
                clearInterval(iv);
                makePanel(g);
                console.log('[ModPanel v3] Loaded');
            }
            if (tries > 60) {
                clearInterval(iv);
                console.log('[ModPanel v3] Gave up');
            }
        }, 500);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        tryInject();
    } else {
        document.addEventListener('DOMContentLoaded', tryInject);
    }
})();
