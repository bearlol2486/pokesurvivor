// PokéSurvivor Mod Panel — standalone loader
// Auto-detects the game object by finding the one with 'BUILT':true and 'Game' property
// Then exposes it as window.GAME and injects the mod panel UI
(function(){
    if (window._mp_loaded) return;
    window._mp_loaded = true;

    function findGameObject() {
        // Method 1: scan window for object with BUILT + Game
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

    function makePanel(GAME) {
        if (document.getElementById('_ps_modpanel')) return;
        var sg = document.createElement('div');
        sg.id = '_ps_modpanel';
        sg.style.cssText = 'position:fixed;top:80px;left:10px;z-index:99999;width:240px;background:#0e0f13;border:1px solid #00a2ff;border-radius:8px;font-family:monospace;color:#eee;font-size:12px;padding:8px;user-select:none;';
        document.body.appendChild(sg);

        var title = document.createElement('div');
        title.textContent = 'Mod Panel';
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

        function _statRow(label, setKey) {
            var r = _row(label);
            var val = document.createElement('span');
            val.textContent = '?';
            val.style.color = '#00ff88';
            r.insertBefore(val, r.lastChild);
            var b = _btn('MAX', '#b41818', function(){
                var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
                if (!p) return;
                try {
                    if (setKey === 'hp') { p.hp = p.maxHp; }
                    else if (setKey === 'level') { p.level = 99; p.xp = 0; p.xpNext = 999999; }
                    else if (setKey === 'dmg') { p.dmg = 99999; }
                    else if (setKey === 'crit') { p.critChance = 1.0; }
                    else if (setKey === 'spd') { p.spd = 20; p.speed = 20; }
                    else if (setKey === 'atk') { p.atk = 999; }
                    else if (setKey === 'def') { p.def = 999; }
                    else { p[setKey] = 9999; }
                    val.textContent = 'SET';
                } catch(e) {}
            });
            r.appendChild(b);
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

        _statRow('HP', 'hp');
        _statRow('ATK', 'atk');
        _statRow('DEF', 'def');
        _statRow('SPD', 'spd');
        _statRow('CRIT', 'crit');
        _statRow('DMG', 'dmg');
        _statRow('LEVEL', 'level');
        _toggle('God Mode', 'godmode', 'ON', 'OFF', '#00b450', '#3c3c41');
        _toggle('One-Hit', 'onehit', 'ON', 'OFF', '#b41818', '#3c3c41');

        var status = document.createElement('div');
        status.textContent = 'waiting...';
        status.style.cssText = 'color:#888;padding:4px 0;font-size:10px;';
        body.appendChild(status);

        // Drag
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

        // Auto-refresh loop
        setInterval(function() {
            var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
            if (!p) { status.textContent = 'no player (start a run)'; return; }
            status.textContent = 'player active';
            if (window._mp_godmode) { try { p.hp = p.maxHp; } catch(e){} }
            if (window._mp_onehit) { try { p.dmg = 99999; } catch(e){} }
        }, 500);
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
                console.log('[ModPanel] Loaded, GAME exposed');
            }
            if (tries > 60) {
                clearInterval(iv);
                console.log('[ModPanel] Gave up waiting for game');
            }
        }, 500);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        tryInject();
    } else {
        document.addEventListener('DOMContentLoaded', tryInject);
    }
})();
