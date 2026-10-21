const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
$('#year').textContent = new Date().getFullYear();
let token = sessionStorage.getItem('srbToken') || '';
let currentUser = null;
let authMode = 'register';
const authModal = $('#authModal'), gameModal = $('#gameModal'), profileModal = $('#profileModal');
function showModal(el){el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function hideModal(el){el.classList.remove('open');el.setAttribute('aria-hidden','true');if(!$('.modal.open'))document.body.style.overflow=''}
$$('[data-close]').forEach(el=>el.addEventListener('click',()=>hideModal(el.closest('.modal'))));
function setAuthMode(mode){
 authMode=mode;$('#authTitle').textContent=mode==='register'?'Create your account':'Welcome back';
 $('#authSub').textContent=mode==='register'?'Join the community and track your game history.':'Sign in to continue your gaming journey.';
 $('#usernameWrap').hidden=mode!=='register';$('#authForm [name=username]').required=mode==='register';
 $('#authForm [name=password]').autocomplete=mode==='register'?'new-password':'current-password';
 $('#authForm [name=password]').minLength=mode==='register'?10:1;
 $('#authSubmit').textContent=mode==='register'?'Create account':'Log in';
 $('#switchAuth').innerHTML=mode==='register'?'Already have an account? <button type="button">Log in</button>':'New here? <button type="button">Create account</button>';
 $('#switchAuth button').onclick=()=>setAuthMode(mode==='register'?'login':'register');
 $('#authError').textContent='';$('#authForm').reset();
}
function openAuth(mode){setAuthMode(mode);hideModal(profileModal);showModal(authModal)}
$('#loginOpen').onclick=()=>openAuth('login');
$('#registerOpen').onclick=()=>openAuth('register');
$('#heroJoin').onclick=()=>openAuth('register');
$('#switchAuth button').onclick=()=>setAuthMode('login');
async function api(url, options={}){
 const headers={'Content-Type':'application/json',...(options.headers||{})};
 if(token)headers.Authorization='Bearer '+token;
 const response=await fetch(url,{...options,headers});
 const data=await response.json().catch(()=>({error:'Unexpected server response.'}));
 if(!response.ok)throw new Error(data.error||'Request failed.');
 return data;
}
function updateHeader(){
 const signed=!!currentUser;
 $('#loginOpen').hidden=signed;$('#registerOpen').hidden=signed;$('#profileOpen').hidden=!signed;
 if(signed)$('#profileOpen').textContent=(currentUser.username||'S')[0].toUpperCase();
}
async function loadMe(){
 if(!token){currentUser=null;updateHeader();return}
 try{const data=await api('/api/me');currentUser=data.user;updateHeader()}
 catch{token='';currentUser=null;sessionStorage.removeItem('srbToken');updateHeader()}
}
$('#authForm').addEventListener('submit',async e=>{
 e.preventDefault();const form=new FormData(e.currentTarget);
 const body={email:form.get('email'),password:form.get('password')};
 if(authMode==='register')body.username=form.get('username');
 $('#authSubmit').disabled=true;$('#authError').textContent='Please wait…';
 try{
  const data=await api('/api/auth/'+authMode,{method:'POST',body:JSON.stringify(body)});
  token=data.token;currentUser=data.user;sessionStorage.setItem('srbToken',token);updateHeader();hideModal(authModal);
 }catch(err){$('#authError').textContent=err.message}
 finally{$('#authSubmit').disabled=false}
});
$('#profileOpen').onclick=async()=>{
 if(!currentUser)return openAuth('login');
 $('#profileName').textContent=currentUser.username;$('#profileEmail').textContent=currentUser.email;
 $('#profilePoints').textContent=currentUser.points;
 $('#history').textContent='Loading…';showModal(profileModal);
 try{
  const data=await api('/api/games/history');
  $('#history').innerHTML=data.history.length?data.history.map(item=>`<div class="history-row"><span>${escapeHtml(item.game)}<br><small>${escapeHtml(item.createdAt)}</small></span><strong>${item.score} pts</strong></div>`).join(''):'No games played yet. Start a game to build your history.';
 }catch(err){$('#history').textContent=err.message}
};
$('#logout').onclick=()=>{token='';currentUser=null;sessionStorage.removeItem('srbToken');updateHeader();hideModal(profileModal)};
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

let filter='all';
function filterCards(){
 const q=$('#search').value.trim().toLowerCase();let count=0;
 $$('.card').forEach(c=>{const ok=(filter==='all'||c.dataset.category===filter)&&c.dataset.name.includes(q);c.hidden=!ok;if(ok)count++});
 $('#empty').hidden=count>0;
}
$('#search').addEventListener('input',filterCards);
$$('.filter').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;$$('.filter').forEach(x=>x.classList.toggle('active',x===b));filterCards()});
$$('[data-game]').forEach(b=>b.addEventListener('click',()=>openGame(b.dataset.game)));
let stopGame=()=>{};
function closeGame(){stopGame();stopGame=()=>{};hideModal(gameModal);$('#gameHost').innerHTML=''}
function openGame(id){
 stopGame();$('#gameHost').innerHTML='';
 $('#gameTitle').textContent=({snake:'Neon Snake',memory:'Memory Match',ttt:'Tic-Tac-Toe',car:'Car Racing',shoot:'Shooting Game',bubble:'Bubble Shooter',football:'Football',space:'Space Shooter',ludo:'Ludo',chess:'Chess',flappy:'Flappy Bird',cricket:'Cricket',wingo:'Wingo Demo',rps:'Rock Paper Scissors','2048':'2048',mole:'Whack-a-Mole',guess:'Number Guess',reaction:'Reaction Test',simon:'Simon Says',math:'Math Sprint',hangman:'Hangman',clicker:'Click Challenge',odd:'Odd One Out'})[id]||'Game';
 showModal(gameModal);
 if(id==='snake')stopGame=snakeGame();
 if(id==='memory')stopGame=memoryGame();
 if(id==='ttt')stopGame=tttGame();
 if(['car','shoot','bubble','football','space','ludo','chess','flappy','cricket','wingo','rps','2048','mole','guess','reaction','simon','math','hangman','clicker','odd'].includes(id))stopGame=extraGame(id);
}
$$('#gameModal .close').forEach(b=>b.onclick=closeGame);
document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.modal.open').forEach(hideModal)});

