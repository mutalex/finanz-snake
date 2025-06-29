import type { Item, ItemType, Mission } from './types.js';
import { BALANCING } from './balancing.js';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const hud = document.getElementById('hud')!;
const msg = document.getElementById('message')!;
const overlay = document.getElementById('overlay')!;

const size = 20;
const cells = canvas.width / size;

interface Point { x: number; y: number; }

let state = {
  snake: [{ x: 10, y: 10 } as Point],
  dir: { x: 1, y: 0 },
  nextDir: { x: 1, y: 0 },
  items: [] as Item[],
  liquidity: 100,
  ekQuote: 60,
  flex: 0,
  leasingShield: 0,
  obstacleDamage: BALANCING.obstacleDamage,
  leasingCollected: 0,
  itemTimestamps: [] as number[],
  adrenaline: false,
  missions: [] as Mission[],
  currentMission: 0,
  lastTime: 0,
  speed: 150,
  lastTaxTick: Date.now(),
};

function randomCell(): Point {
  return { x: Math.floor(Math.random() * cells), y: Math.floor(Math.random() * cells) };
}

function spawnItem(type?: ItemType) {
  let p = randomCell();
  while (state.snake.some(s => s.x === p.x && s.y === p.y)) {
    p = randomCell();
  }
  const t: ItemType = type || ['leasing','mietkauf','factoring','hindernis','finanzamt'][Math.floor(Math.random()*5)] as ItemType;
  state.items.push({ x: p.x, y: p.y, type: t });
}

function initMissions() {
  state.missions = [
    { typ: 'factoring', ziel: 3, reward: 1, progress: 0, active: false },
    { typ: 'kombiniert', ziel: 1, reward: 2, progress: 0, active: false },
    { typ: 'ekquote', ziel: 5, reward: 2, progress: 0, active: false },
  ];
  state.currentMission = 0;
  state.missions[0].active = true;
}

function missionDesc(m: Mission): string {
  switch (m.typ) {
    case 'factoring': return `Factoring ${m.progress}/${m.ziel}`;
    case 'kombiniert': return `Sammle je 1x Leasing/Mietkauf/Factoring`;
    case 'ekquote': return `Halte EK-Quote >50% ${Math.floor(m.progress)}/${m.ziel}s`;
    case 'zeit': return `Sammle ${m.ziel} Objekte in 10s (${m.progress})`;
  }
}

function updateMission(type?: ItemType) {
  const m = state.missions[state.currentMission];
  if (!m) return;
  if (m.typ === 'factoring' && type === 'factoring') {
    m.progress++;
  }
  if (m.typ === 'kombiniert') {
    if (type) {
      if (type === 'leasing') m.progress |= 1;
      if (type === 'mietkauf') m.progress |= 2;
      if (type === 'factoring') m.progress |= 4;
    }
    if (m.progress === 7) m.progress = 1; // mark as completed
  }
  if (m.typ === 'zeit') {
    if (!m.startTime) m.startTime = Date.now();
    m.progress++;
  }
}

function checkMission() {
  const m = state.missions[state.currentMission];
  if (!m) return;
  if (m.typ === 'factoring' && m.progress >= m.ziel) completeMission();
  if (m.typ === 'kombiniert' && m.progress === 1) completeMission();
  if (m.typ === 'ekquote') {
    if (state.ekQuote > 50) {
      if (!m.startTime) m.startTime = Date.now();
      m.progress = (Date.now() - m.startTime) / 1000;
      if (m.progress >= m.ziel) completeMission();
    } else {
      m.startTime = undefined;
      m.progress = 0;
    }
  }
  if (m.typ === 'zeit') {
    if (Date.now() - (m.startTime ?? 0) > 10000) {
      m.progress = 0;
      m.startTime = Date.now();
    }
    if (m.progress >= m.ziel) completeMission();
  }
}

function completeMission() {
  const m = state.missions[state.currentMission];
  state.flex += m.reward;
  state.currentMission++;
  if (state.currentMission < state.missions.length) {
    state.missions[state.currentMission].active = true;
  }
  msg.textContent = `Mission geschafft! +${m.reward} Flex-Token`;
  setTimeout(()=> msg.textContent = '',2000);
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // items
  for(const item of state.items){
    switch(item.type){
      case 'leasing': ctx.fillStyle = 'cyan'; break;
      case 'mietkauf': ctx.fillStyle = 'orange'; break;
      case 'factoring': ctx.fillStyle = 'purple'; break;
      case 'hindernis': ctx.fillStyle = 'gray'; break;
      case 'finanzamt': ctx.fillStyle = 'red'; break;
    }
    ctx.fillRect(item.x*size, item.y*size, size, size);
  }
  // snake
  ctx.fillStyle = state.adrenaline ? 'yellow' : 'lime';
  for(const [i,s] of state.snake.entries()){
    ctx.fillRect(s.x*size, s.y*size, size, size);
    if(i===0 && state.leasingShield>0){
      ctx.strokeStyle = 'cyan';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x*size, s.y*size, size, size);
    }
  }
}

