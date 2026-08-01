/**
 * Touch DnD bridge — converts touch gestures to HTML5 drag events (Fas 8 PR-0).
 * Shared by schedule.js and dashboard.js. Requires escHtml from dom-utils.js.
 */
(function () {
  function initTouchDndBridge() {
    let touchEl=null, ghost=null, longPressTimer=null, startX=0, startY=0;
    document.addEventListener('touchstart', e => {
      const d=e.target.closest('[draggable="true"]'); if(!d)return;
      startX=e.touches[0].clientX; startY=e.touches[0].clientY;
      longPressTimer=setTimeout(()=>{
        touchEl=d;
        ghost=document.createElement('div');
        ghost.className='dnd-ghost'+(d.classList.contains('activity-item')?' copy-ghost':d.classList.contains('day-tab')?' day-ghost':'');
        const icon=d.querySelector('.text-xl,.text-base,.text-2xl,.text-lg');
        const label=d.querySelector('.font-semibold,.font-bold');
        ghost.innerHTML=`${icon?icon.textContent.trim():''} ${label?escHtml(label.textContent.trim().substring(0,25)):''}`;
        document.body.appendChild(ghost);
        const t=e.touches[0]; ghost.style.left=(t.clientX-60)+'px'; ghost.style.top=(t.clientY-30)+'px';
        d.classList.add('dragging');
        try{d.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true}));}catch(_x){}
      },380);
    },{passive:true});
    document.addEventListener('touchmove', e=>{
      if(longPressTimer&&!touchEl){const dx=Math.abs(e.touches[0].clientX-startX),dy=Math.abs(e.touches[0].clientY-startY);if(dx>8||dy>8){clearTimeout(longPressTimer);longPressTimer=null;}}
      if(!touchEl||!ghost)return;
      const t=e.touches[0]; ghost.style.left=(t.clientX-60)+'px'; ghost.style.top=(t.clientY-30)+'px';
      ghost.style.display='none';
      const el=document.elementFromPoint(t.clientX,t.clientY);
      ghost.style.display='';
      if(el)try{el.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true}));}catch(_x){}
    },{passive:true});
    document.addEventListener('touchend', e=>{
      clearTimeout(longPressTimer); longPressTimer=null;
      if(!touchEl||!ghost){touchEl=null;return;}
      const t=e.changedTouches[0];
      ghost.style.display='none';
      const el=document.elementFromPoint(t.clientX,t.clientY);
      ghost.remove(); ghost=null;
      if(el)try{el.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true}));}catch(_x){}
      try{touchEl.dispatchEvent(new DragEvent('dragend',{bubbles:true}));}catch(_x){}
      touchEl.classList.remove('dragging'); touchEl=null;
    },{passive:true});
  }

  window.initTouchDndBridge = initTouchDndBridge;
})();
