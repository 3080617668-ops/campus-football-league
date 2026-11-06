'use strict';
window.League={
  state:null,token:sessionStorage.getItem('league-admin-token')||'',
  get connected(){return typeof window.LEAGUE_CONFIG?.apiBase==='string';},
  get base(){return (window.LEAGUE_CONFIG?.apiBase||'').replace(/\/$/,'');},
  async request(path,options={}){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(this.base+'/api/'+path,{...options,signal:controller.signal,cache:'no-store',headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(this.token?{Authorization:'Bearer '+this.token}:{}),...options.headers}});
      let body;try{body=await response.json();}catch{throw new Error('服务返回异常，请稍后重试。');}
      if(!response.ok){if(response.status===401)this.clearToken();const error=new Error(body.error||'请求失败。');error.status=response.status;throw error;}
      return body;
    }catch(error){if(error.name==='AbortError')throw new Error('连接超时，请检查网络后重试。');throw error;}finally{clearTimeout(timer);}
  },
  async load(){this.state=this.connected?await this.request('state'):await fetch('demo-data.json').then(r=>{if(!r.ok)throw new Error('无法读取演示数据。');return r.json();}).then(data=>({revision:0,updatedAt:null,data}));return this.state;},
  async login(username,password){if(!this.connected)throw new Error('线上数据服务尚未连接。');const result=await this.request('login',{method:'POST',body:JSON.stringify({username,password})});this.token=result.token;sessionStorage.setItem('league-admin-token',this.token);},
  clearToken(){this.token='';sessionStorage.removeItem('league-admin-token');},
  async logout(){try{if(this.token)await this.request('logout',{method:'POST'});}finally{this.clearToken();}},
  async save(data){const result=await this.request('state',{method:'PUT',body:JSON.stringify({revision:this.state.revision,data})});this.state=result;return result;}
};
window.escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
