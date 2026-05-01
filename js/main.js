let duelState = null;
let screens = {};
let activeCardCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
    screens = {
        start: document.getElementById('start-screen'),
        game: document.getElementById('game-screen'),
        rules: document.getElementById('rules-screen'),
        end: document.getElementById('end-screen')
    };

    const aiCountSlider = document.getElementById('ai-count');
    const aiCountDisplay = document.getElementById('ai-count-display');
    if (aiCountSlider && aiCountDisplay) {
        aiCountSlider.addEventListener('input', (e) => {
            aiCountDisplay.textContent = e.target.value;
        });
    }

    const startBtn = document.getElementById('btn-start');
    if (startBtn) startBtn.addEventListener('click', startGame);

    const rulesBtn = document.getElementById('btn-rules');
    if (rulesBtn) rulesBtn.addEventListener('click', () => showScreen('rules'));

    const backBtn = document.getElementById('btn-back');
    if (backBtn) backBtn.addEventListener('click', () => showScreen('start'));

    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) restartBtn.addEventListener('click', restartGame);

    const fleeBtn = document.getElementById('btn-flee');
    if (fleeBtn) {
        fleeBtn.addEventListener('click', () => {
            if (confirm('确定要逃跑吗？')) {
                fleeGame();
            }
        });
    }

    const endTurnBtn = document.getElementById('btn-end-turn');
    if (endTurnBtn) {
        endTurnBtn.addEventListener('click', () => {
            const p = game.players.find(pl => pl.id === 'player');
            if (p) game.endTurnAfterCard(p);
        });
    }

    const adminToggle = document.getElementById('admin-mode-toggle');
    if (adminToggle) {
        adminToggle.addEventListener('change', (e) => {
            game.adminMode = e.target.checked;
            showMessage(game.adminMode ? '管理员模式已开启' : '管理员模式已关闭');
            updateUI();
        });
    }

    const autoRpsToggle = document.getElementById('auto-rps-toggle');
    if (autoRpsToggle) {
        autoRpsToggle.addEventListener('change', (e) => {
            game.autoRPS = e.target.checked;
            showMessage(game.autoRPS ? '自动猜拳已开启' : '自动猜拳已关闭');
        });
    }

    document.querySelectorAll('.rps-btn-inline').forEach(btn => {
        btn.addEventListener('click', () => {
            handleRPSResult(btn.dataset.choice);
        });
    });

    document.querySelectorAll('.duel-rps-btn-inline').forEach(btn => {
        btn.addEventListener('click', () => {
            handleDuelRPS(btn.dataset.choice);
        });
    });
});

function showScreen(name) {
    if (!screens[name]) return;
    Object.values(screens).forEach(s => {
        if (!s) return;
        s.classList.remove('active');
        s.style.zIndex = '';
    });
    screens[name].classList.add('active');
    screens[name].style.zIndex = '10';
}

function startGame() {
    if (typeof Game === 'undefined') {
        console.error("Game class not found");
        return;
    }
    
    const aiCountEl = document.getElementById('ai-count');
    const aiCount = aiCountEl ? parseInt(aiCountEl.value) : 1;
    
    game = new Game();
    game.init(aiCount);
    game.autoRPS = document.getElementById('auto-rps-toggle')?.checked || false;
    game.adminMode = document.getElementById('admin-mode-toggle')?.checked || false;
    
    duelState = null;
    activeCardCategory = 'all';
    
    document.getElementById('rps-zone')?.style.setProperty('display', 'none', 'important');
    document.getElementById('duel-inline-zone')?.style.setProperty('display', 'none', 'important');
    
    showScreen('game');
    updateUI();
    setTimeout(() => game.startRound(), 500);
}

function restartGame() {
    game = new Game();
    game.autoRPS = document.getElementById('auto-rps-toggle')?.checked || false;
    game.adminMode = document.getElementById('admin-mode-toggle')?.checked || false;
    showScreen('start');
}

function fleeGame() {
    if (typeof game !== 'undefined') game.isProcessing = false;
    duelState = null;
    activeCardCategory = 'all';
    document.getElementById('rps-zone')?.style.setProperty('display', 'none', 'important');
    document.getElementById('duel-inline-zone')?.style.setProperty('display', 'none', 'important');
    showMessage('你已逃跑');
    setTimeout(() => showScreen('start'), 1000);
}