function snakeGame(){
 $('#gameHost').innerHTML='<p>Use arrow keys or WASD. On mobile, swipe the board. Eat the glow and avoid crashing.</p><div class="score">Score: <strong id="ss">0</strong> &nbsp; Best: <strong id="sb">0</strong></div><canvas class="snake-canvas" id="sc" width="360" height="360"></canvas><br><button class="game-action" id="sr">Restart</button>';
 const canvas=$('#sc'),ctx=canvas.getContext('2d'),cell=18,n=20;let snake,dir,next,food,score,best=0,over,timer,touch;
 try{best=Number(localStorage.getItem('srbSnakeBest')||0)}catch{}
 $('#sb').textContent=best;
 function newFood(){let p;do{p={x:Math.floor(Math.random()*n),y:Math.floor(Math.random()*n)}}while(snake.some(s=>s.x===p.x&&s.y===p.y));return p}
 function draw(){
  ctx.fillStyle='#07131b';ctx.fillRect(0,0,360,360);ctx.strokeStyle='#52d8ff0d';
  for(let i=0;i<=360;i+=cell){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,360);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(360,i);ctx.stroke()}
  ctx.fillStyle='#ff70ed';ctx.shadowColor='#ff70ed';ctx.shadowBlur=15;ctx.beginPath();ctx.arc(food.x*cell+9,food.y*cell+9,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  snake.forEach((s,i)=>{ctx.fillStyle=i?'#35d9c0':'#b3fff1';ctx.fillRect(s.x*cell+2,s.y*cell+2,cell-4,cell-4)});
  if(over){ctx.fillStyle='#020610cc';ctx.fillRect(0,0,360,360);ctx.fillStyle='white';ctx.textAlign='center';ctx.font='bold 25px sans-serif';ctx.fillText('GAME OVER',180,170);ctx.font='14px sans-serif';ctx.fillText('Restart to play again',180,198)}
 }
 function reset(){clearInterval(timer);snake=[{x:9,y:10},{x:8,y:10},{x:7,y:10}];dir={x:1,y:0};next=dir;score=0;over=false;food=newFood();$('#ss').textContent=0;draw();timer=setInterval(tick,125)}
 function tick(){dir=next;let h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};if(h.x<0||h.y<0||h.x>=n||h.y>=n||snake.some((s,i)=>i<snake.length-1&&s.x===h.x&&s.y===h.y)){over=true;clearInterval(timer);draw();saveScore('Neon Snake',score);return}snake.unshift(h);if(h.x===food.x&&h.y===food.y){score++;$('#ss').textContent=score;if(score>best){best=score;$('#sb').textContent=best;try{localStorage.setItem('srbSnakeBest',best)}catch{}}food=newFood()}else snake.pop();draw()}
 function turn(x,y){if(x===-dir.x&&y===-dir.y)return;next={x,y}}
 function key(e){const m={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};let k=e.key.length===1?e.key.toLowerCase():e.key;if(m[k]){e.preventDefault();turn(...m[k])}}
 function ts(e){const t=e.changedTouches[0];touch={x:t.clientX,y:t.clientY}}
 function te(e){if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;if(Math.max(Math.abs(dx),Math.abs(dy))>20){if(Math.abs(dx)>Math.abs(dy))turn(dx>0?1:-1,0);else turn(0,dy>0?1:-1)}touch=null}
 document.addEventListener('keydown',key);canvas.addEventListener('touchstart',ts,{passive:true});canvas.addEventListener('touchend',te,{passive:true});$('#sr').onclick=reset;reset();
 return()=>{clearInterval(timer);document.removeEventListener('keydown',key);canvas.removeEventListener('touchstart',ts);canvas.removeEventListener('touchend',te)}
}
async function saveScore(game,score){if(!token)return;try{await api('/api/games/history',{method:'POST',body:JSON.stringify({game,score})})}catch{}}
function memoryGame(){
 $('#gameHost').innerHTML='<p>Flip two cards and find all matching pairs in as few moves as possible.</p><div class="score">Moves: <strong id="mm">0</strong> &nbsp; Pairs: <strong id="mp">0/8</strong></div><div class="memory-board" id="mb"></div><p id="ms">Find all 8 pairs!</p><button class="game-action" id="mr">Shuffle & restart</button>';
 const symbols=['✦','◈','☾','⚡','♜','❖','✿','☯'];let deck,first,lock,moves,pairs,timer;
 function reset(){clearTimeout(timer);first=null;lock=false;moves=0;pairs=0;deck=[...symbols,...symbols].sort(()=>Math.random()-.5).map(symbol=>({symbol,up:false,match:false}));$('#mm').textContent=0;$('#mp').textContent='0/8';$('#ms').textContent='Find all 8 pairs!';render()}
 function render(){const b=$('#mb');b.innerHTML='';deck.forEach((c,i)=>{const x=document.createElement('button');x.className='memory-card'+(c.up?' flipped':'')+(c.match?' matched':'');x.textContent=c.up||c.match?c.symbol:'?';x.disabled=c.match;x.onclick=()=>flip(i);b.appendChild(x)})}
 function flip(i){let c=deck[i];if(lock||c.up||c.match)return;c.up=true;render();if(first===null){first=i;return}moves++;$('#mm').textContent=moves;if(deck[first].symbol===c.symbol){deck[first].match=c.match=true;pairs++;first=null;$('#mp').textContent=pairs+'/8';if(pairs===8){$('#ms').textContent='You won in '+moves+' moves!';saveScore('Memory Match',Math.max(0,100-moves))}render()}else{let f=first;first=null;lock=true;timer=setTimeout(()=>{deck[f].up=c.up=false;lock=false;render()},700)}}
 $('#mr').onclick=reset;reset();return()=>clearTimeout(timer)
}
function tttGame(){
 $('#gameHost').innerHTML='<p>Two players, one device. Get three in a row to win.</p><p id="ts">X’s turn</p><div class="ttt-board" id="tb"></div><button class="game-action" id="tr">New round</button>';
 let board,turn,done;function reset(){board=Array(9).fill('');turn='X';done=false;$('#ts').textContent='X’s turn';render()}
 function render(){const el=$('#tb');el.innerHTML='';board.forEach((v,i)=>{let b=document.createElement('button');b.className='ttt-cell'+(v==='O'?' o':'');b.textContent=v;b.disabled=!!v||done;b.onclick=()=>move(i);el.appendChild(b)})}
 function move(i){board[i]=turn;const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];if(wins.some(line=>line.every(j=>board[j]===turn))){done=true;$('#ts').textContent=turn+' wins!';saveScore('Tic-Tac-Toe',1)}else if(board.every(Boolean)){done=true;$('#ts').textContent='It’s a draw!'}else{turn=turn==='X'?'O':'X';$('#ts').textContent=turn+'’s turn'}render()}
 $('#tr').onclick=reset;reset();return()=>{}
}
loadMe();


