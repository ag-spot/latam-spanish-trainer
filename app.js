const $=id=>document.getElementById(id);let phrases=[],state={cards:{},favorites:{},correct:0,wrong:0,custom:[],history:[]},queue=[],position=0,mode='ru',current=null,recognition=null,voices=[];const KEY='latam-trainer-v1';try{state={...state,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{}if(!Array.isArray(state.history))state.history=[];function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}function all(){return [...phrases,...state.custom]}function card(id){return state.cards[id]||{interval:0,due:0,reps:0,hard:false}}function normalize(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:«»"'“”„()—-]/g,' ').replace(/\s+/g,' ').trim()}function matches(s,t){let a=normalize(s),b=normalize(t);return a===b||b.split('/').some(x=>normalize(x)===a)}function page(name){['home','train','dictionary','settings','book'].forEach(x=>$(x).classList.toggle('hidden',x!==name));if(name==='home')stats();if(name==='dictionary')dictionary()}let historyVisible=20;
function stats(){
 const now=Date.now(),cards=all().map(p=>card(p.id));
 $('learned').textContent=cards.filter(c=>c.reps>=2).length;
 $('due').textContent=cards.filter(c=>c.hard||(c.reps>0&&c.due<=now)).length;
 $('accuracy').textContent=(state.correct+state.wrong?Math.round(100*state.correct/(state.correct+state.wrong)):0)+'%';
 $('count').textContent=all().length+' выражений в словаре';
 renderHistory();renderReview();
}
function duePhrases(){
 const now=Date.now();
 return all().filter(p=>{const c=card(p.id);return c.hard||(c.reps>0&&c.due<=now)})
  .sort((a,b)=>Number(card(b.id).hard)-Number(card(a.id).hard)||card(a.id).due-card(b.id).due);
}
function startReview(only){
 const due=duePhrases();
 if(!due.length)return;
 mode=$('mode').value;
 queue=only?[only]:due;
 position=0;page('train');render();
}
function renderReview(){
 const due=duePhrases(),list=$('reviewList'),button=$('reviewStart');
 list.replaceChildren();
 button.disabled=!due.length;
 button.textContent=due.length?'Повторить сейчас · '+due.length:'Пока нечего повторять';
 if(!due.length){const p=document.createElement('p');p.className='muted';p.textContent='После ошибки или когда подойдёт срок повторения, фразы появятся здесь.';list.append(p);return}
 due.forEach(p=>{
  const row=document.createElement('button');row.type='button';row.className='review-phrase';
  const title=document.createElement('strong');title.textContent=p.es;
  const translation=document.createElement('small');translation.textContent=p.ru+' · '+(card(p.id).hard?'Сложная':'Пора повторить');
  row.append(title,translation);row.onclick=()=>startReview(p);list.append(row);
 });
}
function recordHistory(result,answer){
 state.history.push({at:Date.now(),id:current.id,es:current.es,ru:current.ru,answer,result,kind:current.kind});
 save();
}
function renderHistory(){
 const list=$('historyList'),more=$('historyMore');
 list.replaceChildren();
 const entries=state.history.slice(-historyVisible).reverse();
 if(!entries.length){const p=document.createElement('p');p.className='muted';p.textContent='Пока нет проверенных ответов.';list.append(p)}
 entries.forEach(item=>{
  const row=document.createElement('div');row.className='history-entry';
  const header=document.createElement('div');header.className='history-meta';
  const time=document.createElement('time');time.textContent=new Date(item.at).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const status=document.createElement('span');status.textContent=item.result==='correct'?'✓ Верно':item.result==='wrong'?'↻ Повторить':'Показан ответ';status.className=item.result==='correct'?'good':item.result==='wrong'?'bad':'muted';
  header.append(time,status);
  const phrase=document.createElement('strong');phrase.textContent=item.es+' — '+item.ru;
  row.append(header,phrase);
  if(item.answer){const answer=document.createElement('small');answer.textContent='Ответ: '+item.answer;row.append(answer)}
  list.append(row);
 });
 more.classList.toggle('hidden',state.history.length<=historyVisible);
}
function pick(){let sorted=all().slice().sort((a,b)=>{let ca=card(a.id),cb=card(b.id);return (ca.hard?-2:ca.due<=Date.now()?-1:ca.reps?1:0)-(cb.hard?-2:cb.due<=Date.now()?-1:cb.reps?1:0)});if($('shuffle').checked){let top=sorted.slice(0,Math.max(25,Math.ceil(sorted.length/2)));top.sort(()=>Math.random()-.5);sorted=[...top,...sorted.slice(top.length)]}return sorted.slice(0,mode==='quiz'?10:Math.min(Number($('sessionSize').value),sorted.length))}function start(){mode=$('mode').value;queue=pick();position=0;page('train');render()}function render(){micCheckPending=false;voiceReviewPending=false;wasRecognized=false;recognizedEdited=false;$('check').textContent='Проверить запись';$('answer').classList.remove('answer-correct','answer-wrong');$('answer').readOnly=false;$('answerFeedback').textContent='';$('answerFeedback').classList.add('hidden');$('check').disabled=false;if(micHoldTimer){clearTimeout(micHoldTimer);micHoldTimer=null}micHoldActive=false;if(recognition){micSession++;micStarting=false;try{recognition.abort()}catch{}}setMicState('idle');if(position>=queue.length){$('scenario').classList.add('hidden');$('examples').classList.add('hidden');$('prompt').textContent='Тренировка завершена!';$('category').textContent='';$('region').textContent='';$('step').textContent='Готово';$('answer').classList.add('hidden');$('check').disabled=true;$('mic').disabled=true;$('result').classList.add('hidden');$('reveal').classList.add('hidden');$('micStatus').textContent=`Правильных ответов всего: ${state.correct}; ошибок: ${state.wrong}`;return}current=queue[position];$('answer').classList.remove('hidden');$('check').disabled=false;$('mic').disabled=false;$('reveal').classList.remove('hidden');$('result').classList.add('hidden');$('answer').value='';$('micStatus').textContent='';$('step').textContent=`${position+1} / ${queue.length}`;$('category').textContent=current.category;$('region').textContent=current.region.join(' · ');let kind=current.exampleKind||(mode==='quiz'?['ru','es','listen','pron'][position%4]:mode);current.kind=kind;$('scenario').textContent=current.scenarioEs?(kind==='es'||kind==='listen'?current.scenarioEs:current.scenarioRu):'';$('scenario').classList.toggle('hidden',!current.scenarioEs);$('prompt').textContent=kind==='ru'?current.ru:kind==='listen'?'🎧 Прослушай фразу':current.es;$('answer').placeholder=kind==='ru'||kind==='pron'?'Ответ на испанском':'Перевод на русском';$('listenBox').classList.toggle('hidden',kind==='es');renderExamples();if(kind==='listen')setTimeout(()=>speak(),150)}
const EXAMPLE_SENTENCES={"0":[["Estoy harto de esperar a que me respondas.","Я устал ждать, пока ты мне ответишь."],["Estoy harto de trabajar hasta tan tarde.","Мне надоело работать допоздна."],["Estoy harto de escuchar siempre la misma excusa.","Мне надоело постоянно слышать одно и то же оправдание."]],"1":[["Me importa un carajo lo que dijiste.","Мне похуй на то, что ты сказал."],["Me importa un carajo lo que piensen de mí.","Мне похуй, что обо мне думают."],["A él le importa un carajo lo que ella siente.","Ему похуй на её чувства."]],"2":[["Me chupa un huevo lo que dijiste.","Мне похуй на то, что ты сказал."],["Me chupa un huevo lo que piensen de mí.","Мне похуй, что обо мне думают."],["Me chupa un huevo si vienen o no.","Мне похуй, придут они или нет."]],"3":[["No me jodas, estoy intentando concentrarme.","Не доставай меня, я пытаюсь сосредоточиться."],["No me jodas con eso otra vez.","Не заёбывай меня опять этим."],["No me jodas, ya te dije que no voy.","Не доставай меня, я уже сказал, что не пойду."]],"17":[["No tengo ganas de salir esta noche.","Мне не хочется сегодня никуда идти."],["No tengo ganas de discutir ahora.","Мне сейчас не хочется спорить."],["No tengo ganas de cocinar; pidamos algo.","Мне не хочется готовить; давай что-нибудь закажем."]],"25":[["No vale la pena discutir por algo tan pequeño.","Не стоит спорить из-за такой мелочи."],["No vale la pena esperar dos horas por esto.","Не стоит ждать этого два часа."],["No vale la pena gastar tanto dinero.","Не стоит тратить столько денег."]],"47":[["Me da igual si vamos hoy o mañana.","Мне без разницы, пойдём сегодня или завтра."],["Me da igual lo que piensen los demás.","Мне без разницы, что думают другие."],["Me da igual cuál de los dos elijas.","Мне без разницы, какой из двух ты выберешь."]],"153":[["Me da lo mismo ir en bus o caminar.","Мне одинаково, ехать на автобусе или идти пешком."],["Me da lo mismo si llegamos antes o después.","Мне без разницы, приедем раньше или позже."],["Me da lo mismo cuál película veamos.","Мне без разницы, какой фильм мы посмотрим."]],"154":[["Me importa un bledo lo que digan de mí.","Мне плевать, что обо мне говорят."],["Me importa un bledo si no les gusta.","Мне плевать, если им не нравится."],["Me importa un bledo su opinión.","Мне плевать на их мнение."]]};
function renderExamples(){
 const box=$('examples'),list=$('exampleList');
 list.replaceChildren();
 const source=current.sourcePhrase||current;
 box.classList.add('hidden');
 if(current.sourcePhrase)return;
 const sentences=source.examples||EXAMPLE_SENTENCES[source.id]||[];
 sentences.forEach(([es,ru],index)=>{
  const example={
   id:'example-'+source.id+'-'+index,es,ru,region:source.region,
   category:source.category,context:'Пример употребления выражения.',
   exampleKind:current.kind,sourcePhrase:source
  };
  const button=document.createElement('button');
  button.type='button';button.className='example-button';
  const spanish=document.createElement('strong');
  spanish.textContent=es;
  const russian=document.createElement('small');
  russian.textContent=ru;
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
function speak(rate){if(!('speechSynthesis'in window)){$('micStatus').textContent='Озвучивание недоступно в этом браузере';return}speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(current.es);u.lang='es-MX';u.rate=rate||Number($('speed').value);let v=voices.find(v=>v.name===$('voice').value)||voices.find(v=>v.lang.startsWith('es'));if(v)u.voice=v;speechSynthesis.speak(u)}function check(show=false){if(!$('result').classList.contains('hidden'))return;let kind=current.kind,expected=kind==='ru'||kind==='pron'?current.es:current.ru,typed=$('answer').value.trim(),ok=matches(typed,expected);if(!show&&wasRecognized&&!recognizedEdited&&!voiceReviewPending&&typed&&!ok){voiceReviewPending=true;$('check').textContent='Подтвердить ответ';$('answerFeedback').textContent='Проверь распознанный текст. Исправь ошибку или подтверди ответ.';$('answerFeedback').className='answer-feedback review-hint';$('answer').focus();return}if(!show){if(!typed){$('answerFeedback').textContent='Сначала произнеси или введи ответ.';$('answerFeedback').classList.remove('hidden');return}state[ok?'correct':'wrong']++;update(ok)}$('answer').classList.toggle('answer-correct',!show&&ok);$('answer').classList.toggle('answer-wrong',!show&&!ok);$('answer').readOnly=true;$('answerFeedback').textContent=show?'Ответ показан ниже.':ok?'✓ Верно':'✕ Ответ отличается — правильный вариант ниже.';$('answerFeedback').className=show?'answer-feedback muted':ok?'answer-feedback good':'answer-feedback bad';recordHistory(show?'reveal':ok?'correct':'wrong',typed);$('examples').classList.toggle('hidden',show||!ok||!$('exampleList').childElementCount);$('check').disabled=true;$('correctAnswer').textContent=`${current.es} — ${current.ru}`;$('feedback').textContent=show?'Посмотри правильный ответ':ok?'✓ Текст распознан/введён верно':'Ответ отличается от основного варианта. Синонимы оцени самостоятельно.';$('feedback').className=ok?'good':'bad';$('explanation').textContent=current.context+' Регион: '+current.region.join(', ');$('cardBook').replaceChildren();addBookNote($('cardBook'),current.sourcePhrase||current,'train');$('words').innerHTML='';if(kind==='pron'||kind==='ru'){let typedWords=normalize(typed).split(' ');normalize(current.es).split(' ').forEach((w,i)=>{let el=document.createElement('span');el.textContent=w;el.className=typedWords[i]===w?'ok':'miss';$('words').append(el)})}$('result').classList.remove('hidden');$('reveal').classList.add('hidden');save()}function update(ok){let c=card(current.id);c.reps=ok?c.reps+1:0;c.interval=ok?(c.interval?Math.min(c.interval*2.3,90):1):0;c.due=Date.now()+(ok?c.interval*86400000:60000);c.hard=!ok;state.cards[current.id]=c}function advance(know){let c=card(current.id);if(know){c.reps=Math.max(c.reps,2);c.interval=Math.max(1,c.interval);c.due=Date.now()+c.interval*86400000;c.hard=false}else{c.reps=0;c.due=Date.now()+60000;c.hard=true}state.cards[current.id]=c;save();position++;render()}let micState='idle',micRequestedStop=false,micHadResult=false,micError=false,micStartedAt=0,micTicker=null,micSession=0,micStarting=false,micHoldTimer=null,micHoldActive=false,micIgnoreClickUntil=0,micCheckPending=false,voiceReviewPending=false,wasRecognized=false,recognizedEdited=false;
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
 const id=++micSession;micStarting=true;micRequestedStop=false;micHadResult=false;micError=false;voiceReviewPending=false;wasRecognized=false;recognizedEdited=false;$('check').textContent='Проверить запись';
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
   $('answer').value=(finalText||transcript).trim();wasRecognized=!!$('answer').value;recognizedEdited=false;
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
let bookPages=null,bookReturn='dictionary';
function showBookPage(){
 const id=$('bookPage').value,lines=bookPages?.[id];
 if(!lines)return;
 const scan=$('bookScan');
 scan.src='./book-pages/'+id+'.webp';
 scan.alt='Фрагмент книги '+($('bookPage').selectedIndex+1);
 scan.classList.remove('hidden');
 $('bookCopy').textContent=lines.join('\n');
}
async function openBook(id,returnPage){
 bookReturn=returnPage;
 page('book');
 window.scrollTo(0,0);
 if(!bookPages){
  $('bookStatus').textContent='Загружаю страницы…';
  try{
   const response=await fetch('./book.json');
   if(!response.ok)throw Error('HTTP '+response.status);
   bookPages=await response.json();
   $('bookPage').replaceChildren(...Object.keys(bookPages).map((key,index)=>new Option('Страница '+(index+1),key)));
   $('bookStatus').textContent='';
  }catch{
   $('bookStatus').textContent='Не удалось загрузить страницы. Попробуй открыть книгу ещё раз.';
   return;
  }
 }
 if(id&&bookPages[id])$('bookPage').value=id;
 showBookPage();
}
function addBookNote(container,phrase,returnPage){
 if(!phrase.bookPage)return;
 if(phrase.bookText){
  const details=document.createElement('details');
  const label=document.createElement('summary');
  label.textContent='Пояснение из книги · EN';
  const copy=document.createElement('p');
  copy.className='book-copy';
  copy.textContent=phrase.bookText;
  details.append(label,copy);
  container.append(details);
 }
 const button=document.createElement('button');
 button.type='button';
 button.className='book-link';
 button.textContent='Открыть страницу книги';
 button.onclick=()=>openBook(phrase.bookPage,returnPage);
 container.append(button);
}
function dictionary(){let term=normalize($('search').value),cat=$('catFilter').value,reg=$('regionFilter').value,f=$('listFilter').value;let items=all().filter(p=>(!term||normalize(p.es+' '+p.ru).includes(term))&&(!cat||p.category===cat)&&(!reg||p.region.includes(reg))&&(f==='all'||f==='favorite'&&state.favorites[p.id]||f==='hard'&&card(p.id).hard));let el=$('entries');el.replaceChildren();items.forEach(p=>{let d=document.createElement('div');d.className='phrase';let strong=document.createElement('strong');strong.textContent=p.es;let sub=document.createElement('small');sub.textContent=p.ru+' · '+p.region.join(', ')+' · '+p.category;let b=document.createElement('button');b.textContent=state.favorites[p.id]?'♥ В избранном':'♡ В избранное';b.onclick=()=>{state.favorites[p.id]=!state.favorites[p.id];save();dictionary()};let h=document.createElement('button');h.textContent=card(p.id).hard?'★ Сложная':'☆ Сложная';h.onclick=()=>{let c=card(p.id);c.hard=!c.hard;state.cards[p.id]=c;save();dictionary()};d.append(strong,sub,document.createElement('br'),b,h);addBookNote(d,p,'dictionary');el.append(d)});if(!items.length)el.textContent='Ничего не найдено'}function populateVoices(){if(!('speechSynthesis'in window))return;voices=speechSynthesis.getVoices().filter(v=>v.lang.startsWith('es'));let old=$('voice').value;$('voice').replaceChildren(new Option('Автоматически (es)',''));voices.forEach(v=>$('voice').add(new Option(v.name+' · '+v.lang,v.name)));$('voice').value=old}async function init(){try{let r=await fetch('phrases.json');if(!r.ok)throw Error('HTTP '+r.status);phrases=await r.json()}catch(e){$('count').textContent='Не удалось загрузить словарь: '+e.message;return}let categories=[...new Set(phrases.map(x=>x.category))];categories.forEach(x=>$('catFilter').add(new Option(x,x)));$('openBook').onclick=()=>openBook(null,'dictionary');$('bookBack').onclick=()=>page(bookReturn);$('bookPage').onchange=showBookPage;$('start').onclick=start;$('reviewStart').onclick=()=>startReview();$('answer').addEventListener('input',()=>{if(wasRecognized)recognizedEdited=true});$('historyMore').onclick=()=>{historyVisible+=20;renderHistory()};$('back').onclick=()=>page('home');$('check').onclick=checkRecording;$('reveal').onclick=()=>check(true);$('again').onclick=()=>advance(false);$('know').onclick=()=>advance(true);setupMicButton();$('play').onclick=()=>speak();$('slow').onclick=()=>speak(.5);['search','catFilter','regionFilter','listFilter'].forEach(id=>$(id).addEventListener('input',dictionary));$('add').onclick=()=>{let es=$('newEs').value.trim(),ru=$('newRu').value.trim();if(!es||!ru)return;state.custom.push({id:'custom-'+Date.now(),es,ru,region:['LATAM'],category:'Мои фразы',rough:0,context:'Добавлено пользователем'});save();$('newEs').value=$('newRu').value='';dictionary()};$('export').onclick=()=>{let blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='latam-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};$('import').onchange=async e=>{try{let s=JSON.parse(await e.target.files[0].text());if(!s||typeof s!=='object'||!s.cards||!s.favorites||!Array.isArray(s.custom))throw Error('Неверный формат');state={...state,...s};if(!Array.isArray(state.history))state.history=[];save();stats();alert('Прогресс импортирован')}catch(err){alert('Не удалось импортировать: '+err.message)}};let savedTheme=null;try{savedTheme=localStorage.getItem('latam-theme')}catch{}$('light').checked=savedTheme!=='dark';document.body.classList.toggle('light',$('light').checked);$('light').onchange=e=>{document.body.classList.toggle('light',e.target.checked);try{localStorage.setItem('latam-theme',e.target.checked?'light':'dark')}catch{}};document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>page(b.dataset.page));if('speechSynthesis'in window){populateVoices();speechSynthesis.onvoiceschanged=populateVoices}if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});stats()}init();