function handleRPSResult(playerChoice) {
    const active = game.getActivePlayers();
    const choices = { 'player': playerChoice };
    active.forEach(p => { if (p.id !== 'player') choices[p.id] = ai.chooseRPS(); });
    document.querySelectorAll('.rps-btn-inline').forEach(b => b.disabled = true);
    game.resolveMultiRPS(choices);
}

function showDuelInline(attacker, defender, type) {
    document.getElementById('rps-zone')?.style.setProperty('display', 'none', 'important');
    document.getElementById('duel-inline-zone')?.style.display = 'flex';

    document.getElementById('duel-inline-atk').textContent = attacker.name;
    document.getElementById('duel-inline-def').textContent = defender.name;
    
    const titles = { juedou: '💥 决斗', quantum: '⚛️ 量子力学', hall: '🧲 霍尔元件', electrolytic: '⚡ 电解池', chromosome: '🧬 染色体畸变', gulliver: '📏 格列佛' };
    const rules = {
        juedou: '出牌方赢1把扣血，防守方连赢2把扣血',
        quantum: '第一次猜拳判定谁被量子，第二次猜拳决定被量子者血量',
        hall: '赢者HP=5，输者HP=双方原HP和-5',
        electrolytic: '猜拳至防守方赢，奇数次未赢-1HP，偶数次未赢-2HP',
        chromosome: '两次猜拳改变双方外貌状态（帅/正常/丑）',
        gulliver: '两次猜拳改变双方体型状态（大/正常/小）'
    };
    document.getElementById('duel-inline-title').textContent = titles[type] || '对决';
    document.getElementById('duel-inline-log').innerHTML = '';
    document.getElementById('duel-inline-result').textContent = rules[type] || '';

    duelState = { attacker, defender, type, defWins: 0, failureCount: 0, atkHp: attacker.hp, defHp: defender.hp, lastResult: 'draw', firstDirection: null, phase: 0, quantumTarget: null };

    game.isProcessing = false;

    if (attacker.id !== 'player' && defender.id !== 'player') {
        document.querySelectorAll('.duel-rps-btn-inline').forEach(b => b.disabled = true);
        runAutoDuel();
    } else {
        document.querySelectorAll('.duel-rps-btn-inline').forEach(b => b.disabled = false);
    }
}

function runAutoDuel() {
    if (!duelState) return;
    handleDuelRPS(ai.chooseRPS());
    if (duelState) {
        setTimeout(runAutoDuel, 800);
    }
}

