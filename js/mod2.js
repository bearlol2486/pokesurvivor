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
        // 用變數控制透明度（0=全透明 1=全不透明）
        window._mp_bgalpha = 0.5;
        function updateBg() {
            var a = window._mp_bgalpha;
            sg.style.backgroundImage = 'linear-gradient(135deg,rgba(255,248,235,' + a + '),rgba(245,230,210,' + a + ')),url(assets/panel-bg.jpg)';
        }
        sg.style.cssText = 'position:fixed;top:80px;left:10px;z-index:99999;width:260px;background-size:cover;background-position:center;border:2px solid #d4a574;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#5a3e2b;font-size:12px;padding:10px;box-shadow:0 4px 20px rgba(139,90,43,0.3);user-select:none;backdrop-filter:blur(8px);';
        updateBg();
        document.body.appendChild(sg);

        var title = document.createElement('div');
        title.textContent = '✦ Mod Panel ✦';
        title.style.cssText = 'color:#5a3e2b;font-weight:700;padding:6px 60px 10px 0;cursor:move;font-size:14px;text-align:center;border-bottom:1px solid #d4a574;margin-bottom:4px;letter-spacing:1px;text-shadow:0 1px 2px rgba(255,255,255,0.8);';
        sg.appendChild(title);

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'position:absolute;top:8px;right:8px;width:22px;height:22px;background:rgba(200,100,100,0.15);color:#c0392b;border:1px solid #c0392b;border-radius:50%;cursor:pointer;font-size:11px;font-weight:bold;';
        sg.appendChild(closeBtn);
        // 收起 panel + 顯示浮動小按鈕
        closeBtn.onclick = function(){
            sg.style.display = 'none';
            setTimeout(function(){
                if (document.getElementById('_ps_modpill')) return;
                var pill = document.createElement('div');
                pill.id = '_ps_modpill';
                pill.style.cssText = 'position:fixed;top:80px;left:10px;z-index:2147483647;width:52px;height:52px;background-image:url(assets/panel-bg2.jpg);background-size:cover;background-position:center top;border:3px solid #d4a574;border-radius:50%;cursor:pointer;box-shadow:0 4px 16px rgba(139,90,43,0.6);padding:0;overflow:hidden;';
                // 加到 documentElement 確保最上層
                (document.body || document.documentElement).appendChild(pill);
                pill.onclick = function(){
                    sg.style.display = '';
                    pill.remove();
                };
                // 也加 touch 事件（iPad Safari 有時 click 不靈）
                pill.ontouchend = function(e){
                    e.preventDefault();
                    sg.style.display = '';
                    pill.remove();
                };
            }, 50);
        };

        // 縮小按鈕
        var minBtn = document.createElement('button');
        minBtn.textContent = '—';
        minBtn.style.cssText = 'position:absolute;top:8px;right:36px;width:22px;height:22px;background:rgba(139,90,43,0.15);color:#8b5a2b;border:1px solid #8b5a2b;border-radius:50%;cursor:pointer;font-size:11px;font-weight:bold;';
        sg.appendChild(minBtn);
        var minimized = false;
        minBtn.onclick = function(){
            minimized = !minimized;
            if (minimized) {
                body.style.display = 'none';
                sg.style.width = '260px';
                sg.style.padding = '6px 10px';
                title.style.paddingRight = '60px';
                minBtn.textContent = '+';
            } else {
                body.style.display = '';
                sg.style.width = '260px';
                sg.style.padding = '10px';
                title.style.paddingRight = '60px';
                minBtn.textContent = '—';
            }
        };

        var body = document.createElement('div');
        body.style.cssText = 'max-height:60vh;overflow-y:auto;overflow-x:hidden;';
        sg.appendChild(body);

        // Custom scrollbar + warm theme styles
        var styleEl = document.createElement('style');
        styleEl.textContent = '#_ps_modpanel ::-webkit-scrollbar{width:6px}#_ps_modpanel ::-webkit-scrollbar-track{background:rgba(212,165,116,0.1);border-radius:3px}#_ps_modpanel ::-webkit-scrollbar-thumb{background:#d4a574;border-radius:3px}#_ps_modpanel input:focus{outline:none;border-color:#c0392b}';
        document.head.appendChild(styleEl);

        function _row(labelText) {
            var r = document.createElement('div');
            r.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:5px 2px;border-bottom:1px solid rgba(212,165,116,0.25);';
            var l = document.createElement('span');
            l.textContent = labelText;
            l.style.cssText = 'color:#6b4226;font-weight:500;font-size:11px;';
            r.appendChild(l);
            body.appendChild(r);
            return r;
        }

        function _btn(text, color, fn) {
            var b = document.createElement('button');
            b.textContent = text;
            b.style.cssText = 'background:' + (color || '#d4a574') + ';color:#fff;border:none;border-radius:6px;padding:3px 10px;cursor:pointer;font-size:10px;font-weight:600;transition:transform 0.15s;box-shadow:0 1px 3px rgba(0,0,0,0.1);';
            b.onclick = fn;
            b.onmouseenter = function(){ b.style.transform = 'scale(1.05)'; };
            b.onmouseleave = function(){ b.style.transform = 'scale(1)'; };
            return b;
        }

        function _statRow(label, setFn) {
            var r = _row(label);
            var val = document.createElement('span');
            val.textContent = '?';
            val.style.cssText = 'color:#c0392b;font-weight:bold;font-size:11px;';
            r.insertBefore(val, r.lastChild);
            var b = _btn('MAX', '#c0392b', function(){
                var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
                if (!p) return;
                try { setFn(p); val.textContent = '✓'; val.style.color = '#27ae60'; setTimeout(function(){ val.style.color = '#c0392b'; }, 1000); } catch(e) { val.textContent = '✗'; }
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
                if (!newState && offFn) { try { offFn(); } catch(e) {} }
            });
            r.appendChild(b);
        }

        // 背景透明度滑桿
        var bgRow = document.createElement('div');
        bgRow.style.cssText = 'padding:6px 2px;border-bottom:1px solid rgba(212,165,116,0.25);';
        var bgLabel = document.createElement('div');
        bgLabel.textContent = '背景透明度: 50%';
        bgLabel.style.cssText = 'color:#6b4226;font-weight:500;font-size:11px;margin-bottom:4px;';
        bgRow.appendChild(bgLabel);
        var bgSlider = document.createElement('input');
        bgSlider.type = 'range';
        bgSlider.min = 0;
        bgSlider.max = 100;
        bgSlider.value = 50;
        bgSlider.style.cssText = 'width:100%;accent-color:#d4a574;';
        bgSlider.oninput = function(){
            var v = parseInt(bgSlider.value) / 100;
            window._mp_bgalpha = v;
            updateBg();
            bgLabel.textContent = '背景透明度: ' + bgSlider.value + '%';
        };
        bgRow.appendChild(bgSlider);
        body.appendChild(bgRow);

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
            input.style.cssText = 'width:70px;background:rgba(255,255,255,0.7);color:#5a3e2b;border:1px solid #d4a574;border-radius:6px;padding:3px 8px;font-size:11px;text-align:right;font-family:inherit;';
            var b = _btn('SET', '#8b5a2b', function(){
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

        _toggle('God Mode', 'godmode', 'ON', 'OFF', '#27ae60', '#d4a574');
        _toggle('Kill Aura', 'killaura', 'ON', 'OFF', '#c0392b', '#d4a574');
        _toggle('ATK Lock', 'atklock', 'ON', 'OFF', '#c0392b', '#d4a574', function(){
            var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
            if (p) try { p.atkMul = 1; } catch(e){}
        });
        _toggle('SPD Lock', 'spdlock', 'ON', 'OFF', '#2980b9', '#d4a574', function(){
            var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
            if (p) try { p.spd = 1; p.speed = 1; p.baseSpd = 1; p.spdMul = 1; } catch(e){}
        });
        _toggle('XP Boost', 'xpboost', 'ON', 'OFF', '#27ae60', '#d4a574');
        _toggle('Magnet Lock', 'magnetlock', 'ON', 'OFF', '#e84393', '#d4a574', function(){
            var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
            if (p) try { p.magnet = 12; p.magnetMul = 1; } catch(e){}
        });
        _toggle('No Cooldown', 'nocd', 'ON', 'OFF', '#f39c12', '#d4a574', function(){
            var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
            if (p) try { p.cdMul = 1; } catch(e){}
        });
        _toggle('Inf Reroll', 'infre', 'ON', 'OFF', '#8e44ad', '#d4a574');

        // === 遊戲控制 ===
        var sep2 = document.createElement('div');
        sep2.textContent = '✦ Game Control ✦';
        sep2.style.cssText = 'color:#8b5a2b;padding:8px 0 3px;font-size:10px;font-weight:600;border-top:1px solid #d4a574;margin-top:8px;text-align:center;letter-spacing:1px;';
        body.appendChild(sep2);

        // 速度控制
        function _speedBtn(label, speed) {
            var r = _row(label);
            var b = _btn('×' + speed, '#2980b9', function(){
                try {
                    if (window.GAME.Game.debugSpeed) {
                        window.GAME.Game.debugSpeed(speed);
                    }
                } catch(e) {}
            });
            r.appendChild(b);
        }
        _speedBtn('慢動作', 0.3);
        _speedBtn('正常速', 1);
        _speedBtn('加速 2x', 2);
        _speedBtn('加速 4x', 4);

        // === 時間跳躍 ===
        var sep3 = document.createElement('div');
        sep3.textContent = '✦ Time Jump ✦';
        sep3.style.cssText = 'color:#8b5a2b;padding:8px 0 3px;font-size:10px;font-weight:600;border-top:1px solid #d4a574;margin-top:8px;text-align:center;letter-spacing:1px;';
        body.appendChild(sep3);

        function _timeBtn(label, seconds) {
            var r = _row(label);
            var b = _btn(seconds + 's', '#e67e22', function(){
                var G = window.GAME;
                if (!G || !G.Game || !G.Game.st) { alert('no game state'); return; }
                try {
                    var st = G.Game.st;
                    // 用 defineProperty 覆蓋 getter 成固定值
                    Object.defineProperty(st, 'time', {
                        value: seconds,
                        writable: true,
                        configurable: true,
                        enumerable: true
                    });
                    // 1 秒後恢復成 getter（讓時間繼續跑）
                    setTimeout(function(){
                        try {
                            // 把 time 改回 getter，讀取時回傳當前設的值 + 經過的時間
                            var baseTime = seconds;
                            var startTime = Date.now();
                            Object.defineProperty(st, 'time', {
                                get: function() { return baseTime + (Date.now() - startTime) / 1000; },
                                configurable: true,
                                enumerable: true
                            });
                        } catch(e){}
                    }, 500);
                    alert('time set to ' + seconds + 's\n0.5 秒後恢復正常計時');
                } catch(e) { alert('err: ' + e.message); }
            });
            r.appendChild(b);
        }
        _timeBtn('5 分鐘', 300);
        _timeBtn('10 分鐘', 600);
        _timeBtn('20 分鐘', 1200);
        _timeBtn('30 分鐘', 1800);
        _timeBtn('34 分鐘', 2040);

        // === 召喚首領 ===
        var sepBoss = document.createElement('div');
        sepBoss.textContent = '✦ Boss ✦';
        sepBoss.style.cssText = 'color:#8b5a2b;padding:8px 0 3px;font-size:10px;font-weight:600;border-top:1px solid #d4a574;margin-top:8px;text-align:center;letter-spacing:1px;';
        body.appendChild(sepBoss);

        // boss 選單
        var bossRow = document.createElement('div');
        bossRow.style.cssText = 'padding:6px 2px;';
        var bossSelect = document.createElement('select');
        bossSelect.style.cssText = 'width:100%;background:rgba(255,255,255,0.8);color:#5a3e2b;border:1px solid #d4a574;border-radius:6px;padding:4px;font-size:11px;font-family:inherit;';
        var bossList = [
            [3, 'Venusaur 妙蛙花'], [6, 'Charizard 噴火龍'], [9, 'Blastoise 水箭龜'],
            [65, 'Alakazam 胡地'], [68, 'Machamp 怪力'], [76, 'Golem 隆隆岩'],
            [94, 'Gengar 耿鬼'], [130, 'Gyarados 暴鯉龍'], [131, 'Lapras 拉普拉斯'],
            [143, 'Snorlax 卡比獸'], [149, 'Dragonite 快龍'], [150, 'Mewtwo 超夢'],
            [151, 'Mew 夢幻'], [144, 'Articuno 急凍鳥'], [145, 'Zapdos 閃電鳥'], [146, 'Moltres 火焰鳥']
        ];
        for (var bi = 0; bi < bossList.length; bi++) {
            var opt = document.createElement('option');
            opt.value = bossList[bi][0];
            opt.textContent = bossList[bi][1];
            bossSelect.appendChild(opt);
        }
        bossRow.appendChild(bossSelect);
        body.appendChild(bossRow);

        var bossBtn = _btn('召喚首領', '#c0392b', function(){
            var G = window.GAME;
            if (!G || !G.Game || !G.Game.player) { alert('no player'); return; }
            var p = G.Game.player;
            try {
                var dexNum = parseInt(bossSelect.value);
                // 直接構造 def 物件 {dex: 數字}
                var bossDef = {'dex': dexNum};
                // 先 preload sprite
                if (G.Sprites && G.Sprites.preload) {
                    try { G.Sprites.preload([dexNum]); } catch(e){}
                }
                // scale 物件 — 用大 HP 防止立刻死亡
                var scale = {'hp':10,'spd':1,'dmg':1};
                // 構造 boss（isBoss=true）— 召喚在玩家旁邊（小距離，防超出地圖）
                var enemy = new G.Enemy(bossDef, p.x + 5, p.y + 5, scale, true);
                if (enemy && G.EnemyMgr && G.EnemyMgr.add) {
                    // 強制設大 HP（不管 maxHp 是多少）
                    try {
                        enemy.maxHp = 99999;
                        enemy.hp = 99999;
                        // 也設 def 裡的 hp（遊戲可能讀 def.hp）
                        if (enemy.def) {
                            enemy.def.hp = 99999;
                        }
                        bossDef.hp = 99999;
                    } catch(e){}
                    G.EnemyMgr.add(enemy);
                    window._mp_bossprotect = enemy;
                    alert('boss: ' + (enemy.name || '?') + '\nhp: ' + enemy.hp + '\nmaxHp: ' + enemy.maxHp);
                } else {
                    alert('Enemy 建構失敗');
                }
            } catch(e) { alert('err: ' + e.message); }
        });
        bossBtn.style.cssText = 'width:100%;margin-top:4px;padding:6px;background:#c0392b;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;';
        body.appendChild(bossBtn);

        // === 加技能 ===
        var sep3b = document.createElement('div');
        sep3b.textContent = '✦ Add Move ✦';
        sep3b.style.cssText = 'color:#8b5a2b;padding:8px 0 3px;font-size:10px;font-weight:600;border-top:1px solid #d4a574;margin-top:8px;text-align:center;letter-spacing:1px;';
        body.appendChild(sep3b);

        var moveList = [
            ['tackle','Placaje','melee'],['scratch','Arañazo','melee'],['ember','Ascuas','projectile'],
            ['flamethrower','Lanzallamas','cone'],['heat-wave','Onda Ígnea','nova'],['bubble','Burbuja','nova'],
            ['hydro-pump','Hidrobomba','beam'],['aqua-ring','Acua Aro','buff'],['vine-whip','Látigo Cepa','melee'],
            ['razor-leaf','Hoja Afilada','boomerang'],['leaf-storm','Tormenta Floral','orbit'],
            ['giga-drain','Hierba Lazo','aura'],['thunder-shock','Impactrueno','projectile'],
            ['discharge','Chispazo','aura'],['thunderbolt','Rayo','chain'],['psybeam','Psicorrayo','beam'],
            ['psychic','Psíquico','nova'],['mud-shot','Disparo Lodo','nova'],['gust','Tornado','orbit'],
            ['quick-attack','Ataque Rápido','melee'],['swords-dance','Danza Espada','buff'],
            ['nasty-plot','Maquinación','buff'],['agility','Agilidad','buff'],['harden','Fortaleza','buff'],
            ['bite','Mordisco','melee'],['body-slam','Golpe Cuerpo','melee'],['air-slash','Tajo Aéreo','melee'],
            ['ancient-power','Poder Pasado','projectile'],['bubble-beam','Rayo Burbuja','beam'],
            ['bug-bite','Picadura','melee'],['bug-buzz','Zumbido','aura'],['bulldoze','Terratemblor','nova'],
            ['acid-spray','Ácido','projectile'],['bonemerang','Huesomerang','boomerang']
        ];

        var moveRow = document.createElement('div');
        moveRow.style.cssText = 'padding:6px 2px;';
        var moveSelect = document.createElement('select');
        moveSelect.style.cssText = 'width:100%;background:rgba(255,255,255,0.8);color:#5a3e2b;border:1px solid #d4a574;border-radius:6px;padding:4px;font-size:11px;font-family:inherit;';
        for (var mi = 0; mi < moveList.length; mi++) {
            var opt = document.createElement('option');
            opt.value = moveList[mi][0];
            opt.textContent = moveList[mi][1] + ' (' + moveList[mi][2] + ')';
            moveSelect.appendChild(opt);
        }
        moveRow.appendChild(moveSelect);
        body.appendChild(moveRow);

        var addMoveBtn = _btn('加入技能', '#27ae60', function(){
            var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
            if (!p) { alert('no player - start a run first'); return; }
            var moveId = moveSelect.value;
            try {
                var G = window.GAME;
                if (G.Moves && G.Moves.instance) {
                    var moveInstance = G.Moves.instance(moveId, 1);
                    if (moveInstance) {
                        try { moveInstance.since = G.Game.st ? G.Game.st.time : 0; } catch(e){}
                        // 擴大 maxMoves 限制
                        if (!p.maxMoves || p.maxMoves < 10) p.maxMoves = 10;
                        // 加到 slots（push 不覆蓋）
                        if (!p.slots) p.slots = [];
                        p.slots.push([moveInstance]);
                        // 也加到 moves
                        if (!p.moves) p.moves = [];
                        p.moves.push(moveInstance);
                        // 設 active 為最新的
                        try { p.active = p.slots.length - 1; } catch(e){}
                        alert('added: ' + moveId + '\nslots: ' + p.slots.length + '\nmaxMoves: ' + p.maxMoves);
                    } else {
                        alert('instance returned null for: ' + moveId);
                    }
                }
            } catch(e) { alert('error: ' + e.message); }
        });
        addMoveBtn.style.cssText = 'width:100%;margin-top:4px;padding:6px;background:#27ae60;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;';
        body.appendChild(addMoveBtn);

        var clearMovesBtn = _btn('清空所有技能', '#c0392b', function(){
            var p = window.GAME && window.GAME.Game && window.GAME.Game.player;
            if (!p) { alert('no player'); return; }
            try {
                if (p.slots) p.slots.length = 0;
                if (p.moves) p.moves.length = 0;
                p.active = 0;
                alert('cleared!\nslots: ' + (p.slots ? p.slots.length : 'none') + '\nmoves: ' + (p.moves ? p.moves.length : 'none'));
            } catch(e) { alert('err: ' + e.message); }
        });
        clearMovesBtn.style.cssText = 'width:100%;margin-top:4px;padding:6px;background:#c0392b;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;';
        body.appendChild(clearMovesBtn);

        // === Save / Money / Tickets 區塊 ===
        var sep1 = document.createElement('div');
        sep1.textContent = '✦ Save / Money ✦';
        sep1.style.cssText = 'color:#8b5a2b;padding:8px 0 3px;font-size:10px;font-weight:600;border-top:1px solid #d4a574;margin-top:8px;text-align:center;letter-spacing:1px;';
        body.appendChild(sep1);

        // 顯示目前 save 值
        var saveInfo = document.createElement('div');
        saveInfo.style.cssText = 'color:#6b4226;font-size:10px;padding:3px 2px;background:rgba(255,255,255,0.4);border-radius:4px;margin:2px 0;';
        body.appendChild(saveInfo);

        // 設定 coins
        function _saveInputRow(label, placeholder, getFn, setFn) {
            var r = _row(label);
            var input = document.createElement('input');
            input.type = 'number';
            input.placeholder = placeholder;
            input.style.cssText = 'width:70px;background:rgba(255,255,255,0.7);color:#5a3e2b;border:1px solid #d4a574;border-radius:6px;padding:3px 8px;font-size:11px;text-align:right;font-family:inherit;';
            var b = _btn('SET', '#8b5a2b', function(){
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
        _saveInputRow('Candy', 'candy', function(s){return s.bag && s.bag.candy;}, function(s, v){ if(!s.bag) s.bag = {}; s.bag.candy = v; });

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
                if (!s.bag) s.bag = {};
                s.bag.candy = 9999;
                saveInfo.textContent = 'MAX done';
                if (G.DB.commit) try { G.DB.commit(); saveInfo.textContent = 'MAX done + committed'; } catch(e){}
                else if (G.DB.saveNow) try { G.DB.saveNow(); } catch(e){}
            } catch(e) { saveInfo.textContent = 'err: ' + e.message; }
        });
        maxBtn.style.cssText = 'width:100%;margin-top:6px;padding:8px;background:linear-gradient(135deg,#c0392b,#8b0000);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:600;transition:transform 0.15s;box-shadow:0 2px 6px rgba(192,57,43,0.3);';
        maxBtn.onmouseenter = function(){ maxBtn.style.transform = 'scale(1.02)'; };
        maxBtn.onmouseleave = function(){ maxBtn.style.transform = 'scale(1)'; };
        body.appendChild(maxBtn);

        var status = document.createElement('div');
        status.textContent = 'waiting...';
        status.style.cssText = 'color:#8b5a2b;padding:6px 2px;font-size:10px;text-align:center;border-top:1px solid rgba(212,165,116,0.3);margin-top:4px;font-style:italic;';
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
            // 時間鎖定
            if (window._mp_jumptime && window.GAME && window.GAME.Game && window.GAME.Game.st) {
                try {
                    window.GAME.Game.st.time = window._mp_jumptime;
                } catch(e){}
            }
            // 保護 boss HP 不被殺
            if (window._mp_bossprotect) {
                try {
                    var b = window._mp_bossprotect;
                    if (b) {
                        if (b.maxHp !== 99999) b.maxHp = 99999;
                        if (b.hp < 99999) b.hp = 99999;
                        if (b.dead) b.dead = false;
                    }
                } catch(e){}
            }
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
                    saveInfo.textContent = 'coins:' + (sv.coins||0) + ' t1:' + (sv.tickets?sv.tickets.t1:0) + ' t10:' + (sv.tickets?sv.tickets.t10:0) + ' candy:' + (sv.bag?sv.bag.candy||0:0);
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
