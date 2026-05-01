const CARD_TYPES = [
    { id: 'sha', name: '杀', type: 'basic', emoji: '⚔️', damage: 1, desc: '对一名角色造成1点伤害' },
    { id: 'tao', name: '桃', type: 'basic', emoji: '🍑', heal: 1, desc: '恢复1点体力' },
    { id: 'jiu', name: '酒', type: 'basic', emoji: '🍶', wine: true, desc: '下次造成伤害+1' },
    { id: 'nanman', name: '南蛮入侵', type: 'trick', emoji: '🔥', damage: 1, desc: '对所有其他角色造成1点伤害', aoe: true },
    { id: 'juedou', name: '决斗', type: 'trick', emoji: '💥', duel: true, desc: '猜拳决胜', singleTarget: true },
    { id: 'taoyuan', name: '桃园结义', type: 'trick', emoji: '🌸', healBoth: true, desc: '所有角色恢复1点体力', aoe: true },
    { id: 'liangzi', name: '量子力学', type: 'trick', emoji: '⚛️', quantum: true, desc: '猜拳至防守方赢，防守方体力=失败次数', singleTarget: true },
    { id: 'dulige', name: '独立主格', type: 'trick', emoji: '🌀', independent: true, desc: '跳过两回合，免疫一切' },
    { id: 'hoyuanjian', name: '霍尔元件', type: 'trick', emoji: '🧲', hall: true, desc: '与目标猜拳，赢者HP=5，输者HP=双方原HP和-5', singleTarget: true },
    { id: 'ziyouzuhe', name: '自由组合', type: 'trick', emoji: '🎭', freeCombo: true, desc: '全场猜拳排序，按胜序分配最低血量' },
    { id: 'dianjiechi', name: '电解池', type: 'trick', emoji: '⚡', electrolytic: true, desc: '与目标猜拳至对方赢，奇数次未赢-1HP，偶数次未赢-2HP', singleTarget: true }
];

const RPS = {
    rock: { name: '石头', emoji: '✊' },
    scissors: { name: '剪刀', emoji: '✌️' },
    paper: { name: '布', emoji: '✋' }
};

function rpsBeats(a, b) {
    if (a === b) return 'draw';
    if ((a === 'rock' && b === 'scissors') ||
        (a === 'scissors' && b === 'paper') ||
        (a === 'paper' && b === 'rock')) {
        return 'win';
    }
    return 'lose';
}