function extraGame(id){
 const host=$('#gameHost');
 const btn=(label,fn,cls='game-action')=>{const b=document.createElement('button');b.className=cls;b.textContent=label;b.onclick=fn;host.appendChild(b);return b};
 const info=document.createElement('p');host.appendChild(info);
 const board=document.createElement('div');board.className='extra-board';host.appendChild(board);
 let score=0,ended=false,timer=null;
 const scoreLine=document.createElement('div');scoreLine.className='score';scoreLine.innerHTML='Score: <strong id="extraScore">0</strong>';host.insertBefore(scoreLine,info);
 const setScore=n=>{score=n;const el=$('#extraScore');if(el)el.textContent=score};
 const finish=(msg='Round complete!')=>{if(ended)return;ended=true;clearInterval(timer);info.textContent=msg+' Final score: '+score+'.';saveScore(({car:'Car Racing',shoot:'Shooting Game',bubble:'Bubble Shooter',football:'Football',space:'Space Shooter',ludo:'Ludo',chess:'Chess',flappy:'Flappy Bird',cricket:'Cricket',wingo:'Wingo Demo',rps:'Rock Paper Scissors','2048':'2048',mole:'Whack-a-Mole',guess:'Number Guess',reaction:'Reaction Test',simon:'Simon Says',math:'Math Sprint',hangman:'Hangman',clicker:'Click Challenge',odd:'Odd One Out'})[id],score);};
 const restart=()=>{ended=false;setScore(0);board.innerHTML='';info.textContent='';};

 if(id==='rps'){
  info.textContent='Choose rock, paper, or scissors. First to 5 wins.';let wins=0,losses=0,round=0;
  const status=document.createElement('h3');board.appendChild(status);
  const play=choice=>{if(ended)return;round++;const opts=['Rock','Paper','Scissors'],cpu=opts[Math.floor(Math.random()*3)];let result=choice===cpu?'Draw':((choice==='Rock'&&cpu==='Scissors')||(choice==='Paper'&&cpu==='Rock')||(choice==='Scissors'&&cpu==='Paper'))?'You win!':'Computer wins';if(result==='You win!'){wins++;setScore(wins)}else if(result==='Computer wins')losses++;status.textContent=choice+' vs '+cpu+' — '+result;info.textContent='You: '+wins+' | Computer: '+losses;if(wins>=5||losses>=5)finish(wins>=5?'You won the match!':'Computer won the match!')};['Rock','Paper','Scissors'].forEach(x=>btn(x,()=>play(x)));return()=>{};
 }
 if(id==='2048'){
  info.textContent='Use arrow keys or swipe to combine equal tiles. Reach 2048.';board.className='tile2048';let grid,won=false;
  const spawn=()=>{let empty=[];grid.forEach((r,y)=>r.forEach((v,x)=>{if(!v)empty.push([y,x])}));if(empty.length){const [y,x]=empty[Math.floor(Math.random()*empty.length)];grid[y][x]=Math.random()<.9?2:4}};
  const render=()=>{board.innerHTML='';grid.flat().forEach(v=>{const t=document.createElement('div');t.className='tile2048-cell';t.textContent=v||'';t.dataset.value=v||0;board.appendChild(t)});};
  const reset=()=>{grid=Array.from({length:4},()=>Array(4).fill(0));score=0;setScore(0);spawn();spawn();render()};
  const move=dir=>{if(ended)return;let changed=false;for(let k=0;k<4;k++){let line=dir==='left'||dir==='right'?grid[k].slice():grid.map(r=>r[k]);if(dir==='right'||dir==='down')line.reverse();line=line.filter(Boolean);for(let i=0;i<line.length-1;i++)if(line[i]===line[i+1]){line[i]*=2;setScore(score+line[i]);line.splice(i+1,1);if(line[i]===2048)won=true}while(line.length<4)line.push(0);if(dir==='right'||dir==='down')line.reverse();for(let i=0;i<4;i++){if((dir==='left'||dir==='right'?grid[k][i]:grid[i][k])!==line[i])changed=true;if(dir==='left'||dir==='right')grid[k][i]=line[i];else grid[i][k]=line[i]}}if(changed){spawn();render();if(won)finish('You reached 2048!');else if(!grid.some(r=>r.includes(0))&&!grid.some((r,y)=>r.some((v,x)=>(x<3&&v===r[x+1])||(y<3&&v===grid[y+1][x]))))finish('No moves left!')}};
  const key=e=>{const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};if(map[e.key]){e.preventDefault();move(map[e.key])}};document.addEventListener('keydown',key);['←','→','↑','↓'].forEach((x,i)=>btn(x,()=>move(['left','right','up','down'][i])));btn('Restart',reset);reset();return()=>document.removeEventListener('keydown',key);
 }
 if(id==='mole'){
  info.textContent='Tap the mole as many times as possible in 20 seconds.';board.className='mole-grid';let left=20;const cells=[];for(let i=0;i<9;i++){const b=btn('·',()=>{if(!ended&&b.dataset.mole==='1'){setScore(score+1);b.dataset.mole='0';b.textContent='·';showMole()}},'mole-cell');cells.push(b)}
  function showMole(){cells.forEach(b=>{b.dataset.mole='0';b.textContent='·'});if(!ended){const b=cells[Math.floor(Math.random()*9)];b.dataset.mole='1';b.textContent='🐹'}}showMole();timer=setInterval(()=>{left--;info.textContent='Time left: '+left+'s';if(left<=0)finish('Time is up!')},1000);return()=>clearInterval(timer);
 }
 if(id==='guess'){
  info.textContent='I picked a number from 1 to 100. You have 7 guesses.';let answer=Math.floor(Math.random()*100)+1,tries=0;const inp=document.createElement('input');inp.type='number';inp.min='1';inp.max='100';inp.placeholder='Enter 1–100';inp.className='mini-input';board.appendChild(inp);const hint=document.createElement('p');board.appendChild(hint);btn('Guess',()=>{if(ended)return;const n=Number(inp.value);if(!Number.isInteger(n)||n<1||n>100){hint.textContent='Enter a whole number from 1 to 100.';return}tries++;if(n===answer){setScore(Math.max(1,8-tries));finish('Correct! The number was '+answer+'.')}else if(tries>=7)finish('Out of guesses. Number: '+answer);else hint.textContent=(n<answer?'Too low':'Too high')+' — '+(7-tries)+' tries left.'});btn('New number',()=>{answer=Math.floor(Math.random()*100)+1;tries=0;ended=false;setScore(0);hint.textContent='New number ready.'});return()=>{};
 }
 if(id==='reaction'){
  info.textContent='Press Start, wait for green, then click as fast as you can.';const pad=btn('START',()=>{if(ended)return;pad.disabled=true;pad.textContent='Wait for green…';pad.style.background='#b45309';const delay=1000+Math.random()*3500;timer=setTimeout(()=>{if(ended)return;pad.style.background='#16a34a';pad.textContent='CLICK NOW!';const started=performance.now();pad.onclick=()=>{const ms=Math.round(performance.now()-started);setScore(Math.max(0,1000-ms));info.textContent='Reaction time: '+ms+' ms';finish(ms+' ms reaction time')};},delay)},'reaction-pad');return()=>clearTimeout(timer);
 }
 if(id==='simon'){
  info.textContent='Watch the sequence, then repeat it by clicking the coloured buttons.';const colors=['red','blue','green','gold'];let seq=[],input=[],playing=false;const status=document.createElement('h3');board.appendChild(status);const pads=colors.map((c,i)=>btn(['🔴','🔵','🟢','🟡'][i],()=>{if(ended||playing)return;input.push(i);if(input[input.length-1]!==seq[input.length-1]){finish('Sequence missed!');status.textContent='Reached level '+Math.max(0,seq.length-1);return}if(input.length===seq.length){setScore(seq.length);if(seq.length>=15){finish('Amazing memory!');return}setTimeout(next,500)}},'simon-pad '+c));
  function next(){seq.push(Math.floor(Math.random()*4));input=[];playing=true;status.textContent='Watch level '+seq.length;let i=0;const flash=()=>{if(ended)return;if(i>=seq.length){playing=false;status.textContent='Your turn!';return}const b=pads[seq[i++]];b.classList.add('lit');setTimeout(()=>{b.classList.remove('lit');setTimeout(flash,180)},350)};flash()}btn('Start / Restart',()=>{ended=false;seq=[];input=[];setScore(0);next()});next();return()=>{};
 }
 if(id==='math'){
  let left=30,a,b,ans;const q=document.createElement('h2');board.appendChild(q);const inp=document.createElement('input');inp.type='number';inp.placeholder='Answer';inp.className='mini-input';board.appendChild(inp);const ask=()=>{a=1+Math.floor(Math.random()*20);b=1+Math.floor(Math.random()*20);ans=a+b;q.textContent=a+' + '+b+' = ?';inp.value=''};const submit=()=>{if(ended)return;if(Number(inp.value)===ans)setScore(score+1);ask()};btn('Submit',submit);inp.addEventListener('keydown',e=>{if(e.key==='Enter')submit()});ask();timer=setInterval(()=>{left--;info.textContent='Time left: '+left+'s';if(left<=0)finish('Sprint finished! Correct answers: '+score)},1000);return()=>clearInterval(timer);
 }
 if(id==='hangman'){
  const words=['JAVASCRIPT','GALAXY','COMPUTER','PUZZLE','BROWSER','GAMING'];let word=words[Math.floor(Math.random()*words.length)],used=[],miss=0;const view=document.createElement('h2');board.appendChild(view);const letters=document.createElement('div');letters.className='letter-row';board.appendChild(letters);const draw=()=>{view.textContent=word.split('').map(c=>used.includes(c)?c:'_').join(' ');letters.innerHTML='';'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(c=>{const b=document.createElement('button');b.textContent=c;b.disabled=used.includes(c)||ended;b.onclick=()=>{used.push(c);if(!word.includes(c))miss++;draw();if(word.split('').every(x=>used.includes(x)))finish('Word solved!');else if(miss>=7)finish('Game over. Word: '+word)};letters.appendChild(b)});info.textContent='Wrong guesses: '+miss+'/7'};draw();return()=>{};
 }
 if(id==='clicker'){
  let left=10;info.textContent='Click the big button repeatedly for 10 seconds.';const b=btn('CLICK!',()=>{if(!ended)setScore(score+1)},'clicker-pad');timer=setInterval(()=>{left--;info.textContent='Time left: '+left+'s';if(left<=0)finish('Clicks per round: '+score)},1000);return()=>clearInterval(timer);
 }
 if(id==='odd'){
  info.textContent='Click the symbol that is different. Get as many as you can.';const symbols=['●','●','●','●','○'];let round=0;function next(){if(ended)return;board.innerHTML='';const odd=Math.floor(Math.random()*9);for(let i=0;i<9;i++){const b=btn(i===odd?'○':'●',()=>{if(i===odd){setScore(score+1);round++;next()}else finish('Wrong symbol!')},'odd-cell');board.appendChild(b)}}next();return()=>{};
 }
 if(id==='car'){
  info.textContent='Use LEFT / RIGHT or tap a lane to dodge oncoming traffic. Survive 20 seconds.';
  board.innerHTML='<div class="road"><div class="lane">🚗</div><div class="lane">🏎️</div><div class="lane">🚙</div><div id="traffic">🚕</div></div>';
  let lane=1,traffic=0,seconds=20;
  const road=board.querySelector('.road'),t=board.querySelector('#traffic');
  const paint=()=>{t.style.left=(traffic*33.33+8)+'%';};
  [0,1,2].forEach(i=>btn('Lane '+(i+1),()=>{lane=i;setScore(score+1);if(lane===traffic)finish('Crash!');},'game-action'));
  const key=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();lane=Math.max(0,Math.min(2,lane+(e.key==='ArrowLeft'?-1:1)));}};
  document.addEventListener('keydown',key);
  timer=setInterval(()=>{if(ended)return;traffic=Math.floor(Math.random()*3);paint();if(traffic===lane){finish('Crash!');return}seconds--;info.textContent='Survive: '+seconds+' seconds';setScore(score+1);if(seconds<=0)finish('You finished the race!')},1000);
  btn('Restart',()=>{stopGame();openGame('car')},'game-action');
  return()=>{clearInterval(timer);document.removeEventListener('keydown',key)};
 }
 if(id==='shoot'||id==='space'){
  let left=20;info.textContent='Click the targets as quickly as possible. You have 20 seconds.';
  const target=()=>{if(ended)return;board.innerHTML='';const b=btn(id==='space'?'👾':'🎯',()=>{setScore(score+1);target()},'target-button');board.appendChild(b);b.style.left=(5+Math.random()*75)+'%';b.style.top=(5+Math.random()*70)+'%';};
  board.style.position='relative';board.style.height='220px';target();
  timer=setInterval(()=>{left--;info.textContent='Time left: '+left+'s';if(left<=0)finish('Time is up!')},1000);
  btn('End round',()=>finish());return()=>clearInterval(timer);
 }
 if(id==='bubble'){
  info.textContent='Pop bubbles of the same colour. Each bubble is worth 1 point.';
  const colors=['🔴','🔵','🟢','🟡','🟣','🟠'];
  for(let i=0;i<24;i++){const b=document.createElement('button');b.className='bubble-button';b.textContent=colors[Math.floor(Math.random()*colors.length)];b.onclick=()=>{if(!b.disabled&&!ended){b.disabled=true;b.textContent='💥';setScore(score+1);if(score>=24)finish('All bubbles popped!')}};board.appendChild(b)}
  btn('Finish round',()=>finish());return()=>{};
 }
 if(id==='football'){
  info.textContent='Choose a corner to take a penalty. Goalkeeper moves randomly.';
  ['↖ Left','↑ Centre','↗ Right'].forEach((label,i)=>btn(label,()=>{if(ended)return;const keeper=Math.floor(Math.random()*3);if(i!==keeper){setScore(score+1);info.textContent='GOAL! Choose again.'}else info.textContent='Saved! Try another shot.';if(score>=5)finish('Hat-trick hero!')}));
  btn('Finish match',()=>finish());return()=>{};
 }
 if(id==='flappy'){
  let height=0,obstacle=2;
  info.textContent='Tap FLAP to gain height. Avoid the moving obstacle; survive 15 taps.';
  const h=document.createElement('div');h.className='flappy-scene';h.innerHTML='<span id="bird">🐦</span><span id="pipe">🟩</span>';board.appendChild(h);
  const flap=()=>{if(ended)return;height=Math.max(0,Math.min(5,height+1));obstacle=Math.floor(Math.random()*6);$('#bird').style.bottom=(10+height*25)+'px';$('#pipe').style.left=(15+obstacle*12)+'%';setScore(score+1);if(Math.abs(height-obstacle)<1)finish('You hit an obstacle!');else if(score>=15)finish('You flew through the course!')};
  btn('FLAP!',flap);btn('Restart',()=>{stopGame();openGame('flappy')});return()=>{};
 }
 if(id==='cricket'){
  info.textContent='Play 6 balls. Tap a shot to score 0, 1, 2, 4 or 6 runs.';
  let balls=0,runs=0;const runOpts=[0,1,2,4,6];
  const hit=()=>{if(ended)return;const r=runOpts[Math.floor(Math.random()*runOpts.length)];runs+=r;balls++;setScore(runs);info.textContent='Ball '+balls+'/6 — '+(r===0?'Dot ball':r+' runs')+' | Total: '+runs;if(balls>=6)finish('Innings complete!');};
  btn('🏏 Play shot',hit);btn('New innings',()=>{balls=0;runs=0;restart();info.textContent='Play 6 balls. Tap a shot to score runs.'});return()=>{};
 }
 if(id==='wingo'){
  info.textContent='Demo only: choose a colour, then reveal the random result. No deposits, bets, or cash prizes.';
  ['RED','GREEN','VIOLET'].forEach(color=>btn(color,()=>{if(ended)return;const result=['RED','GREEN','VIOLET'][Math.floor(Math.random()*3)];info.textContent='Result: '+result+(result===color?' — correct! +10 demo points.':' — not this time.');setScore(score+(result===color?10:0));}));
  btn('End round',()=>finish('Demo round ended'));return()=>{};
 }
 if(id==='ludo'){
  let pos=0;info.textContent='Roll a 6 to enter the board, then race your token to 30 spaces.';
  const track=document.createElement('div');track.className='ludo-track';board.appendChild(track);
  const render=()=>{track.innerHTML='';for(let i=0;i<=30;i++){const c=document.createElement('span');c.textContent=i===pos?'🔴':(i===30?'🏁':i);track.appendChild(c)}};
  btn('🎲 Roll dice',()=>{if(ended)return;const dice=1+Math.floor(Math.random()*6);info.textContent='You rolled '+dice;pos=Math.min(30,pos+dice);render();setScore(pos);if(pos===30)finish('Ludo won!')});render();btn('Restart',()=>{pos=0;restart();render()});return()=>{};
 }
 if(id==='chess'){
  info.textContent='Local two-player board. Select a piece, then select a destination square. This starter uses free-move rules (not full official chess validation).';
  const pieces=['♜','♞','♝','♛','♚','♝','♞','♜'];let cells=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){let piece='';if(r===0)piece=pieces[c];if(r===1)piece='♟';if(r===6)piece='♙';if(r===7)piece=['♖','♘','♗','♕','♔','♗','♘','♖'][c];cells.push({piece,el:null})}
  board.className='chess-board';let selected=-1;
  cells.forEach((cell,i)=>{const b=document.createElement('button');b.className='chess-square '+((Math.floor(i/8)+i%8)%2?'dark':'light');b.textContent=cell.piece;b.onclick=()=>{if(ended)return;if(selected<0&&cell.piece){selected=i;b.classList.add('selected')}else if(selected>=0){if(selected!==i){cells[i].piece=cells[selected].piece;cells[selected].piece='';setScore(score+1)}selected=-1;render()} };cell.el=b;board.appendChild(b)});
  function render(){cells.forEach((c,i)=>{c.el.textContent=c.piece;c.el.classList.toggle('selected',selected===i)})}
  btn('End match',()=>finish('Match ended'));return()=>{};
 }
 return()=>clearInterval(timer);
}