function updateHud() {
  const mission = state.missions[state.currentMission];
  hud.innerHTML = `Liquidität: <span class="${state.liquidity<25?'text-red-500':''}">${state.liquidity.toFixed(0)}%</span> | EK-Quote: ${state.ekQuote.toFixed(0)}% | Flex: ${state.flex}<br>` +
    (mission? `Mission: ${missionDesc(mission)}`:'Keine Mission');
}

function handleCollision(item: Item) {
  if (item.type === 'leasing') {
    state.leasingShield = 1;
    state.leasingCollected++;
  }
  if (item.type === 'factoring') {
    state.liquidity = Math.min(100, state.liquidity + 10);
  }
  if (item.type === 'mietkauf') {
    state.flex += 1;
    spawnParticles(item.x, item.y);
  }
  if (item.type === 'hindernis') {
    if (state.leasingShield>0){
      state.leasingShield=0;
      flash('cyan');
      return;
    }
    state.liquidity -= state.obstacleDamage*100;
    state.obstacleDamage = Math.max(BALANCING.obstacleDamageMin, state.obstacleDamage-0.02);
    flash('red');
  }
  if (item.type === 'finanzamt') {
    const damage = Math.max(0.05, BALANCING.taxBaseDamage - 0.05*state.leasingCollected);
    state.liquidity -= damage*100;
    flash('red');
  }
  updateMission(item.type);
  state.items = state.items.filter(i=>i!==item);
  spawnItem();
}

function flash(color: string){
  overlay.classList.add('animate-pulse');
  overlay.style.backgroundColor = color;
  canvas.classList.add('border-4','animate-pulse');
  (canvas.style as any).borderColor = color;
  setTimeout(()=>{
    overlay.classList.remove('animate-pulse');
    overlay.style.backgroundColor = '';
    canvas.classList.remove('border-4','animate-pulse');
    (canvas.style as any).borderColor = '';
  },200);
}

function spawnParticles(x:number,y:number){
  ['\uD83D\uDCB8','\u2728','\uD83E\uDE99'].forEach((emoji,i)=>{
    const el = document.createElement('span');
    el.textContent = emoji;
    el.className = 'particle';
    el.style.left = x*size + 4*i + 'px';
    el.style.top = y*size + 'px';
    overlay.appendChild(el);
    setTimeout(()=>el.remove(),600);
  });
}

function checkSelfCollision(head: Point): boolean {
  return state.snake.slice(1).some(s => s.x===head.x && s.y===head.y);
}

function gameOver(msgText: string){
  msg.textContent = msgText;
  clearInterval(loopId);
}

function tick(){
  // handle dir
  if (Math.abs(state.nextDir.x) !== Math.abs(state.dir.x) || Math.abs(state.nextDir.y) !== Math.abs(state.dir.y)){
    state.dir = state.nextDir;
  }
  const head = { x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y };
  if(head.x<0||head.y<0||head.x>=cells||head.y>=cells){
    if(state.leasingShield>0){
      state.leasingShield=0;flash('cyan');
    }else{ gameOver('Game Over'); return; }
  }
  if(checkSelfCollision(head)){
    gameOver('Pleite!');return;
  }
  state.snake.unshift(head);
  const item = state.items.find(i=>i.x===head.x&&i.y===head.y);
  if(item){
    handleCollision(item);
    state.itemTimestamps.push(Date.now());
  } else {
    state.snake.pop();
  }
  // adrenaline check
  const now = Date.now();
  state.itemTimestamps = state.itemTimestamps.filter(t=> now - t < 10000);
  state.adrenaline = state.itemTimestamps.length >=3;
  if(state.adrenaline){
    overlay.classList.add('speedlines');
    hud.classList.add('animate-pulse','text-yellow-300');
  } else {
    overlay.classList.remove('speedlines');
    hud.classList.remove('animate-pulse','text-yellow-300');
  }
  // periodic tax damage
  if(state.items.some(i=>i.type==='finanzamt') && now - state.lastTaxTick > 1000){
    const damage = Math.max(0.05, BALANCING.taxBaseDamage - 0.05*state.leasingCollected);
    state.liquidity -= damage*100;
    state.lastTaxTick = now;
    flash('red');
  }
  if(state.liquidity<25){
    canvas.classList.add('animate-shake','border-red-500');
  }else{
    canvas.classList.remove('animate-shake','border-red-500');
  }
  if(state.liquidity<=0){
    gameOver('Pleite!');return;
  }
  checkMission();
  draw();
  updateHud();
}

let loopId:number;

function start(){
  spawnItem();spawnItem();spawnItem();
  initMissions();
  updateHud();
  draw();
  loopId = setInterval(tick,state.speed);
}

document.addEventListener('keydown',e=>{
  if(e.key==='ArrowUp') state.nextDir={x:0,y:-1};
  if(e.key==='ArrowDown') state.nextDir={x:0,y:1};
  if(e.key==='ArrowLeft') state.nextDir={x:-1,y:0};
  if(e.key==='ArrowRight') state.nextDir={x:1,y:0};
});

start();
