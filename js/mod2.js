// PokéSurvivor Mod Panel v3 — uses real property names + enemy nuke
// Player: hp/maxHp/atkMul/spd/critChance/level/xp
// Damage: per-move dmg, not on player — can't directly set
// One-Hit: set all enemies hp to 1 each tick
// Defense: hook player.hurt to no-op (god mode already does this via hp=maxHp)
(function(){
    // 允許重複注入：每次都清舊 panel 重建
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
        // 清掉所有舊的 refresh interval（防止多個 mod2.js 同時跑）
        if (window._mp_intervals) {
            window._mp_intervals.forEach(function(iv){ try { clearInterval(iv); } catch(e){} });
        }
        window._mp_intervals = [];

        // 強制移除所有舊 panel — 抓所有 fixed + z-index:99999 的 div
        var allDivs = document.querySelectorAll('div');
        allDivs.forEach(function(el){
            try {
                if (el.style && el.style.position === 'fixed' && (el.style.zIndex === '99999' || el.style.zIndex === 99999)) {
                    if (el.textContent && el.textContent.indexOf('Mod Panel') !== -1) {
                        el.remove();
                    }
                }
            } catch(e) {}
        });
        // 重設所有 toggle 狀態為 false（避免舊狀態殘留）
        var toggleKeys = ['godmode','killaura','atklock','spdlock','xpboost','magnetlock','nocd','infre'];
        toggleKeys.forEach(function(k){ window['_mp_' + k] = false; });
        window._mp_loaded = true;
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

        // 縮小按鈕
        var minBtn = document.createElement('button');
        minBtn.textContent = '—';
        minBtn.style.cssText = 'position:absolute;top:6px;right:30px;width:20px;height:20px;background:#1a2a1e;color:#6464ff;border:none;border-radius:3px;cursor:pointer;font-size:11px;';
        sg.appendChild(minBtn);
        var minimized = false;
        var bodyHeight = 'auto';
        minBtn.onclick = function(){
            minimized = !minimized;
            if (minimized) {
                body.style.display = 'none';
                sg.style.height = '32px';
                sg.style.overflow = 'hidden';
                minBtn.textContent = '+';
            } else {
                body.style.display = '';
                sg.style.height = 'auto';
                sg.style.overflow = '';
                minBtn.textContent = '—';
            }
        };

        var body = document.createElement('div');
        body.style.cssText = 'max-height:60vh;overflow-y:auto;overflow-x:hidden;';
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

        function _toggle(label, stateKey, onText, offText, onColor, offColor, offFn) {
            var r = _row(label);
            var b = _btn(offText, offColor, function(){
                var newState = !window['_mp_' + stateKey];
                window['_mp_' + stateKey] = newState;
                b.textContent = newState ? onText : offText;
                b.style.background = newState ? onColor : offColor;
                // 關閉時執行還原函數
                if (!newState && offFn) {
                    try { offFn(); } catch(e) {}
                }
            });
            r.appendChild(b);
        }

        var hpVal = _statRow('HP', function(p){ p.hp = p.maxHp; });
        var maxHpVal = _statRow('MaxHP', function(p){ p.maxHp = 99999; p.hp = 99999; });
        var atkVal = _statRow('ATK Mul', function(p){ p.atkMul = 99; });
        var spdVal = _statRow('SPD', function(p){ p.spd = 500; });
        var critVal = _statRow('CRIT', function(p){ p.critChance = 1.0; });
        var lvlVal = _statRow('LEVEL', function(p){ p.level = 99; p.xp = 0; });

        // 自訂數值輸入框
        function _inputRow(label, placeholder, setFn) {
            var r = _row(label);
            var input = document.createElement('input');
            input.type = 'number';
            input.placeholder = placeholder;
            input.style.cssText = 'width:80px;background:#1a1a1e;color:#fff;border:1px solid #2a2a2e;border-radius:3px;padding:2px 6px;font-family:monospace;font-size:11px;text-align:right;';
            var b = _btn('SET', '#285078', function(){
                var v = parseFloat(input.value);
                if (isNaN(v)) return;
                var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
                if (!p) return;
                try { setFn(p, v); } catch(e) {}
            });
            r.appendChild(input);
            r.appendChild(b);
        }
        _inputRow('Set HP', 'hp', function(p, v){ p.hp = v; });
        _inputRow('Set MaxHP', 'maxHp', function(p, v){ p.maxHp = v; p.hp = v; });
        _inputRow('Set ATK', 'atkMul', function(p, v){ p.atkMul = v; });
        _inputRow('Set SPD', 'spd', function(p, v){ p.spd = v; p.baseSpd = v; p.spdMul = v / 10; });
        _inputRow('Set CRIT', '0-1', function(p, v){ p.critChance = v; });
        _inputRow('Set LEVEL', 'lvl', function(p, v){ p.level = v; p.xp = 0; });
        _inputRow('Set XP', 'xp', function(p, v){ p.xp = v; });
        _inputRow('Set Magnet', 'magnet', function(p, v){ p.magnet = v; });
        _inputRow('Set CDMul', '0-1', function(p, v){ p.cdMul = v; });
        _inputRow('Set Rerolls', 'rerolls', function(p, v){ p.rerolls = v; });

        _toggle('God Mode', 'godmode', 'ON', 'OFF', '#00b450', '#3c3c41');
        _toggle('Kill Aura', 'killaura', 'ON', 'OFF', '#b41818', '#3c3c41');
        _toggle('ATK Lock', 'atklock', 'ON', 'OFF', '#b41818', '#3c3c41', function(){
            var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
            if (p) try { p.atkMul = 1; } catch(e){}
        });
        _toggle('SPD Lock', 'spdlock', 'ON', 'OFF', '#00a2ff', '#3c3c41', function(){
            var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
            if (p) try { p.spd = 1; p.speed = 1; p.baseSpd = 1; p.spdMul = 1; } catch(e){}
        });
        _toggle('XP Boost', 'xpboost', 'ON', 'OFF', '#00ff88', '#3c3c41');
        _toggle('Magnet Lock', 'magnetlock', 'ON', 'OFF', '#ff9ed8', '#3c3c41', function(){
            var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
            if (p) try { p.magnet = 12; p.magnetMul = 1; } catch(e){}
        });
        _toggle('No Cooldown', 'nocd', 'ON', 'OFF', '#ffaa00', '#3c3c41', function(){
            var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
            if (p) try { p.cdMul = 1; } catch(e){}
        });
        _toggle('Inf Reroll', 'infre', 'ON', 'OFF', '#9d6bff', '#3c3c41');

        // === Save / Money / Tickets 區塊 ===
        var sep1 = document.createElement('div');
        sep1.textContent = '─ Save / Money ─';
        sep1.style.cssText = 'color:#888;padding:6px 0 2px;font-size:10px;border-top:1px solid #1a1a1e;margin-top:6px;';
        body.appendChild(sep1);

        // 顯示目前 save 值
        var saveInfo = document.createElement('div');
        saveInfo.style.cssText = 'color:#888;font-size:10px;padding:2px 0;';
        body.appendChild(saveInfo);

        // 設定 coins
        function _saveInputRow(label, placeholder, getFn, setFn) {
            var r = _row(label);
            var input = document.createElement('input');
            input.type = 'number';
            input.placeholder = placeholder;
            input.style.cssText = 'width:80px;background:#1a1a1e;color:#fff;border:1px solid #2a2a2e;border-radius:3px;padding:2px 6px;font-family:monospace;font-size:11px;text-align:right;';
            var b = _btn('SET', '#285078', function(){
                var v = parseInt(input.value);
                if (isNaN(v)) return;
                var G = window.GAME;
                if (!G || !G.DB || !G.DB.save) return;
                try {
                    setFn(G.DB.save, v);
                    saveInfo.textContent = 'set ok';
                    // 用 commit 同步到雲端（saveNow 可能被 rules 擋）
                    if (G.DB.commit) {
                        try { G.DB.commit(); saveInfo.textContent = 'set + committed'; } catch(e){ saveInfo.textContent = 'set ok, commit err: ' + e.message; }
                    } else if (G.DB.saveNow) {
                        try { G.DB.saveNow(); } catch(e){}
                    }
                } catch(e) { saveInfo.textContent = 'err: ' + e.message; }
            });
            r.appendChild(input);
            r.appendChild(b);
        }
        _saveInputRow('Coins', 'amount', function(s){return s.coins;}, function(s, v){ s.coins = v; });
        _saveInputRow('T1 Tickets', '單抽', function(s){return s.tickets && s.tickets.t1;}, function(s, v){ if(!s.tickets) s.tickets={t1:0,t10:0}; s.tickets.t1 = v; });
        _saveInputRow('T10 Tickets', '十連', function(s){return s.tickets && s.tickets.t10;}, function(s, v){ if(!s.tickets) s.tickets={t1:0,t10:0}; s.tickets.t10 = v; });
        _saveInputRow('Candy', 'candy', function(s){return s.candy;}, function(s, v){ s.candy = v; });

        // 一鍵加 99999 錢 + 99 抽獎卷
        var maxBtn = _btn('MAX ALL (coins+tickets+candy)', '#b41818', function(){
            var G = window.GAME;
            if (!G || !G.DB || !G.DB.save) return;
            var s = G.DB.save;
            try {
                s.coins = 999999;
                if (!s.tickets) s.tickets = {t1:0, t10:0};
                s.tickets.t1 = 999;
                s.tickets.t10 = 999;
                s.candy = 9999;
                saveInfo.textContent = 'MAX done';
                if (G.DB.commit) try { G.DB.commit(); saveInfo.textContent = 'MAX done + committed'; } catch(e){}
                else if (G.DB.saveNow) try { G.DB.saveNow(); } catch(e){}
            } catch(e) { saveInfo.textContent = 'err: ' + e.message; }
        });
        maxBtn.style.cssText = 'width:100%;margin-top:4px;padding:6px;background:#b41818;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:10px;';
        body.appendChild(maxBtn);

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

        var refreshIv = setInterval(function() {
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
            if (window._mp_spdlock) { try { p.spd = 500; p.speed = 500; p.baseSpd = 500; p.spdMul = 10; } catch(e){} }
            if (window._mp_xpboost) { try { p.xp = (p.xpNext || 100) + 100; } catch(e){} }
            if (window._mp_magnetlock) { try { p.magnet = 999; p.magnetMul = 99; } catch(e){} }
            if (window._mp_nocd) { try { p.cdMul = 0.01; } catch(e){} }
            if (window._mp_infre) { try { p.rerolls = 0; p.rerollBonus = 99; } catch(e){} }
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
            // 更新 save 資訊顯示
            try {
                var G2 = window.GAME;
                if (G2 && G2.DB && G2.DB.save) {
                    var sv = G2.DB.save;
                    saveInfo.textContent = 'coins:' + (sv.coins||0) + ' t1:' + (sv.tickets?sv.tickets.t1:0) + ' t10:' + (sv.tickets?sv.tickets.t10:0) + ' candy:' + (sv.candy||0);
                }
            } catch(e) {}
        }, 200);
        // 記錄 interval 以便下次注入時清除
        window._mp_intervals.push(refreshIv);
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
