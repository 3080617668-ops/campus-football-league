'use strict';
// 演示数据全部在本地生成。所有榜单均从同一份比赛事件计算。
const teams = [
  ['蓝鲸FC','鲸','#1760cd','理工学院'],['追风少年','风','#168b87','商学院'],['星火联队','火','#d66b34','人文学院'],
  ['绿茵先锋','锋','#329158','计算机学院'],['北辰竞技','辰','#615ac6','建筑学院'],['赤焰FC','焰','#c84a59','传媒学院'],
  ['银河联队','河','#477e9f','国际学院'],['山海竞技','海','#8a6a47','环境学院'],['曙光FC','光','#b38718','设计学院']
].map(([name,short,color,college],id)=>({id,name,short,color,college}));
const surnames=['陈','林','王','张','李','周','刘','许','赵'];
const names=['子航','宇辰','明远','浩然','一鸣','嘉树','亦凡','星野','景行'];
const players=teams.flatMap(t=>names.map((n,i)=>({id:t.id*9+i,team:t.id,name:surnames[(t.id+i)%9]+n,number:i+7})));
let seed=20261106;
function random(n){seed=(seed*1664525+1013904223)>>>0;return seed%n;}
const matches=[];
let rotation=Array.from({length:10},(_,i)=>i);
for(let round=1;round<=9;round++){
  for(let slot=0;slot<5;slot++){
    let home=rotation[slot],away=rotation[9-slot];
    if(home===9||away===9)continue;
    if(round%2===0)[home,away]=[away,home];
    const date=new Date(Date.UTC(2026,10,1+(round-1)*7));
    const m={id:matches.length,round,home,away,date:date.toISOString().slice(0,10),time:slot%2?'16:00':'14:00',venue:slot%2?'校园足球场 B 场':'校园足球场 A 场',played:round<=4,homeGoals:0,awayGoals:0,events:[]};
    if(m.played){
      m.homeGoals=random(5);m.awayGoals=random(4);
      for(const [team,count] of [[home,m.homeGoals],[away,m.awayGoals]]){
        for(let g=0;g<count;g++){
          const scorer=team*9+random(9);let assist=team*9+random(9);
          if(assist===scorer)assist=team*9+(assist+1)%9;
          m.events.push({type:'goal',team,player:scorer,assist:random(4)?assist:null,minute:1+random(90)});
        }
        const booked=new Set();
        for(let c=0,total=random(3);c<total;c++){
          const player=team*9+random(9);if(booked.has(player))continue;booked.add(player);
          m.events.push({type:random(9)===0?'red':'yellow',team,player,minute:1+random(90)});
        }
      }
      m.events.sort((a,b)=>a.minute-b.minute);
    }
    matches.push(m);
  }
  rotation=[rotation[0],rotation[9],...rotation.slice(1,9)];
}
function standings(){
  const rows=teams.map(t=>({...t,played:0,win:0,draw:0,loss:0,gf:0,ga:0,points:0}));
  matches.filter(m=>m.played).forEach(m=>{
    const h=rows[m.home],a=rows[m.away];h.played++;a.played++;h.gf+=m.homeGoals;h.ga+=m.awayGoals;a.gf+=m.awayGoals;a.ga+=m.homeGoals;
    if(m.homeGoals>m.awayGoals){h.win++;a.loss++;h.points+=3;}else if(m.homeGoals<m.awayGoals){a.win++;h.loss++;a.points+=3;}else{h.draw++;a.draw++;h.points++;a.points++;}
  });
  return rows.sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.id-b.id);
}
function playerStats(){
  const rows=players.map(p=>({...p,goals:0,assists:0,yellow:0,red:0}));
  matches.forEach(m=>m.events.forEach(e=>{if(e.type==='goal'){rows[e.player].goals++;if(e.assist!==null)rows[e.assist].assists++;}else rows[e.player][e.type]++;}));return rows;
}
const app=document.querySelector('#app');
let playerMetric='goals';
const crest=(id,big=false)=>`<span class="crest ${big?'big-crest':''}" style="--team:${teams[id].color}" aria-hidden="true">${teams[id].short}</span>`;
const rank=(i)=>`<span class="rank ${i<3?'top':''}">${i+1}</span>`;
const teamLabel=id=>`<button class="team-label team-link" data-team="${id}">${crest(id)}${teams[id].name}</button>`;
const dateLabel=m=>`${m.date.slice(5).replace('-','月')}日`;
const title=(en,zh,sub)=>`<div class="page-title"><div><span class="eyebrow">${en}</span><h1>${zh}</h1><p>${sub}</p></div><span class="badge">2026 赛季 · 演示数据</span></div>`;
function matchRow(m){return `<button class="match" data-match="${m.id}" aria-label="查看 ${teams[m.home].name} 对 ${teams[m.away].name} 比赛详情"><span class="match-meta">第 ${m.round} 轮 · ${dateLabel(m)}<br>${m.played?'已结束':m.time+' · 未开始'}</span><span class="match-team">${teams[m.home].name}${crest(m.home)}</span><span class="score ${m.played?'':'pending'}">${m.played?m.homeGoals+' : '+m.awayGoals:'VS'}</span><span class="match-team away">${crest(m.away)}${teams[m.away].name}</span></button>`;}
function table(headers,body){return `<div class="table-scroll"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;}
function standingsTable(limit=9){return table(['排名','球队','场','胜','平','负','进 / 失','净胜球','积分'],standings().slice(0,limit).map((t,i)=>`<tr><td>${rank(i)}</td><td class="name">${teamLabel(t.id)}</td><td>${t.played}</td><td>${t.win}</td><td>${t.draw}</td><td>${t.loss}</td><td>${t.gf} / ${t.ga}</td><td>${t.gf-t.ga}</td><td class="points">${t.points}</td></tr>`).join(''));}
function homePage(){
  const next=matches.find(m=>!m.played),played=matches.filter(m=>m.played),goals=played.reduce((s,m)=>s+m.homeGoals+m.awayGoals,0);
  app.innerHTML=`<section class="hero"><div><span class="eyebrow">THE GAME BRINGS US TOGETHER</span><h1>我们的校园，<br>我们的主场。</h1><p>九支球队，一份热爱。关注每轮对决，见证每一次突破，让青春在绿茵场上闪耀。</p><a class="button" href="#fixtures">查看完整赛程 ↗</a> <span class="badge">V0.2 球员数据版</span></div><div class="hero-match"><small>下轮焦点 · 第 ${next.round} 轮</small><div class="versus"><div>${crest(next.home,true)}<br>${teams[next.home].name}</div><b>VS</b><div>${crest(next.away,true)}<br>${teams[next.away].name}</div></div><small>${next.date} ${next.time} · ${next.venue}</small></div></section><div class="stats"><div class="stat"><strong>09</strong><span>参赛球队</span></div><div class="stat"><strong>${matches.length}</strong><span>赛季比赛</span></div><div class="stat"><strong>${played.length}</strong><span>已完成比赛</span></div><div class="stat"><strong>${goals}</strong><span>赛季总进球</span></div></div><div class="grid"><section class="panel"><div class="panel-head"><h2>赛场速递</h2><a class="link" href="#fixtures">全部比赛 →</a></div>${played.slice(-4).reverse().map(matchRow).join('')}</section><section class="panel"><div class="panel-head"><h2>射手风云</h2><a class="link" href="#players">球员榜单 →</a></div>${playerStats().sort((a,b)=>b.goals-a.goals||a.id-b.id).slice(0,4).map((p,i)=>`<div class="leader">${rank(i)}${crest(p.team)}<div><b>${p.name}</b><small>${teams[p.team].name} · ${p.number}号</small></div><strong>${p.goals}<small>进球</small></strong></div>`).join('')}</section></div><section class="panel" style="margin-top:24px"><div class="panel-head"><h2>积分榜</h2><a class="link" href="#standings">完整积分榜 →</a></div>${standingsTable(5)}</section>`;
}
function fixturesPage(){
  app.innerHTML=title('MATCH CENTER','每一轮，都值得期待。','筛选赛程，点击比赛查看比分与事件。')+`<div class="toolbar"><select id="round-filter" aria-label="筛选轮次"><option value="">全部轮次</option>${Array.from({length:9},(_,i)=>`<option value="${i+1}">第 ${i+1} 轮</option>`).join('')}</select><select id="team-filter" aria-label="筛选球队"><option value="">全部球队</option>${teams.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select><select id="status-filter" aria-label="筛选比赛状态"><option value="">全部状态</option><option value="played">已结束</option><option value="upcoming">未开始</option></select><button class="tab" id="reset-filters">重置筛选</button></div><div class="panel" id="fixtures-list"></div>`;
  const update=()=>{const r=document.querySelector('#round-filter').value,t=document.querySelector('#team-filter').value,s=document.querySelector('#status-filter').value;const filtered=matches.filter(m=>(!r||m.round===Number(r))&&(t===''||m.home===Number(t)||m.away===Number(t))&&(!s||(s==='played'?m.played:!m.played)));document.querySelector('#fixtures-list').innerHTML=filtered.length?filtered.map(matchRow).join(''):'<div class="empty">没有符合条件的比赛，请调整筛选。</div>';};
  document.querySelectorAll('.toolbar select').forEach(el=>el.addEventListener('change',update));document.querySelector('#reset-filters').onclick=()=>{document.querySelectorAll('.toolbar select').forEach(el=>el.value='');update();};update();
}
function teamsPage(){app.innerHTML=title('OUR TEAMS','九支球队，同一片绿茵。','点击球队卡片，查看阵容和赛季表现。')+`<div class="team-grid">${standings().sort((a,b)=>a.id-b.id).map(t=>`<button class="team-card" data-team="${t.id}">${crest(t.id,true)}<h3>${t.name}</h3><p>${t.college} · ${players.filter(p=>p.team===t.id).length} 位演示球员</p><div class="team-summary"><span>${t.played} 场比赛</span><span>${t.gf} 个进球</span><span>${t.points} 积分 →</span></div></button>`).join('')}</div>`;}
function playersPage(){
  app.innerHTML=title('PLAYER RANKINGS','每一份贡献，都有记录。','进球与助攻来自比赛事件，红黄牌分别统计。')+`<div class="tabs" role="group" aria-label="选择榜单">${[['goals','射手榜'],['assists','助攻榜'],['yellow','黄牌榜'],['red','红牌榜']].map(([k,v])=>`<button class="tab ${playerMetric===k?'active':''}" data-metric="${k}" aria-pressed="${playerMetric===k}">${v}</button>`).join('')}</div><div class="toolbar"><input id="player-search" type="search" aria-label="搜索球员或球队" placeholder="搜索球员或球队…"></div><div class="panel" id="player-table"></div><p class="detail-meta">仅显示所选数据大于 0 的球员；同项数据相同则并列，默认按球员编号排列。红黄牌为演示记录。</p>`;
  const update=()=>{const q=document.querySelector('#player-search').value.trim().toLowerCase();const all=playerStats().filter(p=>p[playerMetric]>0).sort((a,b)=>b[playerMetric]-a[playerMetric]||a.id-b.id);const ranked=all.map((p,i)=>({...p,rank:all.findIndex(x=>x[playerMetric]===p[playerMetric])+1}));const rows=ranked.filter(p=>(p.name+teams[p.team].name).toLowerCase().includes(q));document.querySelector('#player-table').innerHTML=rows.length?table(['排名','球员','球队','进球','助攻','黄牌','红牌'],rows.map(p=>`<tr><td>${rank(p.rank-1)}</td><td class="name">${p.name} <span class="detail-meta">#${p.number}</span></td><td class="name">${teamLabel(p.team)}</td><td class="${playerMetric==='goals'?'points':''}">${p.goals}</td><td class="${playerMetric==='assists'?'points':''}">${p.assists}</td><td class="yellow">${p.yellow}</td><td class="red">${p.red}</td></tr>`).join('')):'<div class="empty">暂无符合条件的球员。</div>';};
  document.querySelector('#player-search').addEventListener('input',update);document.querySelectorAll('[data-metric]').forEach(b=>b.onclick=()=>{playerMetric=b.dataset.metric;playersPage();});update();
}
function showTeam(id){const t=standings().find(t=>t.id===id);showDialog(`${crest(id,true)}<h2>${t.name}</h2><p class="detail-meta">${t.college} · 演示球队</p><p>${t.played} 场 · ${t.win} 胜 ${t.draw} 平 ${t.loss} 负 · ${t.points} 积分</p><h3>球队阵容</h3>${table(['号码','球员','进球','助攻'],playerStats().filter(p=>p.team===id).map(p=>`<tr><td>${p.number}</td><td>${p.name}</td><td>${p.goals}</td><td>${p.assists}</td></tr>`).join(''))}`);}
function showMatch(id){const m=matches[id];showDialog(`<span class="badge">第 ${m.round} 轮 · ${m.played?'已结束':'未开始'}</span><div class="versus"><div>${crest(m.home,true)}<br>${teams[m.home].name}</div><b>${m.played?m.homeGoals+' : '+m.awayGoals:'VS'}</b><div>${crest(m.away,true)}<br>${teams[m.away].name}</div></div><p class="detail-meta">${m.date} ${m.time} · ${m.venue}</p><h3>比赛事件</h3>${m.played?(m.events.length?m.events.map(e=>`<div class="event"><time>${e.minute}′</time><span>${e.type==='goal'?'⚽ 进球':e.type==='yellow'?'🟨 黄牌':'🟥 红牌'} · ${players[e.player].name}<br><span class="detail-meta">${teams[e.team].name}${e.type==='goal'&&e.assist!==null?' · 助攻：'+players[e.assist].name:''}</span></span></div>`).join(''):'<p class="detail-meta">本场没有进球或红黄牌记录。</p>'):'<p class="detail-meta">比赛尚未开始，赛后将显示比赛事件。</p>'}<p class="detail-meta">以上为演示记录。</p>`);}
function showDialog(html){document.querySelector('#detail-content').innerHTML=html;document.querySelector('#detail').showModal();}
document.querySelector('#close-dialog').onclick=()=>document.querySelector('#detail').close();
document.querySelector('#detail').addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}});
app.addEventListener('click',e=>{const team=e.target.closest('[data-team]'),match=e.target.closest('[data-match]');if(team)showTeam(Number(team.dataset.team));if(match)showMatch(Number(match.dataset.match));});
function render(){const page=location.hash.slice(1)||'home';document.querySelectorAll('nav a').forEach(a=>{a.classList.toggle('active',a.hash==='#'+page);if(a.hash==='#'+page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});if(page==='fixtures')fixturesPage();else if(page==='standings')app.innerHTML=title('LEAGUE TABLE','为每一分，全力以赴。','根据已完成比赛自动计算排名。')+`<section class="panel">${standingsTable()}<div class="note">胜 3 分，平 1 分，负 0 分。同分依次比较净胜球、进球数，再按球队编号排列；此为演示规则。</div></section>`;else if(page==='teams')teamsPage();else if(page==='players')playersPage();else homePage();window.scrollTo(0,0);}
window.addEventListener('hashchange',render);render();