function handleDuelRPS(choice) {
    if (!duelState) return;
    const isPlayerAtk = duelState.attacker.id === 'player';
    const isPlayerDef = duelState.defender.id === 'player';

    let atkChoice, defChoice;
    if (isPlayerAtk) { atkChoice = choice; defChoice = ai.chooseRPS(); }
    else if (isPlayerDef) { atkChoice = ai.chooseRPS(); defChoice = choice; }
    else { atkChoice = choice; defChoice = ai.chooseRPS(); }

    const res = rpsBeats(atkChoice, defChoice);
    const log = document.getElementById('duel-inline-log');
    const entry = document.createElement('div');
    entry.className = 'duel-log-entry';
    entry.innerHTML = `<span class="rps-emoji">${RPS[atkChoice].emoji}</span> vs <span class="rps-emoji">${RPS[defChoice].emoji}</span>`;

    duelState.lastResult = res;
    let shouldEnd = false;
    if (duelState.type === 'juedou') {
        if (res === 'win') { entry.innerHTML += ' <span class="rps-win">→ 出牌方赢</span>'; shouldEnd = true; }
        else if (res === 'lose') {
            duelState.defWins++;
            entry.innerHTML += ` <span class="rps-lose">→ 防守方赢(${duelState.defWins}/2)</span>`;
            if (duelState.defWins >= 2) shouldEnd = true;
        } else { entry.innerHTML += ' <span class="rps-text">→ 平局</span>'; }
    } else if (duelState.type === 'quantum') {
        if (duelState.phase === 0) {
            if (res === 'win') {
                duelState.quantumTarget = 'defender';
                entry.innerHTML += ` <span class="rps-win">→ 出牌方胜！防守方被量子</span>`;
            } else if (res === 'lose') {
                duelState.quantumTarget = 'attacker';
                entry.innerHTML += ` <span class="rps-lose">→ 防守方胜！出牌方被量子</span>`;
            } else {
                entry.innerHTML += ' <span class="rps-text">→ 平局，继续猜拳</span>';
                log.appendChild(entry); log.scrollTop = log.scrollHeight;
                return;
            }
            duelState.phase = 1;
            duelState.failureCount = 0;
            entry.innerHTML += '<br><span style="color:#888;font-size:11px">第二次猜拳：决定被量子者血量</span>';
        } else {
            duelState.failureCount++;
            if (res !== 'draw') {
                entry.innerHTML += ` <span class="rps-win">→ 有人获胜！(共${duelState.failureCount}轮)</span>`;
                shouldEnd = true;
            } else {
                entry.innerHTML += ' <span class="rps-text">→ 平局，继续猜拳</span>';
            }
        }
    } else if (duelState.type === 'hall') {
        if (res !== 'draw') shouldEnd = true;
        entry.innerHTML += res === 'win' ? ' <span class="rps-win">→ 出牌方胜</span>' :
                           res === 'lose' ? ' <span class="rps-lose">→ 防守方胜</span>' :
                           ' <span class="rps-text">→ 平局</span>';
    } else if (duelState.type === 'electrolytic') {
        duelState.failureCount++;
        if (res === 'lose') {
            entry.innerHTML += ` <span class="rps-win">→ 防守方赢，出牌方-1HP！</span>`;
            duelState.attacker.hp -= 1;
            game.applyHpMod(duelState.attacker); game.checkDying(duelState.attacker);
            shouldEnd = true;
        } else {
            const isOdd = duelState.failureCount % 2 === 1;
            const dmg = isOdd ? 1 : 2;
            duelState.defender.hp -= dmg;
            game.applyHpMod(duelState.defender); game.checkDying(duelState.defender);
            entry.innerHTML += ` <span class="rps-lose">→ 防守方未赢，-${dmg}HP(当前${duelState.defender.hp})</span>`;
        }
    } else if (duelState.type === 'chromosome' || duelState.type === 'gulliver') {
        if (duelState.phase === 0) {
            if (res === 'win') {
                duelState.firstDirection = duelState.type === 'chromosome' ? 'ugly' : 'small';
                entry.innerHTML += ` <span class="rps-win">→ 出牌方胜！防守方将${duelState.firstDirection === 'ugly' ? '变丑' : '变小'}</span>`;
            } else if (res === 'lose') {
                duelState.firstDirection = duelState.type === 'chromosome' ? 'handsome' : 'big';
                entry.innerHTML += ` <span class="rps-lose">→ 防守方胜！防守方将${duelState.firstDirection === 'handsome' ? '变帅' : '变大'}</span>`;
            } else {
                entry.innerHTML += ' <span class="rps-text">→ 平局，继续猜拳</span>';
                log.appendChild(entry); log.scrollTop = log.scrollHeight;
                return;
            }
            duelState.phase = 1;
            entry.innerHTML += '<br><span style="color:#888;font-size:11px">第二次猜拳：至有人获胜</span>';
        } else {
            if (res === 'win') {
                entry.innerHTML += ` <span class="rps-win">→ 出牌方胜！防守方状态改变</span>`;
            } else if (res === 'lose') {
                entry.innerHTML += ` <span class="rps-lose">→ 防守方胜！出牌方状态改变</span>`;
            } else {
                entry.innerHTML += ' <span class="rps-text">→ 平局，继续猜拳</span>';
                log.appendChild(entry); log.scrollTop = log.scrollHeight;
                return;
            }
            shouldEnd = true;
        }
    }

    log.appendChild(entry); log.scrollTop = log.scrollHeight;

    if (duelState.type === 'electrolytic') {
        updatePlayersUI();
        document.querySelectorAll('.duel-rps-btn-inline').forEach(b => b.disabled = false);
        if (shouldEnd) {
            updateUI();
            resolveDuelEnd();
        }
    } else {
        updateUI();
        if (shouldEnd) resolveDuelEnd();
    }
}

