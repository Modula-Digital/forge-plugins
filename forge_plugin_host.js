/* Forge Plugin Host – minimal helper bus for both targets (editor/frame)
 * Exposes window.ForgePlugin with:
 *   - register({ id, mount(ctx), unmount?(ctx) })
 *   - events: on(event, fn), off(event, fn), emit(event, payload)
 *   - helpers: ui.addToolbarButton, ui.toast, doc.frame(), doc.win(), doc.doc(), snapshot()
 */

(function(){
  if (window.ForgePlugin) return;

  const bus = {
    _evt: {},
    on(ev, fn){ (this._evt[ev]||(this._evt[ev]=new Set())).add(fn); },
    off(ev, fn){ this._evt[ev]?.delete(fn); },
    emit(ev, payload){ (this._evt[ev]||[]).forEach(fn=>{ try{ fn(payload); }catch(_){} }); }
  };

  const api = {
    _plugins: new Map(),
    register(def){
      if(!def || !def.id || typeof def.mount!=='function'){ console.warn('[ForgePlugin] invalid plugin'); return; }
      if(api._plugins.has(def.id)) return;
      api._plugins.set(def.id, def);
      // auto-mount as soon as host is ready
      if(document.readyState==='complete' || document.readyState==='interactive') mountOne(def);
      else document.addEventListener('DOMContentLoaded', ()=>mountOne(def), {once:true});
    },
    on: bus.on.bind(bus), off: bus.off.bind(bus), emit: bus.emit.bind(bus),

    ui: {
      addToolbarButton({id, label, iconHTML='<i class="far fa-plug"></i>', onClick}){
        // editor toolbar
        const host = document.querySelector('.fg-c-toolbar .ml-auto') || document.querySelector('.fg-topbar .d-flex:last-child');
        if(!host || document.getElementById(id)) return null;
        const btn = document.createElement('button');
        btn.id = id; btn.className = 'fg-btn modula-button modula-gray ml-2';
        btn.innerHTML = `${iconHTML} ${label||''}`.trim();
        btn.addEventListener('click', (e)=>onClick && onClick(e));
        host.appendChild(btn);
        return btn;
      },
      toast(msg){
        const t=document.createElement('div');
        t.textContent=msg; Object.assign(t.style,{
          position:'fixed',right:'16px',bottom:'16px',padding:'8px 10px',borderRadius:'10px',
          background:'#111',color:'#fff',zIndex:999999
        });
        document.body.appendChild(t); setTimeout(()=>t.remove(),1400);
      }
    },

    doc: {
      frame(){ return document.querySelector('#fg-frame'); },
      win(){ return api.doc.frame()?.contentWindow || window; },
      doc(){ return api.doc.frame()?.contentDocument || document; }
    },

    snapshot(){
      // compatible with our inline snapshot system
      document.dispatchEvent(new CustomEvent('forge:snapshot'));
    }
  };

  function mountOne(def){
    try{
      const ctx = {
        host: api,
        target: api.doc.frame() ? (api.doc.doc()===document ? 'editor' : 'editor') : 'editor', // editor default
        frame: api.doc.frame(),
        editorDocument: document,
        canvasDocument: api.doc.doc(),
        canvasWindow: api.doc.win()
      };
      def.mount(ctx);
      bus.emit('plugin:mounted', {id:def.id});
    }catch(err){ console.error('[ForgePlugin] mount error', err); }
  }

  window.ForgePlugin = api;
})();
