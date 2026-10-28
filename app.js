const $=id=>document.getElementById(id);let phrases=[],state={cards:{},favorites:{},correct:0,wrong:0,custom:[]},queue=[],position=0,mode='ru',current=null,recognition=null,voices=[];const KEY='latam-trainer-v1';try{state={...state,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{}function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}function all(){return [...phrases,...state.custom]}function card(id){return state.cards[id]||{interval:0,due:0,reps:0,hard:false}}function normalize(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:«»"'“”„()—-]/g,' ').replace(/\s+/g,' ').trim()}function matches(s,t){let a=normalize(s),b=normalize(t);return a===b||b.split('/').some(x=>normalize(x)===a)}function page(name){['home','train','dictionary','settings'].forEach(x=>$(x).classList.toggle('hidden',x!==name));if(name==='home')stats();if(name==='dictionary')dictionary()}function stats(){let now=Date.now();$('learned').textContent=Object.values(state.cards).filter(x=>x.reps>=2).length;$('due').textContent=Object.values(state.cards).filter(x=>x.due<=now&&x.reps>0).length;$('accuracy').textContent=(state.correct+state.wrong?Math.round(100*state.correct/(state.correct+state.wrong)):0)+'%';$('count').textContent=all().length+' выражений в словаре'}function pick(){let sorted=all().slice().sort((a,b)=>{let ca=card(a.id),cb=card(b.id);return (ca.hard?-2:ca.due<=Date.now()?-1:ca.reps?1:0)-(cb.hard?-2:cb.due<=Date.now()?-1:cb.reps?1:0)});if($('shuffle').checked){let top=sorted.slice(0,Math.max(25,Math.ceil(sorted.length/2)));top.sort(()=>Math.random()-.5);sorted=[...top,...sorted.slice(top.length)]}return sorted.slice(0,mode==='quiz'?10:Math.min(Number($('sessionSize').value),sorted.length))}function start(){mode=$('mode').value;queue=pick();position=0;page('train');render()}function render(){micCheckPending=false;$('check').disabled=false;if(micHoldTimer){clearTimeout(micHoldTimer);micHoldTimer=null}micHoldActive=false;if(recognition){micSession++;micStarting=false;try{recognition.abort()}catch{}}setMicState('idle');if(position>=queue.length){$('prompt').textContent='Тренировка завершена!';$('category').textContent='';$('region').textContent='';$('step').textContent='Готово';$('answer').classList.add('hidden');$('check').disabled=true;$('mic').disabled=true;$('result').classList.add('hidden');$('reveal').classList.add('hidden');$('micStatus').textContent=`Правильных ответов всего: ${state.correct}; ошибок: ${state.wrong}`;return}current=queue[position];$('answer').classList.remove('hidden');$('check').disabled=false;$('mic').disabled=false;$('reveal').classList.remove('hidden');$('result').classList.add('hidden');$('answer').value='';$('micStatus').textContent='';$('step').textContent=`${position+1} / ${queue.length}`;$('category').textContent=current.category;$('region').textContent=current.region.join(' · ');let kind=current.exampleKind||(mode==='quiz'?['ru','es','listen','pron'][position%4]:mode);current.kind=kind;$('prompt').textContent=kind==='ru'?current.ru:kind==='listen'?'🎧 Прослушай фразу':current.es;$('answer').placeholder=kind==='ru'||kind==='pron'?'Ответ на испанском':'Перевод на русском';$('listenBox').classList.toggle('hidden',kind==='es');renderExamples();if(kind==='listen')setTimeout(()=>speak(),150)}function renderExamples(){
 const box=$('examples'),list=$('exampleList');
 list.replaceChildren();
 const source=current.sourcePhrase||current;
 box.classList.toggle('hidden',!!current.sourcePhrase);
 if(current.sourcePhrase)return;
 const scenes=[
  ['En el trabajo dije: «','».','На работе я сказал: «','».'],
  ['Mi amigo dijo: «','».','Мой друг сказал: «','».'],
  ['En casa escuché: «','».','Дома я услышал: «','».']
 ];
 scenes.forEach((parts,index)=>{
  const example={id:'example-'+source.id+'-'+index,es:parts[0]+source.es+parts[1],ru:parts[2]+source.ru+parts[3],region:source.region,category:source.category,context:'Пример употребления выражения.',exampleKind:current.kind,sourcePhrase:source};
  const button=document.createElement('button');
  button.type='button';button.className='example-button';
  const spanish=document.createElement('strong');spanish.textContent=example.es;
  const russian=document.createElement('small');russian.textContent=example.ru;
  button.append(spanish,russian);
  button.onclick=()=>{queue.splice(position,0,example);render();window.scrollTo({top:0,behavior:'smooth'})};
  list.append(button);
 });
}
function checkRecording(){
 if(micStarting||micState==='recording'||micState==='processing'){
  micCheckPending=true;$('check').disabled=true;
  if(micStarting||micState==='recording')stopMic();
  return;
 }
 check();
}
function speak(rate){if(!('speechSynthesis'in window)){$('micStatus').textContent='Озвучивание недоступно в этом браузере';return}speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(current.es);u.lang='es-MX';u.rate=rate||Number($('speed').value);let v=voices.find(v=>v.name===$('voice').value)||voices.find(v=>v.lang.startsWith('es'));if(v)u.voice=v;speechSynthesis.speak(u)}function check(show=false){let kind=current.kind,expected=kind==='ru'||kind==='pron'?current.es:current.ru,typed=$('answer').value.trim(),ok=matches(typed,expected);if(!show){if(!typed)return;state[ok?'correct':'wrong']++;update(ok)}$('correctAnswer').textContent=`${current.es} — ${current.ru}`;$('feedback').textContent=show?'Посмотри правильный ответ':ok?'✓ Текст распознан/введён верно':'Ответ отличается от основного варианта. Синонимы оцени самостоятельно.';$('feedback').className=ok?'good':'bad';$('explanation').textContent=current.context+' Регион: '+current.region.join(', ');$('words').innerHTML='';if(kind==='pron'||kind==='ru'){let typedWords=normalize(typed).split(' ');normalize(current.es).split(' ').forEach((w,i)=>{let el=document.createElement('span');el.textContent=w;el.className=typedWords[i]===w?'ok':'miss';$('words').append(el)})}$('result').classList.remove('hidden');$('reveal').classList.add('hidden');save()}function update(ok){let c=card(current.id);c.reps=ok?c.reps+1:0;c.interval=ok?(c.interval?Math.min(c.interval*2.3,90):1):0;c.due=Date.now()+(ok?c.interval*86400000:60000);c.hard=!ok;state.cards[current.id]=c}function advance(know){let c=card(current.id);if(know){c.reps=Math.max(c.reps,2);c.interval=Math.max(1,c.interval);c.due=Date.now()+c.interval*86400000;c.hard=false}else{c.reps=0;c.due=Date.now()+60000;c.hard=true}state.cards[current.id]=c;save();position++;render()}let micState='idle',micRequestedStop=false,micHadResult=false,micError=false,micStartedAt=0,micTicker=null,micSession=0,micStarting=false,micHoldTimer=null,micHoldActive=false,micIgnoreClickUntil=0,micCheckPending=false;
function setMicState(next,message=''){
 micState=next;
 const btn=$('mic'),status=$('micStatus'),visual=$('micVisual'),label=$('micLabel'),timer=$('micTimer');
 if(btn){btn.textContent=next==='recording'?'■ Остановить':next==='processing'?'⏳ Обработка…':'🎙️ Говорить';btn.disabled=next==='processing';btn.setAttribute('aria-pressed',String(next==='recording'))}
 if(visual){visual.dataset.state=next;visual.classList.toggle('hidden',next==='idle')}
 if(label)label.textContent=message||({recording:'● Идёт запись',processing:'Обрабатываю речь…',done:'✓ Речь распознана',error:'Не удалось распознать речь',idle:''}[next]);
 if(status)status.textContent=message||'';
 if(next!=='recording'&&micTicker){clearInterval(micTicker);micTicker=null}
 if(timer&&next==='idle')timer.textContent='';
}
function stopMic(){
 if(micStarting){micRequestedStop=true;setMicState('processing','Завершаю запись и жду распознавания…');return}
 if(micState!=='recording'||!recognition)return;
 micRequestedStop=true;setMicState('processing','Завершаю запись и жду распознавания…');
 try{recognition.stop()}catch(e){micCheckPending=false;$('check').disabled=false;setMicState('error','Не удалось остановить запись: '+e.message)}
}
function mic(){
 if(micState==='recording'){stopMic();return}
 if(micState==='processing')return;
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){setMicState('error','Распознавание речи не поддерживается. Используй диктовку клавиатуры или текстовый ввод.');return}
 if(!window.isSecureContext){setMicState('error','Для микрофона требуется HTTPS.');return}
 const id=++micSession;micStarting=true;micRequestedStop=false;micHadResult=false;micError=false;
 try{
  if(recognition){try{recognition.abort()}catch{}}
  recognition=new SR();
  recognition.lang=(current.kind==='es'||current.kind==='listen')?'ru-RU':'es-MX';
  recognition.interimResults=true;recognition.continuous=true;recognition.maxAlternatives=1;
  recognition.onstart=()=>{
   if(id!==micSession)return;
   micStarting=false;micStartedAt=Date.now();setMicState('recording','Говори. Нажми ещё раз или отпусти кнопку, чтобы остановить.');
   if(micRequestedStop){micRequestedStop=false;stopMic();return}
   micTicker=setInterval(()=>{const el=$('micTimer');if(el)el.textContent=Math.floor((Date.now()-micStartedAt)/1000)+' с'},250);
  };
  recognition.onresult=e=>{
   if(id!==micSession)return;
   let transcript='',finalText='';
   for(let i=0;i<e.results.length;i++){transcript+=e.results[i][0].transcript+' ';if(e.results[i].isFinal)finalText+=e.results[i][0].transcript+' '}
   $('answer').value=(finalText||transcript).trim();
   if(finalText.trim())micHadResult=true;
   if(micState==='recording')$('micStatus').textContent='Распознаю: '+$('answer').value;
  };
  recognition.onerror=e=>{
   if(id!==micSession)return;
   if(e.error==='no-speech'&&micHadResult)return;
   micStarting=false;micError=true;micCheckPending=false;$('check').disabled=false;setMicState('error','Ошибка микрофона: '+e.error+'. Можно ввести ответ текстом.');
  };
  recognition.onend=()=>{
   if(id!==micSession||micError)return;
   micStarting=false;
   const text=$('answer').value.trim();
   if(text){setMicState('done','Распознано: '+text+'. Нажми «Проверить».')}
   else{setMicState('idle',micRequestedStop?'Запись остановлена, речь не распознана. Попробуй ещё раз.':'Браузер завершил запись. Нажми микрофон для повтора.')}
   if(micCheckPending){micCheckPending=false;$('check').disabled=false;if(text)check()}
  };
  recognition.start();
  setMicState('processing','Запрашиваю доступ к микрофону…');
 }catch(e){micStarting=false;micCheckPending=false;$('check').disabled=false;setMicState('error','Не удалось запустить микрофон: '+e.message)}
}
function setupMicButton(){
 const btn=$('mic');
 const holdDelay=350;
 let pointerId=null;
 function press(e){
  if(btn.disabled||micState==='recording'||micStarting||micHoldTimer)return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  pointerId=e.pointerId;
  micHoldTimer=setTimeout(()=>{
   micHoldTimer=null;micHoldActive=true;micIgnoreClickUntil=Date.now()+900;
   mic();
  },holdDelay);
 }
 function release(e){
  if(pointerId===null||e.pointerId!==pointerId)return;
  pointerId=null;
  if(micHoldTimer){clearTimeout(micHoldTimer);micHoldTimer=null;return}
  if(micHoldActive){
   micHoldActive=false;micIgnoreClickUntil=Date.now()+900;stopMic();
  }
 }
 if(window.PointerEvent){
  btn.addEventListener('pointerdown',press);
  document.addEventListener('pointerup',release);
  document.addEventListener('pointercancel',release);
 }else{
  let touchId=null;
  btn.addEventListener('touchstart',e=>{
   if(btn.disabled||micState==='recording'||micStarting||micHoldTimer)return;
   touchId=e.changedTouches[0].identifier;
   micHoldTimer=setTimeout(()=>{
    micHoldTimer=null;micHoldActive=true;micIgnoreClickUntil=Date.now()+900;mic();
   },holdDelay);
  },{passive:true});
  function touchRelease(e){
   if(touchId===null||![...e.changedTouches].some(t=>t.identifier===touchId))return;
   touchId=null;
   if(micHoldTimer){clearTimeout(micHoldTimer);micHoldTimer=null;return}
   if(micHoldActive){micHoldActive=false;micIgnoreClickUntil=Date.now()+900;stopMic()}
  }
  document.addEventListener('touchend',touchRelease);
  document.addEventListener('touchcancel',touchRelease);
 }
 btn.addEventListener('click',e=>{
  if(Date.now()<micIgnoreClickUntil){e.preventDefault();return}
  mic();
 });
}
function dictionary(){let term=normalize($('search').value),cat=$('catFilter').value,reg=$('regionFilter').value,f=$('listFilter').value;let items=all().filter(p=>(!term||normalize(p.es+' '+p.ru).includes(term))&&(!cat||p.category===cat)&&(!reg||p.region.includes(reg))&&(f==='all'||f==='favorite'&&state.favorites[p.id]||f==='hard'&&card(p.id).hard));let el=$('entries');el.replaceChildren();items.forEach(p=>{let d=document.createElement('div');d.className='phrase';let strong=document.createElement('strong');strong.textContent=p.es;let sub=document.createElement('small');sub.textContent=p.ru+' · '+p.region.join(', ')+' · '+p.category;let b=document.createElement('button');b.textContent=state.favorites[p.id]?'♥ В избранном':'♡ В избранное';b.onclick=()=>{state.favorites[p.id]=!state.favorites[p.id];save();dictionary()};let h=document.createElement('button');h.textContent=card(p.id).hard?'★ Сложная':'☆ Сложная';h.onclick=()=>{let c=card(p.id);c.hard=!c.hard;state.cards[p.id]=c;save();dictionary()};d.append(strong,sub,document.createElement('br'),b,h);el.append(d)});if(!items.length)el.textContent='Ничего не найдено'}function populateVoices(){if(!('speechSynthesis'in window))return;voices=speechSynthesis.getVoices().filter(v=>v.lang.startsWith('es'));let old=$('voice').value;$('voice').replaceChildren(new Option('Автоматически (es)',''));voices.forEach(v=>$('voice').add(new Option(v.name+' · '+v.lang,v.name)));$('voice').value=old}async function init(){try{let r=await fetch('phrases.json');if(!r.ok)throw Error('HTTP '+r.status);phrases=await r.json()}catch(e){$('count').textContent='Не удалось загрузить словарь: '+e.message;return}let categories=[...new Set(phrases.map(x=>x.category))];categories.forEach(x=>$('catFilter').add(new Option(x,x)));$('start').onclick=start;$('back').onclick=()=>page('home');$('check').onclick=checkRecording;$('reveal').onclick=()=>check(true);$('again').onclick=()=>advance(false);$('know').onclick=()=>advance(true);setupMicButton();$('play').onclick=()=>speak();$('slow').onclick=()=>speak(.8);['search','catFilter','regionFilter','listFilter'].forEach(id=>$(id).addEventListener('input',dictionary));$('add').onclick=()=>{let es=$('newEs').value.trim(),ru=$('newRu').value.trim();if(!es||!ru)return;state.custom.push({id:'custom-'+Date.now(),es,ru,region:['LATAM'],category:'Мои фразы',rough:0,context:'Добавлено пользователем'});save();$('newEs').value=$('newRu').value='';dictionary()};$('export').onclick=()=>{let blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='latam-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};$('import').onchange=async e=>{try{let s=JSON.parse(await e.target.files[0].text());if(!s||typeof s!=='object'||!s.cards||!s.favorites||!Array.isArray(s.custom))throw Error('Неверный формат');state={...state,...s};save();stats();alert('Прогресс импортирован')}catch(err){alert('Не удалось импортировать: '+err.message)}};$('light').onchange=e=>document.body.classList.toggle('light',e.target.checked);document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>page(b.dataset.page));if('speechSynthesis'in window){populateVoices();speechSynthesis.onvoiceschanged=populateVoices}if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});stats()}init();