function resolveDuelEnd() {
    const { attacker, defender, type, failureCount } = duelState;

    if (type === 'juedou') {
        const t = (duelState.defWins >= 2) ? attacker : defender;
        const dmg = 1 + (t.hasWine ? 1 : 0); t.hasWine = false;
        t.hp -= dmg; game.applyHpMod(t); game.checkDying(t);
        showMessage(`决斗结束！${t.name} 受到${dmg}点伤害`);
    } else if (type === 'quantum') {
        const target = duelState.quantumTarget === 'attacker' ? attacker : defender;
        target.hp = duelState.failureCount;
        game.applyHpMod(target);
        game.checkDying(target);
        const who = duelState.quantumTarget === 'attacker' ? attacker.name : defender.name;
        showMessage(`量子力学结束！${who} 被量子，体力变为${target.hp}`);
    } else if (type === 'hall') {
        const { atkHp, defHp, lastResult } = duelState;
        const sum = atkHp + defHp;
        if (lastResult === 'win') {
            attacker.hp = 5; defender.hp = sum - 5;
            showMessage(`霍尔元件结束！${attacker.name} HP=5，${defender.name} HP=${sum - 5}`);
        } else if (lastResult === 'lose') {
            defender.hp = 5; attacker.hp = sum - 5;
            showMessage(`霍尔元件结束！${defender.name} HP=5，${attacker.name} HP=${sum - 5}`);
        } else {
            attacker.hp = atkHp; defender.hp = defHp;
            showMessage(`霍尔元件平局！双方HP不变`);
        }
        game.applyHpMod(attacker); game.checkDying(attacker);
        game.applyHpMod(defender); game.checkDying(defender);
    } else if (type === 'electrolytic') {
        showMessage(`电解池结束！共进行了${failureCount}轮猜拳`);
    } else if (type === 'chromosome') {
        const dir = duelState.firstDirection;
        const defenderNew = changeState(defender.appearance, dir);
        defender.appearance = defenderNew;
        const defenderLabel = dir === 'handsome' ? '变帅' : '变丑';
        showMessage(`染色体畸变第一次：${defender.name} ${defenderLabel}（当前：${defender.appearance === 'handsome' ? '帅' : defender.appearance === 'ugly' ? '丑' : '正常'}）`);
        
        const secondTarget = duelState.lastResult === 'lose' ? attacker : defender;
        const secondNew = changeState(secondTarget.appearance, dir);
        secondTarget.appearance = secondNew;
        showMessage(`染色体畸变第二次：${secondTarget.name} 状态变为${secondNew === 'handsome' ? '帅' : secondNew === 'ugly' ? '丑' : '正常'}`);
    } else if (type === 'gulliver') {
        const dir = duelState.firstDirection;
        const defenderNew = changeState(defender.size, dir);
        defender.size = defenderNew;
        const defenderLabel = dir === 'big' ? '变大' : '变小';
        showMessage(`格列佛第一次：${defender.name} ${defenderLabel}（当前：${defender.size === 'big' ? '大' : defender.size === 'small' ? '小' : '正常'}）`);
        
        const secondTarget = duelState.lastResult === 'lose' ? attacker : defender;
        const secondNew = changeState(secondTarget.size, dir);
        secondTarget.size = secondNew;
        showMessage(`格列佛第二次：${secondTarget.name} 状态变为${secondNew === 'big' ? '大' : secondNew === 'small' ? '小' : '正常'}`);
    }

    duelState = null;
    document.getElementById('rps-zone')?.style.setProperty('display', 'none', 'important');
    document.getElementById('duel-inline-zone')?.style.display = 'none';
    updateUI();
    if (game.checkWin()) return;
    
    if (type === 'hall' || type === 'electrolytic' || type === 'chromosome' || type === 'gulliver') {
        const user = attacker;
        showMessage('继续出牌或结束回合');
        setTimeout(() => game.endTurnAfterCard(user), 1000);
    } else {
        showMessage('开始下一回合');
        setTimeout(() => game.startRound(), 1500);
    }
}

function updateUI() {
    updatePlayersUI();
    updatePlayArea();
    updateHandCards();
}

