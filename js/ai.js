class AI {
    play(game, who) {
        const cards = [...CARD_TYPES];

        // If in dying state, must use Peach
        if (game.dyingInfo[who.id]?.dying) {
            const tao = cards.find(c => c.id === 'tao');
            if (tao) {
                game.playCard(who, tao);
                return;
            }
        }

        let bestCard = null;

        if (Math.random() < 0.3) {
            bestCard = cards[Math.floor(Math.random() * cards.length)];
        } else {
            const myHp = who.hp;
            const others = game.getAlivePlayers().filter(p => p.id !== who.id && p.independentRounds <= 0);
            const minOtherHp = others.length > 0 ? Math.min(...others.map(p => p.hp)) : 999;

            if (others.length >= 2 && myHp <= 3 && Math.random() < 0.4) {
                bestCard = cards.find(c => c.independent);
            }
            if (!bestCard && myHp <= 2 && Math.random() < 0.6) {
                const heals = cards.filter(c => c.heal || c.healBoth);
                if (heals.length > 0) bestCard = heals[Math.floor(Math.random() * heals.length)];
            }
            if (!bestCard && who.hasWine && Math.random() < 0.7) {
                bestCard = cards.find(c => c.id === 'sha');
            }
            if (!bestCard && minOtherHp <= 2 && Math.random() < 0.6) {
                const dmg = cards.filter(c => c.damage && !c.aoe);
                if (dmg.length > 0) bestCard = dmg[Math.floor(Math.random() * dmg.length)];
            }
            if (!bestCard && Math.random() < 0.4) {
                const atk = cards.filter(c => c.damage);
                if (atk.length > 0) bestCard = atk[Math.floor(Math.random() * atk.length)];
            }
            if (!bestCard && Math.random() < 0.3) {
                const spec = cards.filter(c => c.duel || c.quantum);
                if (spec.length > 0) bestCard = spec[Math.floor(Math.random() * spec.length)];
            }
            if (!bestCard && !who.armor && Math.random() < 0.4) {
                const eq = cards.filter(c => c.armor);
                if (eq.length > 0) bestCard = eq[Math.floor(Math.random() * eq.length)];
            }
            if (!bestCard && Math.random() < 0.3) {
                const state = cards.filter(c => c.chromosome || c.gulliver);
                if (state.length > 0) bestCard = state[Math.floor(Math.random() * state.length)];
            }
        }

        if (!bestCard) bestCard = cards[Math.floor(Math.random() * cards.length)];

        let target = null;
        if (bestCard.singleTarget) {
            if (who.size === 'big') {
                const others = game.getAlivePlayers().filter(p => p.id !== who.id && p.independentRounds <= 0);
                const count = Math.min(1 + Math.floor(Math.random() * 3), 3, others.length);
                const shuffled = others.sort(() => Math.random() - 0.5);
                target = shuffled.slice(0, count);
            } else {
                target = game.selectRandomTarget(who);
            }
        }
        game.playCard(who, bestCard, target);
    }

    chooseRPS() {
        const c = ['rock', 'scissors', 'paper'];
        return c[Math.floor(Math.random() * c.length)];
    }
}

const ai = new AI();
