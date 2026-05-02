class Game {
    constructor() {
        this.players = [];
        this.discardPile = [];
        this.phase = 'idle';
        this.lastPlayed = null;
        this.roundCount = 0;
        this.dyingInfo = {};
        this.adminMode = false;
        this.autoRPS = false;
        this.isProcessing = false;
        this.turnOrder = [];
        this.pendingTarget = null;
        this.currentActivePlayerId = null;
        this.sequentialDuels = null;
    }

    init(aiCount) {
        this.discardPile = [];
        this.phase = 'idle';
        this.lastPlayed = null;
        this.roundCount = 0;
        this.dyingInfo = {};
        this.isProcessing = false;
        this.turnOrder = [];
        this.pendingTarget = null;
        this.currentActivePlayerId = null;
        this.sequentialDuels = null;

        this.players = [];
        this.players.push({
            id: 'player', name: '你', hp: 5, maxHp: 5, alive: true,
            hasWine: false, independentRounds: 0, armor: null,
            appearance: 'normal', size: 'normal'
        });

        for (let i = 0; i < aiCount; i++) {
            this.players.push({
                id: `ai_${i}`, name: `AI${i + 1}`, hp: 5, maxHp: 5, alive: true,
                hasWine: false, independentRounds: 0, armor: null,
                appearance: 'normal', size: 'normal'
            });
        }
    }

    getActivePlayers() {
        return this.players.filter(p => p.alive && p.independentRounds <= 0);
    }

    getAlivePlayers() {
        return this.players.filter(p => p.alive);
    }

    startRound() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.roundCount++;
        this.phase = 'idle';
        this.lastPlayed = null;
        this.turnOrder = [];

        this.players.forEach(p => {
            if (p.independentRounds > 0) {
                p.independentRounds--;
                if (p.independentRounds === 0) showMessage(`${p.name} 结束了独立主格状态！`);
            }
        });

        this.getAlivePlayers().forEach(p => {
            const info = this.dyingInfo[p.id];
            if (info && info.dying && info.startHp !== null) {
                if (p.hp > info.startHp) {
                    if (p.hp > 0) { info.dying = false; info.startHp = null; showMessage(`${p.name} 脱离了濒死状态！`); }
                    else { info.startHp = null; showMessage(`${p.name} 仍处于濒死状态`); }
                } else {
                    p.alive = false; p.hp = 0; info.dying = false; info.startHp = null; showMessage(`${p.name} 死亡！`);
                }
            }
        });

        if (this.checkWin()) { this.isProcessing = false; return; }
        const rpsZone = document.getElementById('rps-zone');
        const duelZone = document.getElementById('duel-inline-zone');
        if (rpsZone) rpsZone.style.display = 'none';
        if (duelZone) duelZone.style.display = 'none';

        const active = this.getActivePlayers();
        if (active.length === 0) { this.isProcessing = false; return; }
        if (active.length === 1) {
            const solo = active[0];
            showMessage(`${solo.name} 是唯一活跃玩家`);
            this.currentActivePlayerId = solo.id;
            this.phase = solo.id === 'player' ? 'player_turn' : 'ai_turn';
            updateUI();
            if (solo.id !== 'player') {
                if (this.adminMode) this.isProcessing = false;
                else setTimeout(() => { this.isProcessing = false; ai.play(this, solo); }, 1000);
            }
            else this.isProcessing = false;
            return;
        }

        if (this.autoRPS) { updateUI(); this.isProcessing = false; setTimeout(() => this.doAutoRPS(), 800); return; }

        this.phase = 'rps';
        if (rpsZone) rpsZone.style.display = 'flex';
        document.querySelectorAll('.rps-btn-inline').forEach(b => b.disabled = false);
        const display = document.getElementById('rps-inline-display'); if (display) display.textContent = '';
        updateUI(); this.isProcessing = false;
    }

    getRPSWinners(active, choices) {
        const present = new Set(active.map(p => choices[p.id]));
        if (present.size === 3) {
            const scores = {};
            active.forEach(p => { scores[p.id] = 0; active.forEach(q => { if (p.id !== q.id && rpsBeats(choices[p.id], choices[q.id]) === 'win') scores[p.id]++; }); });
            const maxScore = Math.max(...Object.values(scores));
            return { winners: active.filter(p => scores[p.id] === maxScore), allThree: true };
        }
        if (present.size === 2) {
            const [c1, c2] = [...present];
            const res = rpsBeats(c1, c2);
            if (res === 'win') return { winners: active.filter(p => choices[p.id] === c1), allThree: false };
            if (res === 'lose') return { winners: active.filter(p => choices[p.id] === c2), allThree: false };
        }
        return { winners: [...active], allThree: false };
    }

    determineTurnOrder(winners) {
        if (winners.length <= 1) return winners;
        const choices = {};
        winners.forEach(p => choices[p.id] = ai.chooseRPS());
        const scores = {};
        winners.forEach(p => { scores[p.id] = 0; winners.forEach(q => { if (p.id !== q.id && rpsBeats(choices[p.id], choices[q.id]) === 'win') scores[p.id]++; }); });
        
        const groups = {};
        winners.forEach(p => { const s = scores[p.id]; if (!groups[s]) groups[s] = []; groups[s].push(p); });
        const sorted = Object.keys(groups).map(Number).sort((a,b)=>a-b);
        let ordered = [];
        for (const s of sorted) {
            const g = groups[s];
            ordered.push(...(g.length === 1 ? g : this.determineTurnOrder(g)));
        }
        return ordered;
    }

    resolveRPSPhase(choices) {
        const active = this.getActivePlayers();
        const { winners, allThree } = this.getRPSWinners(active, choices);
        if (allThree) {
            if (winners.length > 1) return 'retry';
            return { order: winners };
        }
        return { order: this.determineTurnOrder(winners) };
    }

    doAutoRPS() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        const active = this.getActivePlayers();
        if (active.length <= 1) { this.isProcessing = false; this.startRound(); return; }
        const choices = {}; active.forEach(p => choices[p.id] = ai.chooseRPS());
        const res = this.resolveRPSPhase(choices);
        if (res === 'retry') { this.isProcessing = false; setTimeout(() => this.doAutoRPS(), 1000); return; }
        this.turnOrder = res.order.map(p => p.id);
        this.isProcessing = false;
        this.processNextTurn();
    }

    resolveMultiRPS(choices) {
        const res = this.resolveRPSPhase(choices);
        const active = this.getActivePlayers();
        const scores = {}; active.forEach(p => { scores[p.id] = 0; active.forEach(q => { if (p.id !== q.id && rpsBeats(choices[p.id], choices[q.id]) === 'win') scores[p.id]++; }); });
        let html = active.map(p => `${p.name}: ${RPS[choices[p.id]].emoji}(${scores[p.id]}胜) `).join('');
        const display = document.getElementById('rps-inline-display'); if (display) display.innerHTML = html;
        document.querySelectorAll('.rps-btn-inline').forEach(b => b.disabled = true);
        if (res === 'retry') { showMessage('平局！重新猜拳'); setTimeout(() => this.startRound(), 1500); return; }
        this.turnOrder = res.order.map(p => p.id);
        const rpsZone = document.getElementById('rps-zone'); if (rpsZone) rpsZone.style.display = 'none';
        updateUI();
        showMessage(`${this.turnOrder.map(id => this.players.find(p=>p.id===id).name).join('、')} 获得出牌权`);
        this.processNextTurn();
    }

    processNextTurn() {
        if (!this.turnOrder || this.turnOrder.length === 0) {
            setTimeout(() => { showMessage('开始下一回合'); setTimeout(() => this.startRound(), 800); }, 1000);
            return;
        }
        const nextId = this.turnOrder.shift();
        const p = this.players.find(pl => pl.id === nextId);
        if (!p || !p.alive || p.independentRounds > 0) { this.processNextTurn(); return; }
        showMessage(`${p.name} 的回合`);
        this.currentActivePlayerId = p.id;
        this.phase = p.id === 'player' ? 'player_turn' : 'ai_turn';
        updateUI();
        if (p.id !== 'player') {
            if (this.adminMode) this.isProcessing = false;
            else setTimeout(() => ai.play(this, p), 800);
        }
        else this.isProcessing = false;
    }

    playCard(who, card, target = null) {
        if (this.dyingInfo[who.id]?.dying && card.id !== 'tao') {
            showMessage(`${who.name} 处于濒死状态，只能使用桃！`);
            return;
        }

        this.lastPlayed = { card, player: who };
        this.discardPile.push(card);

        if (card.independent) {
            who.independentRounds = 2;
            showMessage(`${who.name} 使用【${card.name}】，进入独立主格2回合！`);
            updateUI(); this.endTurnAfterCard(who); return;
        }

        if (card.wine) {
            who.hasWine = true;
            showMessage(`${who.name} 使用【酒】，下次造成伤害+1！`);
            updateUI(); this.endTurnAfterCard(who); return;
        }

        if (card.armor) {
            who.armor = card;
            showMessage(`${who.name} 装备【${card.name}】`);
            updateUI(); this.endTurnAfterCard(who); return;
        }

        const targets = Array.isArray(target) ? target : (target ? [target] : []);

        if (card.duel) {
            if (targets.length === 0) { updateUI(); this.endTurnAfterCard(who); return; }
            this.runSequentialDuels(who, targets, 'juedou');
            return;
        }

        if (card.quantum) {
            if (targets.length === 0) { updateUI(); this.endTurnAfterCard(who); return; }
            this.runSequentialDuels(who, targets, 'quantum');
            return;
        }

        if (card.hall) {
            if (targets.length === 0) { updateUI(); this.endTurnAfterCard(who); return; }
            this.runSequentialDuels(who, targets, 'hall');
            return;
        }

        if (card.freeCombo) {
            this.startFreeCombo(who);
            return;
        }

        if (card.electrolytic) {
            if (targets.length === 0) { updateUI(); this.endTurnAfterCard(who); return; }
            this.runSequentialDuels(who, targets, 'electrolytic');
            return;
        }

        if (card.chromosome) {
            if (targets.length === 0) { updateUI(); this.endTurnAfterCard(who); return; }
            this.runSequentialDuels(who, targets, 'chromosome');
            return;
        }

        if (card.gulliver) {
            if (targets.length === 0) { updateUI(); this.endTurnAfterCard(who); return; }
            this.runSequentialDuels(who, targets, 'gulliver');
            return;
        }

        if (card.heal) {
            who.hp += card.heal;
            showMessage(`${who.name} 使用【${card.name}】，恢复${card.heal}点体力`);
            this.applyHpMod(who); updateUI(); this.endTurnAfterCard(who); return;
        }

        if (card.healBoth) {
            this.getAlivePlayers().forEach(p => {
                if (p.independentRounds <= 0) { p.hp += 1; this.applyHpMod(p); }
            });
            showMessage(`${who.name} 使用【${card.name}】，所有活跃角色恢复1点体力`);
            updateUI(); this.endTurnAfterCard(who); return;
        }

        if (card.damage) {
            let dmg = card.damage;
            if (who.hasWine) { dmg += 1; who.hasWine = false; }
            if (who.appearance === 'handsome') dmg *= 2;

            if (card.aoe) {
                const targets = this.getAlivePlayers().filter(p => p.id !== who.id && p.independentRounds <= 0);
                targets.forEach(p => {
                    let finalDmg = dmg;
                    if (p.armor && card.id === 'nanman') {
                        showMessage(`${p.name} 的【藤甲】免疫了南蛮入侵！`);
                        return;
                    }
                    if (p.armor && card.fire) finalDmg += 1;
                    if (p.size === 'small') finalDmg += 1;
                    if (who.appearance === 'ugly') {
                        if (rpsBeats(ai.chooseRPS(), ai.chooseRPS()) === 'lose') {
                            showMessage(`${who.name} 变丑状态下猜拳失败，伤害未生效！`);
                            return;
                        }
                    }
                    if (p.size === 'small') {
                        let rounds = 0;
                        while (true) {
                            rounds++;
                            const atk = ai.chooseRPS();
                            const def = ai.chooseRPS();
                            const res = rpsBeats(atk, def);
                            if (res === 'lose') {
                                showMessage(`${p.name} 变小状态下猜拳成功（第${rounds}轮），伤害无效！`);
                                return;
                            }
                            if (res === 'win') break;
                        }
                    }
                    p.hp -= finalDmg; this.applyHpMod(p); this.checkDying(p);
                });
                showMessage(`${who.name} 使用【${card.name}】，所有其他角色受到${dmg}点伤害`);
            } else {
                const tgts = Array.isArray(target) ? target : (target ? [target] : []);
                const finalTargets = tgts.length > 0 ? tgts : [this.selectRandomTarget(who)].filter(Boolean);
                if (finalTargets.length > 0) {
                    for (const t of finalTargets) {
                        let finalDmg = dmg;
                        if (t.armor && card.id === 'sha') {
                            showMessage(`${t.name} 的【藤甲】免疫了杀！`);
                            finalDmg = 0;
                        }
                        if (t.armor && card.fire) finalDmg += 1;
                        if (t.size === 'small') finalDmg += 1;
                        if (finalDmg > 0) {
                            if (who.appearance === 'ugly') {
                                if (rpsBeats(ai.chooseRPS(), ai.chooseRPS()) === 'lose') {
                                    showMessage(`${who.name} 变丑状态下猜拳失败，伤害未对${t.name}生效！`);
                                    continue;
                                }
                            }
                            if (t.size === 'small') {
                                let rounds = 0;
                                while (true) {
                                    rounds++;
                                    const atk = ai.chooseRPS();
                                    const def = ai.chooseRPS();
                                    const res = rpsBeats(atk, def);
                                    if (res === 'lose') {
                                        showMessage(`${t.name} 变小状态下猜拳成功（第${rounds}轮），伤害无效！`);
                                        continue;
                                    }
                                    if (res === 'win') break;
                                }
                            }
                            t.hp -= finalDmg;
                            showMessage(`${who.name} 对 ${t.name} 使用【${card.name}】，受到${finalDmg}点伤害！`);
                            this.applyHpMod(t); this.checkDying(t);
                        } else {
                            showMessage(`${who.name} 对 ${t.name} 使用【${card.name}】，被藤甲免疫！`);
                        }
                    }
                }
            }
            updateUI(); this.endTurnAfterCard(who); return;
        }

        updateUI(); this.endTurnAfterCard(who);
    }

    selectRandomTarget(exclude) {
        const targets = this.getAlivePlayers().filter(p => p.id !== exclude.id && p.independentRounds <= 0);
        return targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)] : null;
    }

    startDuel(attacker, defender) {
        showMessage(`${attacker.name} 对 ${defender.name} 使用【决斗】！`);
        setTimeout(() => showDuelInline(attacker, defender, 'juedou'), 500);
    }

    startQuantum(attacker, defender) {
        showMessage(`${attacker.name} 对 ${defender.name} 使用【量子力学】！`);
        setTimeout(() => showDuelInline(attacker, defender, 'quantum'), 500);
    }

    startHall(who, target) {
        showMessage(`${who.name} 对 ${target.name} 使用【霍尔元件】！`);
        setTimeout(() => showDuelInline(who, target, 'hall'), 500);
    }

    startElectrolytic(attacker, defender) {
        showMessage(`${attacker.name} 对 ${defender.name} 使用【电解池】！`);
        setTimeout(() => showDuelInline(attacker, defender, 'electrolytic'), 500);
    }

    startChromosome(attacker, defender) {
        showMessage(`${attacker.name} 对 ${defender.name} 使用【染色体畸变】！`);
        setTimeout(() => showDuelInline(attacker, defender, 'chromosome'), 500);
    }

    startGulliver(attacker, defender) {
        showMessage(`${attacker.name} 对 ${defender.name} 使用【格列佛】！`);
        setTimeout(() => showDuelInline(attacker, defender, 'gulliver'), 500);
    }

    runSequentialDuels(who, targets, type) {
        this.sequentialDuels = { who, targets: [...targets], type, index: 0 };
        this.processNextSequentialDuel();
    }

    processNextSequentialDuel() {
        if (!this.sequentialDuels) return;
        const { who, targets, type, index } = this.sequentialDuels;
        if (index >= targets.length) {
            showMessage(`全部对决结束！`);
            this.sequentialDuels = null;
            updateUI();
            this.endTurnAfterCard(who);
            return;
        }
        const target = targets[index];
        this.sequentialDuels.index++;
        if (type === 'juedou') this.startDuel(who, target);
        else if (type === 'quantum') this.startQuantum(who, target);
        else if (type === 'hall') this.startHall(who, target);
        else if (type === 'electrolytic') this.startElectrolytic(who, target);
        else if (type === 'chromosome') this.startChromosome(who, target);
        else if (type === 'gulliver') this.startGulliver(who, target);
    }

    startFreeCombo(who) {
        showMessage(`${who.name} 使用【自由组合】！全场猜拳排序中...`);
        setTimeout(() => this.runFreeComboTournament(who, this.getAlivePlayers(), []), 800);
    }

    runFreeComboTournament(who, pool, eliminated) {
        if (pool.length <= 1) {
            if (pool.length === 1) eliminated.push(pool[0]);
            const originalHps = eliminated.map(p => p.hp).sort((a, b) => a - b);
            eliminated.forEach((p, i) => {
                p.hp = originalHps[i];
                this.applyHpMod(p);
                this.checkDying(p);
            });
            showMessage(`自由组合结束！${eliminated.map(p => `${p.name}→${p.hp}HP`).join('，')}`);
            updateUI(); this.endTurnAfterCard(who);
            return;
        }

        const choices = {};
        pool.forEach(p => choices[p.id] = ai.chooseRPS());
        
        const present = new Set(pool.map(p => choices[p.id]));
        let winnerChoice = null;
        if (present.size === 2) {
            const [c1, c2] = [...present];
            winnerChoice = rpsBeats(c1, c2) === 'win' ? c1 : c2;
        } else if (present.size === 3) {
            const scores = {};
            pool.forEach(p => { scores[p.id] = 0; pool.forEach(q => { if (p.id !== q.id && rpsBeats(choices[p.id], choices[q.id]) === 'win') scores[p.id]++; }); });
            const maxScore = Math.max(...Object.values(scores));
            const top = pool.filter(p => scores[p.id] === maxScore);
            if (top.length === 1) winnerChoice = choices[top[0].id];
            else {
                showMessage('自由组合：顶级平局，重新猜拳！');
                setTimeout(() => this.runFreeComboTournament(who, pool, eliminated), 800);
                return;
            }
        } else {
            showMessage('自由组合：全部相同，重新猜拳！');
            setTimeout(() => this.runFreeComboTournament(who, pool, eliminated), 800);
            return;
        }

        const winners = pool.filter(p => choices[p.id] === winnerChoice);
        const losers = pool.filter(p => choices[p.id] !== winnerChoice);
        
        if (winners.length === 0 || losers.length === 0) {
            showMessage('自由组合：平局，重新猜拳！');
            setTimeout(() => this.runFreeComboTournament(who, pool, eliminated), 800);
            return;
        }

        eliminated.push(...winners);
        showMessage(`${winners.map(p => p.name).join('、')} 胜出，排第${eliminated.length - winners.length + 1}！`);
        setTimeout(() => this.runFreeComboTournament(who, losers, eliminated), 800);
    }

    applyHpMod(who) {
        if (who.hp >= 10) { who.hp %= 10; showMessage(`${who.name} 的体力取模后为${who.hp}`); }
    }

    checkDying(who) {
        if (who.hp <= 0) {
            if (!this.dyingInfo[who.id]) this.dyingInfo[who.id] = { dying: false, startHp: null };
            if (!this.dyingInfo[who.id].dying) {
                this.dyingInfo[who.id].dying = true;
                this.dyingInfo[who.id].startHp = null;
                showMessage(`${who.name} 进入濒死状态！`);
            }
        }
    }

    markDyingStartRound(who) {
        const info = this.dyingInfo[who.id];
        if (info && info.dying && info.startHp === null) info.startHp = who.hp;
    }

    endTurnAfterCard(who) {
        if (this.checkWin()) return;
        this.getActivePlayers().forEach(p => this.markDyingStartRound(p));
        this.processNextTurn();
    }

    checkWin() {
        const player = this.players.find(p => p.id === 'player');
        if (player && !player.alive) {
            updateUI(); setTimeout(() => showEndScreen(false, '你被击败了...'), 1000); return true;
        }
        const others = this.getAlivePlayers().filter(p => p.id !== 'player');
        if (others.length === 0 && player?.alive) {
            updateUI(); setTimeout(() => showEndScreen(true, '你击败了所有对手！'), 1000); return true;
        }
        return false;
    }

    showMessage(msg) {
        const msgBox = document.getElementById('game-message');
        if (msgBox) {
            msgBox.textContent = msg; msgBox.style.display = 'block';
            setTimeout(() => msgBox.style.display = 'none', 2000);
        }
    }
}

let game = new Game();