function updatePlayersUI() {
    const container = document.getElementById('players-container');
    if (!container) return; container.innerHTML = '';

    const isTargeting = !!game.pendingTarget;

    game.players.filter(p => p.id !== 'player' && p.alive).forEach(p => {
        const area = document.createElement('div');
        area.className = 'ai-player-area';
        const isActive = game.currentActivePlayerId === p.id;
        if (isActive && game.adminMode) area.classList.add('ai-active-turn');
        if (isTargeting && p.independentRounds <= 0) area.classList.add('targetable');
        const indep = p.independentRounds > 0 ? '🌀独立' : '';
        const wine = p.hasWine ? '🍶' : '';
        const dying = game.dyingInfo[p.id]?.dying ? '💀濒死' : '';

        let cardsHtml = '';
        if (game.adminMode && isActive && p.independentRounds <= 0 && !game.pendingTarget) {
            cardsHtml = `<div class="ai-admin-cards active">
                ${CARD_TYPES.map(c => `<div class="card admin-ai-card" data-card-id="${c.id}"><span class="card-suit">${c.emoji}</span><span class="card-name">${c.name}</span></div>`).join('')}
            </div>
            <div class="ai-admin-end-turn"><button class="btn-action btn-end-turn-ai" data-ai-id="${p.id}">结束回合</button></div>`;
        }

        const armorDisplay = p.armor ? `<span class="armor-status">${p.armor.emoji}${p.armor.name}</span>` : '';
        const appearanceDisplay = p.appearance === 'handsome' ? '<span class="appearance-status" style="color:#4a9e4a">😎帅</span>' :
                                  p.appearance === 'ugly' ? '<span class="appearance-status" style="color:#ff4444">🤢丑</span>' : '';
        const sizeDisplay = p.size === 'big' ? '<span class="size-status" style="color:#4a9e4a">🐘大</span>' :
                            p.size === 'small' ? '<span class="size-status" style="color:#ff8b94">🐜小</span>' : '';
        area.innerHTML = `
            <div class="ai-player-info">
                <div class="ai-avatar">🤖</div>
                <div class="ai-details">
                    <div class="ai-name">${p.name} ${indep}</div>
                    <div class="ai-health">
                        ${Array.from({length: 9}, (_, i) => `<div class="health-pip ${i >= Math.max(0, p.hp) ? 'empty' : ''}"></div>`).join('')}
                        <span class="hp-text">${p.hp}</span>
                        <span class="wine-status">${wine}${dying}</span>
                        ${armorDisplay}
                        ${appearanceDisplay}
                        ${sizeDisplay}
                    </div>
                </div>
            </div>
            ${cardsHtml}`;

        if (isTargeting && p.independentRounds <= 0) {
            area.addEventListener('click', (e) => {
                if (e.target.closest('.admin-ai-card') || e.target.closest('.btn-end-turn-ai')) return;
                const { card, who } = game.pendingTarget;
                game.pendingTarget = null;
                game.playCard(who, card, p);
            });
        }

        if (game.adminMode && isActive && p.independentRounds <= 0 && !game.pendingTarget) {
            area.querySelectorAll('.admin-ai-card').forEach(cardEl => {
                cardEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const cardId = cardEl.dataset.cardId;
                    const card = CARD_TYPES.find(c => c.id === cardId);
                    if (!card) return;

                    if (card.singleTarget) {
                        game.pendingTarget = { card, who: p };
                        showMessage(`点击选择【${p.name}】的【${card.name}】的目标`);
                        updateUI();
                    } else {
                        game.playCard(p, card);
                    }
                });
            });

            const endBtn = area.querySelector('.btn-end-turn-ai');
            if (endBtn) {
                endBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    game.pendingTarget = null;
                    game.endTurnAfterCard(p);
                });
            }
        }
        container.appendChild(area);
    });

    const player = game.players.find(p => p.id === 'player');
    if (!player) return;
    const avatar = document.getElementById('player-avatar');
    if (isTargeting && player.independentRounds <= 0) {
        avatar.style.cursor = 'pointer';
        avatar.style.border = '3px solid var(--secondary)';
        avatar.onclick = () => {
            const { card, who } = game.pendingTarget;
            game.pendingTarget = null;
            game.playCard(who, card, player);
        };
    } else {
        avatar.style.cursor = '';
        avatar.style.border = '';
        avatar.onclick = null;
    }
    const hpCon = document.getElementById('player-health');
    if (hpCon) {
        hpCon.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const pip = document.createElement('div');
            pip.className = `health-pip ${i >= Math.max(0, player.hp) ? 'empty' : ''}`;
            if (player.hp < 0) pip.classList.add('dead');
            hpCon.appendChild(pip);
        }
    }
    const hpt = document.getElementById('player-hp-text'); if (hpt) hpt.textContent = player.hp;
    const wine = document.getElementById('player-wine'); if (wine) wine.textContent = player.hasWine ? '🍶' : '';
    const indep = document.getElementById('player-independent'); if (indep) indep.textContent = player.independentRounds > 0 ? '🌀独立' : '';
    const dying = document.getElementById('player-dying'); if (dying) dying.textContent = game.dyingInfo['player']?.dying ? '💀濒死' : '';
    const armor = document.getElementById('player-armor'); if (armor) armor.textContent = player.armor ? `${player.armor.emoji}${player.armor.name}` : '';
    const appearance = document.getElementById('player-appearance'); if (appearance) appearance.textContent = player.appearance === 'handsome' ? '😎帅' : player.appearance === 'ugly' ? '🤢丑' : '';
    const size = document.getElementById('player-size'); if (size) size.textContent = player.size === 'big' ? '🐘大' : player.size === 'small' ? '🐜小' : '';
}

