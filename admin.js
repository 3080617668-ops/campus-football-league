'use strict';
const root=document.querySelector('#admin'),notice=document.querySelector('#notice');
const esc=escapeHtml;
let section='matches',draft=null,dirty=false,busy=false;
const message=(text,error=false)=>{notice.textContent=text;notice.classList.toggle('error',error);};
const field=(label,name,value='',type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const select=(label,name,options,value,extra='')=>`<label>${label}<select name="${name}" ${extra}>${options.map(([id,text])=>`<option value="${id}" ${String(id)===String(value)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
const teamOptions=()=>League.state.data.teams.map(t=>[t.id,t.name]);
const playerOptions=team=>League.state.data.players.filter(p=>p.team===Number(team)).map(p=>[p.id,p.name+' #'+p.number]);
function loginPage(){
 document.querySelector('#logout').hidden=true;
 root.innerHTML=`<section class="panel login-panel"><div class="panel-head"><h2>管理员登录</h2></div><form id="login-form" class="admin-form">${field('账号','username','admin','text','required autocomplete="username"')}${field('密码','password','','password','required autocomplete="current-password" maxlength="256"')}<button class="button">登录</button><p class="detail-meta">使用网站维护者设置的管理员密码。登录状态最多保持 8 小时。</p></form></section>`;
 document.querySelector('#login-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;message('正在登录…');try{await League.login(form.username.value,form.password.value);form.password.value='';await League.load();dashboard();message('登录成功，可以开始录入。');}catch(error){message(error.message,true);}finally{button.disabled=false;}};
}
function dashboard(){
 dirty=false;draft=null;document.querySelector('#logout').hidden=false;window.scrollTo(0,0);
 root.innerHTML=`<div class="tabs">${[['matches','赛程与比分'],['teams','球队管理'],['players','球员管理'],['settings','赛季与备份']].map(([k,label])=>`<button class="tab ${section===k?'active':''}" data-section="${k}">${label}</button>`).join('')}<button class="tab" id="reload-data">重新载入</button></div><p class="detail-meta">数据版本 ${League.state.revision} · ${League.state.data.demo?'演示赛季':'正式赛事数据'} · ${League.state.updatedAt?new Date(League.state.updatedAt).toLocaleString('zh-CN'):''}</p><div id="editor"></div>`;
 document.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>{if(!canLeave())return;section=b.dataset.section;dashboard();});
 document.querySelector('#reload-data').onclick=async()=>{if(!canLeave())return;try{await League.load();dashboard();message('已载入最新数据。');}catch(error){message(error.message,true);}};
 ({matches:matchesPanel,teams:teamsPanel,players:playersPanel,settings:settingsPanel})[section]();
}
function canLeave(){return !busy&&(!dirty||confirm('当前编辑尚未保存，确定放弃这些修改？'));}
async function save(data){
 if(busy)return false;busy=true;document.querySelectorAll('#editor button').forEach(b=>b.disabled=true);message('正在保存…');
 try{await League.save(data);dirty=false;dashboard();message('已保存。公开页面将在刷新或 30 秒内更新。');return true;}
 catch(error){message(error.message,true);if(error.status===401){download('未保存的赛事编辑备份.json',data);dirty=false;loginPage();message('登录已过期。未保存的数据已下载备份，请重新登录。',true);}return false;}
 finally{busy=false;document.querySelectorAll('#editor button').forEach(b=>b.disabled=false);}
}
function matchesPanel(){
 const data=League.state.data;
 document.querySelector('#editor').innerHTML=`<div class="toolbar"><button class="button" id="new-match">新增比赛</button><input id="match-search" type="search" placeholder="搜索球队或轮次" aria-label="搜索比赛"></div><div class="panel" id="match-list"></div><div id="match-editor"></div>`;
 const update=()=>{const q=document.querySelector('#match-search').value.trim();const rows=data.matches.filter(m=>(data.teams[m.home].name+' '+data.teams[m.away].name+' 第'+m.round+'轮').includes(q));document.querySelector('#match-list').innerHTML=rows.length?`<div class="table-scroll"><table><thead><tr><th>轮次 / 日期</th><th>比赛</th><th>状态 / 比分</th><th>操作</th></tr></thead><tbody>${rows.map(m=>`<tr><td>第${m.round}轮<br>${esc(m.date)} ${esc(m.time)}</td><td>${esc(data.teams[m.home].name)} vs ${esc(data.teams[m.away].name)}</td><td>${m.played?m.homeGoals+' : '+m.awayGoals:'未开始'}</td><td><button class="tab" data-edit-match="${m.id}">编辑</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">尚无比赛，可新增赛程。</div>';document.querySelectorAll('[data-edit-match]').forEach(b=>b.onclick=()=>{if(canLeave())editMatch(Number(b.dataset.editMatch));});};
 document.querySelector('#match-search').oninput=update;
 document.querySelector('#new-match').onclick=()=>{if(canLeave())editMatch(null);};update();
}
function editMatch(id){
 const data=League.state.data;
 draft=id===null?{id:data.matches.length,round:1,home:0,away:1,date:new Date().toLocaleDateString('en-CA'),time:'14:00',venue:'校园足球场',played:false,homeGoals:0,awayGoals:0,events:[]}:structuredClone(data.matches[id]);
 dirty=false;
 const target=document.querySelector('#match-editor');
 target.innerHTML=`<section class="panel editor-panel"><div class="panel-head"><h2>${id===null?'新增比赛':'编辑比赛'}</h2><button class="tab" id="close-editor" type="button">收起</button></div><form id="match-form" class="admin-form"><div class="form-grid">${field('轮次','round',draft.round,'number','required min="1" max="100"')}${field('日期','date',draft.date,'date','required')}${field('开球时间','time',draft.time,'time','required')}${field('场地','venue',draft.venue,'text','required maxlength="80"')}${select('主队','home',teamOptions(),draft.home)}${select('客队','away',teamOptions(),draft.away)}${select('比赛状态','played',[['false','未开始'],['true','已结束']],String(draft.played))}${field('主队进球','homeGoals',draft.homeGoals,'number','required min="0" max="99"')}${field('客队进球','awayGoals',draft.awayGoals,'number','required min="0" max="99"')}</div><h3>比赛事件</h3><p class="detail-meta">每个进球录入一条记录；黄牌、红牌分别添加。助攻可选“无助攻”。未开始的比赛须保持 0:0 且没有事件。</p><div id="event-list"></div><button type="button" class="tab" id="add-event">＋ 添加事件</button><div class="toolbar"><button class="button" type="submit">保存比赛</button><button class="tab" id="export-draft" type="button">备份当前编辑</button></div></form></section>`;
 const form=document.querySelector('#match-form');
 form.addEventListener('input',()=>dirty=true);form.addEventListener('change',()=>dirty=true);
 form.home.onchange=form.away.onchange=()=>{draft.home=Number(form.home.value);draft.away=Number(form.away.value);renderEvents();};
 document.querySelector('#add-event').onclick=()=>{const options=playerOptions(form.home.value);if(!options.length){message('主队还没有球员，请先在球员管理中添加。',true);return;}draft.events.push({type:'goal',team:Number(form.home.value),player:options[0][0],assist:null,minute:1});dirty=true;renderEvents();};
 document.querySelector('#close-editor').onclick=()=>{if(canLeave()){target.innerHTML='';dirty=false;}};
 document.querySelector('#export-draft').onclick=()=>{readMatchForm();download('比赛编辑备份.json',draft);message('当前编辑已下载备份。');};
 form.onsubmit=async e=>{e.preventDefault();readMatchForm();const next=structuredClone(data);next.matches[draft.id]=draft;await save(next);};
 renderEvents();target.scrollIntoView({behavior:'smooth',block:'start'});
}
function readMatchForm(){const form=document.querySelector('#match-form');for(const key of ['round','home','away','homeGoals','awayGoals'])draft[key]=Number(form.elements[key].value);for(const key of ['date','time','venue'])draft[key]=form.elements[key].value;draft.played=form.played.value==='true';return draft;}
function renderEvents(){
 const data=League.state.data;
 document.querySelector('#event-list').innerHTML=draft.events.map((e,i)=>`<div class="event-editor" data-event="${i}">${select('类型','type',[['goal','进球'],['yellow','黄牌'],['red','红牌']],e.type)}${field('分钟','minute',e.minute,'number','min="1" max="150" required')}${select('球队','team',[[draft.home,data.teams[draft.home].name],[draft.away,data.teams[draft.away].name]],e.team)}${select('球员','player',playerOptions(e.team),e.player,'required')}${e.type==='goal'?select('助攻','assist',[['','无助攻'],...playerOptions(e.team).filter(([id])=>id!==e.player)],e.assist===null?'':e.assist):''}<button type="button" class="tab" data-remove="${i}">移除</button></div>`).join('')||'<p class="detail-meta">暂无事件记录。</p>';
 document.querySelectorAll('[data-event]').forEach(row=>row.onchange=event=>{const i=Number(row.dataset.event),e=draft.events[i],input=event.target;if(!input.name)return;e[input.name]=input.name==='type'?input.value:input.name==='assist'?(input.value===''?null:Number(input.value)):Number(input.value);if(input.name==='team'){e.player=playerOptions(e.team)[0]?.[0]??-1;e.assist=null;}if(input.name==='player'&&e.assist===e.player)e.assist=null;if(input.name==='type')e.assist=null;dirty=true;renderEvents();});
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{draft.events.splice(Number(b.dataset.remove),1);dirty=true;renderEvents();});
}
function teamsPanel(){
 const data=League.state.data;
 document.querySelector('#editor').innerHTML=`<section class="panel"><div class="panel-head"><h2>球队名单</h2><button class="button" id="new-team">新增球队</button></div><div class="team-grid admin-team-grid">${data.teams.map(t=>`<button class="team-card" data-team-edit="${t.id}"><h3>${esc(t.name)}</h3><p>${esc(t.college)}</p><span class="link">编辑球队 →</span></button>`).join('')}</div></section><div id="team-editor"></div>`;
 const edit=id=>{if(!canLeave())return;const t=id===null?{id:data.teams.length,name:'',short:'',college:'',color:'#164ed8'}:data.teams[id];document.querySelector('#team-editor').innerHTML=`<form id="team-form" class="panel admin-form editor-panel"><h2>${id===null?'新增球队':'编辑球队'}</h2><div class="form-grid">${field('球队名称','name',t.name,'text','required maxlength="40"')}${field('队徽简称（1–3字）','short',t.short,'text','required maxlength="3"')}${field('学院 / 组织','college',t.college,'text','maxlength="60"')}${field('球队颜色','color',t.color,'color','required')}</div><button class="button">保存球队</button></form>`;const form=document.querySelector('#team-form');form.oninput=()=>dirty=true;form.onsubmit=async e=>{e.preventDefault();const next=structuredClone(data);next.teams[t.id]={id:t.id,name:form.elements.name.value,short:form.short.value,college:form.college.value,color:form.color.value};await save(next);};};
 document.querySelector('#new-team').onclick=()=>edit(null);document.querySelectorAll('[data-team-edit]').forEach(b=>b.onclick=()=>edit(Number(b.dataset.teamEdit)));
}
function playersPanel(){
 const data=League.state.data;
 document.querySelector('#editor').innerHTML=`<div class="toolbar"><button class="button" id="new-player">新增球员</button>${select('筛选球队','team-filter',[['','全部球队'],...teamOptions()],'')}</div><section class="panel" id="roster"></section><div id="player-editor"></div>`;
 const update=()=>{const selected=document.querySelector('[name="team-filter"]').value;document.querySelector('#roster').innerHTML=`<div class="table-scroll"><table><thead><tr><th>球员</th><th>号码</th><th>球队</th><th>操作</th></tr></thead><tbody>${data.players.filter(p=>selected===''||p.team===Number(selected)).map(p=>`<tr><td>${esc(p.name)}</td><td>${p.number}</td><td>${esc(data.teams[p.team].name)}</td><td><button class="tab" data-player-edit="${p.id}">编辑</button></td></tr>`).join('')}</tbody></table></div>`;document.querySelectorAll('[data-player-edit]').forEach(b=>b.onclick=()=>edit(Number(b.dataset.playerEdit)));};
 const edit=id=>{if(!canLeave())return;const p=id===null?{id:data.players.length,name:'',team:0,number:1}:data.players[id];const hasEvents=data.matches.some(m=>m.events.some(e=>e.player===p.id||e.assist===p.id));document.querySelector('#player-editor').innerHTML=`<form id="player-form" class="panel admin-form editor-panel"><h2>${id===null?'新增球员':'编辑球员'}</h2><div class="form-grid">${field('球员姓名','name',p.name,'text','required maxlength="40"')}${field('球衣号码','number',p.number,'number','required min="1" max="99"')}${select('所属球队','team',teamOptions(),p.team,hasEvents?'disabled':'')}</div>${hasEvents?'<p class="detail-meta">此球员已有比赛记录，保留所属球队以维护历史数据。</p>':''}<button class="button">保存球员</button></form>`;const form=document.querySelector('#player-form');form.oninput=()=>dirty=true;form.onchange=()=>dirty=true;form.onsubmit=async e=>{e.preventDefault();const next=structuredClone(data);next.players[p.id]={id:p.id,name:form.elements.name.value,number:Number(form.number.value),team:Number(form.team.value)};await save(next);};};
 document.querySelector('[name="team-filter"]').onchange=update;document.querySelector('#new-player').onclick=()=>edit(null);update();
}
function download(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function settingsPanel(){
 const data=League.state.data;
 document.querySelector('#editor').innerHTML=`<section class="panel admin-form"><h2>赛季设置</h2><form id="settings-form"><div class="form-grid">${field('赛季名称','season',data.season,'text','required maxlength="40"')}${select('数据标识','demo',[['true','演示数据'],['false','正式赛事数据']],String(data.demo))}</div><p class="detail-meta">请在替换演示球队、球员与比赛记录后，再改为正式赛事数据。此设置只改变标识。</p><button class="button">保存赛季设置</button></form><hr><h3>数据备份</h3><p class="detail-meta">下载完整赛季数据，便于留存和交接。每次成功保存，数据库也会保留上一版本。</p><button class="tab" id="export-all">下载完整数据备份</button></section>`;
 document.querySelector('#export-all').onclick=()=>download('校园足球联赛-数据备份.json',League.state);
 document.querySelector('#settings-form').oninput=()=>dirty=true;document.querySelector('#settings-form').onchange=()=>dirty=true;
 document.querySelector('#settings-form').onsubmit=async e=>{e.preventDefault();const next=structuredClone(data),form=e.currentTarget;next.season=form.season.value;next.demo=form.demo.value==='true';await save(next);};
}
document.querySelector('#logout').onclick=async()=>{if(!canLeave())return;try{await League.logout();dirty=false;loginPage();message('已退出登录。');}catch(error){loginPage();message('本机登录状态已清除。',true);}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
async function start(){
 if(!League.connected){root.innerHTML='<section class="panel empty"><h2>数据服务尚未连接</h2><p>后台页面已准备好；数据库和管理员密码配置完成后即可登录录入。</p><a class="link" href="index.html">返回公开网站</a></section>';message('等待线上数据服务配置。');return;}
 try{await League.load();if(League.token){await League.request('session');dashboard();message('已连接数据服务。');}else{loginPage();message('请登录管理员账号。');}}catch(error){loginPage();message(error.message,true);}
}
start();