function updatePlayArea() {
    document.getElementById('discard-count').textContent = game.discardPile.length;
    const con = document.getElementById('played-cards');
    con.innerHTML = '<span class="played-label">出牌区</span>';
    if (game.lastPlayed) {
        con.appendChild(createCardElement(game.lastPlayed.card, true));
        const lbl = document.createElement('span'); lbl.style.cssText = 'font-size:12px;color:#888';
        lbl.textContent = `${game.lastPlayed.player.name} 使用`; con.appendChild(lbl);
    }
}

function updateHandCards() {
    const con = document.getElementById('hand-cards'); if (!con) return; con.innerHTML = '';
    const player = game.players.find(p => p.id === 'player');
    if (!player || !player.alive) return;

    const isIndependent = player.independentRounds > 0;
    const canPlay = game.phase === 'player_turn' && !isIndependent;

    let catBar = document.getElementById('card-category-bar');
    if (!catBar) {
        catBar = document.createElement('div');
        catBar.id = 'card-category-bar';
        catBar.className = 'card-category-bar';
        ['all', 'basic', 'trick', 'equipment'].forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `cat-btn ${cat === 'all' ? 'active' : ''}`;
            btn.dataset.category = cat;
            const labels = { all: '全部', basic: '基础卡', trick: '锦囊卡', equipment: '装备卡' };
            btn.textContent = labels[cat];
            btn.addEventListener('click', () => {
                activeCardCategory = cat;
                document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateHandCards();
            });
            catBar.appendChild(btn);
        });
        con.parentNode.insertBefore(catBar, con);
    }
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === activeCardCategory);
    });

    const cards = activeCardCategory === 'all' ? CARD_TYPES :
        activeCardCategory === 'basic' ? BASIC_CARDS :
        activeCardCategory === 'trick' ? TRICK_CARDS : EQUIPMENT_CARDS;

    if (isIndependent) {
        con.innerHTML = '<span style="color:#a18cd1;font-size:16px;font-weight:600">🌀 独立主格中，等待恢复...</span>';
    } else {
        const isDying = game.dyingInfo['player']?.dying;
        cards.forEach(card => {
            const el = createCardElement(card);
            let disabled = !canPlay;
            if (isDying && card.id !== 'tao') disabled = true;

            if (!disabled) {
                el.addEventListener('click', () => {
                    if (card.armor) {
                        game.playCard(player, card);
                    } else if (card.singleTarget) {
                        game.pendingTarget = { card, who: player };
                        showMessage(`点击选择【${card.name}】的目标`);
                        updateUI();
                    } else {
                        game.playCard(player, card);
                    }
                });
            } else {
                el.classList.add('disabled');
            }
            con.appendChild(el);
        });
    }

    const endBtn = document.getElementById('btn-end-turn');
    if (endBtn) {
        const canEndTurn = canPlay && !game.pendingTarget;
        endBtn.style.display = canEndTurn ? 'inline-block' : 'none';
    }

    const fleeBtn = document.getElementById('btn-flee');
    if (fleeBtn) {
        fleeBtn.style.display = (canPlay || game.phase === 'rps' || duelState) ? 'inline-block' : 'none';
    }

    let cancelBtn = document.getElementById('btn-cancel-target');
    if (game.pendingTarget) {
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.id = 'btn-cancel-target';
            cancelBtn.className = 'btn-action';
            cancelBtn.textContent = '取消选择';
            cancelBtn.addEventListener('click', () => {
                game.pendingTarget = null;
                showMessage('已取消');
                updateUI();
            });
            document.getElementById('action-buttons').appendChild(cancelBtn);
        }
        cancelBtn.style.display = 'inline-block';
    } else if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
}

function createCardElement(card, small = false) {
    const el = document.createElement('div');
    el.className = 'card'; el.dataset.type = card.type;
    if (small) el.style.transform = 'scale(0.9)';
    el.innerHTML = `<span class="card-suit">${card.emoji}</span><span class="card-name">${card.name}</span>`;
    return el;
}

function showEndScreen(win, msg) {
    document.getElementById('end-title').textContent = win ? '🎉 胜利！' : '😢 失败...';
    document.getElementById('end-title').style.color = win ? '#a8e6cf' : '#ff8b94';
    document.getElementById('end-message').textContent = `共 ${game.roundCount} 回合 — ${msg}`;
    showScreen('end');
}

function showMessage(msg) { 
    if (typeof game !== 'undefined' && game.showMessage) {
        game.showMessage(msg); 
    }
}
