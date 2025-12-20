/**
 * Nightola-227 FM 终极管理脚本
 * 状态：全功能整合版 (包含完整观测站逻辑)
 */

// 1. 基础配置
const GITHUB_USER = "nightola"; 
const GITHUB_REPO = "blog-moments";
const GITHUB_BRANCH = "main";

const CONFIG = {
    supabaseUrl: 'https://pbjlcleefihfpeqkinyc.supabase.co',
    supabaseKey: 'sb_publishable_XzmbmXWoZARaKViOoKB95Q_Ut4N7oPr',
    tableName: 'sleep_tracker',
    recordId: 1,
    lastfmUser: 'nightola',
    lastfmKey: '875851062e9caa138b84dcc5554d026e',
    formspreeQnA: 'xblnqnen'
};

// 2. 全局状态
let rawData = { moments: [], posts: [] }; 
let currentMode = 'home', currentYear = 'all', searchQuery = '';
let sb = null;

// 3. 完整问答数据 (已恢复原文)
const qnaData = [
    {q: "为什么要创建博客？", a: "简单打个比方吧，你可以把这个博客当作我在这个网络世界里自定义程度比较高的小房子。秋秋空间、朋友圈之类的地方是现成的小房子，但是功能有限，不会有提问箱，也不会存在视奸一下这种好玩的网站。为了自己能住的更舒服，我当然需要自己建一个理想的房子喵～由于自搭博客太折腾，最终还是选择了这个平台作为博客根据地了。", time: "2025-12-13 01:30"},
    {q: "「Nightola-227 FM」的由来？", a: "这个名字最初是 2022 年年初用 Apple Music 的时候给一个歌单起的名字。Nightola 这个词是从 Night 来的自创词，现在就作为我的英文id使用了。227 就是我的生日，2 月 27 日。 FM 的话，因为有时挺喜欢音乐电台的嘛，当时希望那个歌单多收集一些适合夜晚听的安静歌曲，所以就那么起了。我感觉这个名字还是相对可以的，所以沿用到博客名上啦(¦3[▓▓]", time: "2025-12-13 01:51"},
    {q: "为什么会怀疑自己是孤独谱系？", a: "家里人曾说过，我小时候经常有那种叫名字但不答应的情况，以及人称代词使用错误、盯着天气预报说城市名这样的表现。后来因为心理问题去看医生，医生说我说话语速慢，总是避免眼神交流，行为看着很幼稚，看着就像孤独谱系的人，但是打了个问号。", time: "2025-12-13 02:20"},
    {q: "说出一首最喜欢的中文歌并讲述理由", a: "河图的《灯花佐酒》。很喜欢这首歌曲的氛围，这里面有故人离去所带来的那种伤痛……以及曲风是河图的独一手，根本不存在替代品。难过的时候常常想听这首歌，虽然可能会听着听着更加emo（）", time: "2025-12-13 02:48"},
    {q: "为什么会喜欢夜晚？", a: "很久以前，感觉夜晚很浪漫，能看到很多星星。如果可以，没准能和喜欢的人在这漫漫夜色之下有段美好的回忆。以及以前总是在晚上偷偷用mp3听歌，被新颖旋律冲击的感觉也会让我感觉夜晚很美好。只是现在好像对夜晚丧失了滤镜，但我依然喜欢能自由支配、不被打扰的时光。", time: "2025-12-13 03:05"},
    {q: "小时候最喜欢玩的游戏是什么？", a: "奥比岛、小花仙，还有皮卡堂。最大的影响就是到现在我还喜欢这种游戏，并且玩过一两百小时的星露谷（懒得完美通关.jpg）", time: "2025-12-13 08:39"},
    {q: "过生日的时候最想收到什么礼物？", a: "周边只要好看都可以，不论价格。也可以考虑送我喜欢的音乐人的专辑，或者送我个声库软件（妄想中）🥺", time: "2025-12-13 09:05"},
    {q: "有爱喝的饮料吗？", a: "偶然喝喝奶茶、椰奶还能接受。可乐、雪碧都属于气泡小甜水儿，我接受不能，虽然顺手买了之后还是会慢慢喝掉。", time: "2025-12-13 09:11"},
    {q: "最喜欢吃什么？", a: "这个问题我难以回答，因为每次我都要思索半天，然后还找不到一个确切的答案。我也怕如果有一天我说我喜欢吃什么之后，别人会为了讨好我而做这道菜，然后说'来，这是你最爱吃的xx，尝尝看'，我无法确定我对一个食物的喜欢是否能保持长期且坚定的态度。", time: "2025-12-13 09:28"},
    {q: "为什么会喜欢玩碧蓝航线？", a: "最初是我哥带我入坑的，但那个时候我还要上学，很少有时间玩。现在玩是发现自己就是喜欢这种挂机类游戏，没有特别的强度焦虑和糟糕的抽卡体验。还有q版小人很可爱，以及联动过我喜欢的角色。", time: "2025-12-13 09:33"}
];

// 4. 初始化
async function init() {
    try {
        const res = await fetch('data.json?t=' + Date.now());
        rawData = await res.json();
        renderYearBtns();
        render(); // 默认进入 Home
    } catch (e) { console.error("Data Load Error"); }
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('#modeNav a').forEach(a => a.classList.remove('active'));
    document.getElementById('nav-' + mode).classList.add('active');
    const yb = document.getElementById('yearFilter');
    if (yb) yb.style.display = (mode === 'moments' || mode === 'album') ? 'flex' : 'none';
    render();
}

function render() {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '';
    
    // 全局搜索过滤
    const filteredMoments = (rawData.moments || []).filter(item => {
        const mY = (currentYear === 'all' || item.year === currentYear);
        const mS = (item.text || "").toLowerCase().includes(searchQuery.toLowerCase());
        return mY && mS;
    });

    updateSidebar(filteredMoments);

    switch(currentMode) {
        case 'home': renderHome(display); break;
        case 'moments': renderMoments(filteredMoments, display); break;
        case 'album': renderAlbum(filteredMoments, display); break;
        case 'posts': renderPostList(rawData.posts || [], display); break;
        case 'qna': renderQnA(display); break;
    }
}

// ==================== 核心：观测站逻辑 (完全复刻原生逻辑) ====================

function renderHome(container) {
    container.innerHTML = `
        <section class="db-container">
            <header class="db-header">
                <h3 class="db-title">亚离解星观测站 <svg class="star-dec" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline;vertical-align:middle;animation:star-rot 8s linear infinite"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg></h3>
                <span class="db-live-tag">LIVE</span>
            </header>
            <section class="db-grid">
                <article class="db-card status-box">
                    <span class="db-label">当前状态</span>
                    <span class="status-wrap"><h4 id="status-text" class="status-val">同步中...</h4><span id="poke-bubble" class="db-bubble"></span></span>
                    <div class="status-footer">
                        <span id="status-time" class="db-meta">连接卫星...</span>
                        <div class="poke-group"><span id="poke-count" class="poke-count">0 共鸣</span><button class="poke-btn" onclick="handlePoke(event)">戳我一下</button></div>
                    </div>
                </article>
                <article class="db-card time-box">
                    <span class="db-label">本地时间</span>
                    <span class="time-wrap"><span id="local-clock" class="db-clock">00:00</span></span>
                    <span class="db-energy"><span class="energy-bar"><span id="energy-fill" class="energy-in" style="width:0%"></span></span><span id="energy-value" class="db-meta">--%</span></span>
                </article>
                <article class="db-card app-box full-row"><span class="db-label">正在使用 (PC)</span><span class="app-content"><svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><path d="M8 21h8M12 17v4"></path></svg><span id="desktop-app-name" class="app-name">等待同步...</span></span><span id="desktop-dot" class="dot-indicator"></span></article>
                <article class="db-card app-box full-row"><span class="db-label">正在使用 (MB)</span><span class="app-content"><svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12" y2="18"></line></svg><span id="mobile-app-name" class="app-name">休息中</span></span><span id="mobile-dot" class="dot-indicator"></span></article>
                <article class="db-card music-box full-row" id="music-card"><span class="db-label">正在聆听</span><div class="music-body"><img id="music-art" class="music-img" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Art"><div class="music-content"><div class="music-info-wrap"><span id="music-track" class="music-title">目前没有在听歌...</span><span id="music-artist" class="music-sub">静音中</span></div></div></div></article>
                <article class="db-card msg-box full-row"><div class="msg-header"><span class="db-label">私信互动</span><span class="db-meta">加密传输中</span></div><form class="msg-form" id="contact-form"><div class="input-group"><textarea id="msg-content" name="message" placeholder="此刻想对我说点什么？" required class="msg-input msg-area"></textarea><div id="reply-wrapper" style="display:none;margin-top:8px;"><input type="text" id="reply-to" name="_replyto" placeholder="如何称呼你或联系你？(选填)" class="msg-input reply-input"></div></div><div class="msg-ctrl"><button type="button" class="opt-btn" onclick="toggleReply(this)" id="opt-toggle">＋ 留下回信方式</button><button type="submit" class="msg-btn" id="submit-btn">发射信号</button></div></form></article>
            </section>
            <footer class="db-footer"><a href="https://nightola.mataroa.blog/blog/comments/" class="footer-link">评论区 &rarr;</a><span class="footer-note">Cloud Synced via Supabase</span></footer>
        </section>
    `;

    // 重新挂载逻辑
    mountObservationStation();
}

function mountObservationStation() {
    const d = {
        statusText: document.getElementById('status-text'),
        statusTime: document.getElementById('status-time'),
        clock: document.getElementById('local-clock'),
        energyVal: document.getElementById('energy-value'),
        energyFill: document.getElementById('energy-fill'),
        musicCard: document.getElementById('music-card'),
        musicTrack: document.getElementById('music-track'),
        musicArtist: document.getElementById('music-artist'),
        musicArt: document.getElementById('music-art'),
        pcName: document.getElementById('desktop-app-name'),
        pcDot: document.getElementById('desktop-dot'),
        mbName: document.getElementById('mobile-app-name'),
        mbDot: document.getElementById('mobile-dot'),
        bubble: document.getElementById('poke-bubble'),
        form: document.getElementById('contact-form'),
        btn: document.getElementById('submit-btn'),
        pokeCount: document.getElementById('poke-count')
    };

    // 戳一戳逻辑
    let p = parseInt(localStorage.getItem('db_pokes') || "0");
    d.pokeCount.textContent = p + " 共鸣";
    const q = ["别戳啦，在努力了！", "✨ 接收到信号...", "(。-ω-) 唔姆...", "亚离解状态良好", "捕捉到一颗流星！", "观测站运转中...", "嘿！观测到你在偷懒", "今天的星光很温柔", "别戳了，屏幕要裂了", "( > < ) 哎呀！", "观测站电量+0.0001%", "感觉到了一阵心电感应"];

    window.handlePoke = (e) => {
        e.stopPropagation(); p++;
        localStorage.setItem('db_pokes', p);
        d.pokeCount.textContent = p + " 共鸣";
        d.bubble.textContent = q[Math.floor(Math.random()*q.length)];
        d.bubble.classList.add('show');
        setTimeout(() => d.bubble.classList.remove('show'), 2000);
    };

    // Supabase 渲染逻辑
    const renderData = (row) => {
        if(!row) return;
        d.statusText.textContent = row.status === 'awake' ? '清醒中 ✨' : '睡眠中 💤';
        const ld = new Date(row.updated_at);
        d.statusTime.textContent = '更新于 ' + ld.toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
        
        const isFresh = Math.abs(Date.now() - ld.getTime()) < 86400000;
        const pc = (row.pc_app && row.pc_app !== "离线" && isFresh) ? row.pc_app : "离线";
        d.pcName.textContent = pc;
        d.pcDot.className = pc !== "离线" ? 'dot-indicator active' : 'dot-indicator';

        const mb = row.mobile_app || "在线";
        if (mb === "在线" || (mb !== "休息中" && mb !== "离线" && isFresh)) {
            d.mbName.textContent = mb; d.mbDot.className = 'dot-indicator active';
        } else {
            d.mbName.textContent = "休息中"; d.mbDot.className = 'dot-indicator';
        }
    };

    // 初始化 Supabase 客户端 (如未初始化)
    if (!sb && typeof supabase !== 'undefined') {
        sb = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
        sb.channel('db_realtime').on('postgres_changes', {event:'UPDATE', schema:'public', table:CONFIG.tableName, filter:`id=eq.${CONFIG.recordId}`}, p => renderData(p.new)).subscribe();
    }
    
    // 获取初始数据
    if (sb) sb.from(CONFIG.tableName).select('*').eq('id', CONFIG.recordId).single().then(({data}) => renderData(data));

    // 音乐 & 时钟
    const updateMusic = async () => {
        try {
            const r = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${CONFIG.lastfmUser}&api_key=${CONFIG.lastfmKey}&format=json&limit=1`);
            const dat = await r.json();
            const t = dat.recenttracks.track[0];
            if(t && t['@attr'] && t['@attr'].nowplaying === 'true'){
                d.musicTrack.textContent = t.name;
                d.musicArtist.textContent = t.artist['#text'];
                d.musicArt.src = t.image[2]?.['#text'] || t.image[1]?.['#text'];
                d.musicCard.style.opacity = "1";
            } else {
                d.musicTrack.textContent = "目前没有在听歌...";
                d.musicArtist.textContent = "静音中";
                d.musicArt.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                d.musicCard.style.opacity = "0.7";
            }
        } catch(e) {}
    };

    const tick = () => {
        const n = new Date();
        d.clock.textContent = n.toLocaleTimeString('zh-CN', {hour12:false, hour:'2-digit', minute:'2-digit'});
        const s = n.getHours()*3600 + n.getMinutes()*60 + n.getSeconds();
        const eg = Math.floor((s/86400)*100);
        d.energyVal.textContent = eg + '%';
        d.energyFill.style.width = eg + '%';
    };

    tick(); updateMusic();
    const tInterval = setInterval(tick, 1000);
    const mInterval = setInterval(updateMusic, 15000);

    // 私信互动逻辑
    window.toggleReply = (btn) => {
        const f = document.getElementById('reply-wrapper');
        const isH = f.style.display === 'none';
        f.style.display = isH ? 'block' : 'none';
        btn.textContent = isH ? '－ 取消回信方式' : '＋ 留下回信方式';
    };

    d.form.onsubmit = (e) => {
        e.preventDefault();
        d.btn.disabled = true; d.btn.textContent = '发送中...';
        setTimeout(() => {
            d.btn.textContent = '已发送！';
            setTimeout(() => {
                d.btn.disabled = false; d.btn.textContent = '发射信号';
                d.form.reset(); document.getElementById('reply-wrapper').style.display = 'none';
            }, 2000);
        }, 1000);
    };
}

// ==================== 其他模式 (Moments/Album/Posts/QnA) ====================

function handleSearch() {
    searchQuery = document.getElementById('searchInput').value;
    if (currentMode === 'qna') {
        document.querySelectorAll('.qna-item').forEach(item => {
            item.style.display = item.innerText.toLowerCase().includes(searchQuery.toLowerCase()) ? 'block' : 'none';
        });
    } else { render(); }
}

function renderMoments(data, container) {
    data.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'moment-card';
        let mediaHtml = '';
        if (item.imgs) mediaHtml = `<div class="moment-gallery">${item.imgs.map(img => `<img src="${getCDNUrl(img)}" onclick="view('${getCDNUrl(img)}')">`).join('')}</div>`;
        if (item.music) mediaHtml = `<a href="${item.music.url}" target="_blank" class="music-share-card"><img src="${getCDNUrl(item.music.cover)}" class="music-cover"><div><div class="music-title">${item.music.title}</div><div class="music-artist">${item.music.artist}</div></div></a>`;
        
        card.innerHTML = `<img src="${getCDNUrl('images/avatar.jpg')}" class="item-avatar">
            <div style="flex:1; min-width:0;">
                <div style="color:var(--accent-color); font-weight:bold;">亚离解星</div>
                <div id="t-${idx}" class="moment-text collapsed">${item.text}</div>
                <div id="b-${idx}" class="expand-btn" style="display:none" onclick="toggle(${idx})">全文</div>
                ${mediaHtml}
                <div style="font-size:0.75rem; color:#bbb; margin-top:10px;">${item.date}</div>
            </div>`;
        container.appendChild(card);
        const t = document.getElementById(`t-${idx}`);
        if (t && t.scrollHeight > t.offsetHeight) document.getElementById(`b-${idx}`).style.display = 'block';
    });
}

function renderAlbum(data, container) {
    const grid = document.createElement('div'); grid.className = 'album-grid';
    data.forEach(item => {
        if (item.imgs) item.imgs.forEach(img => {
            const el = document.createElement('img'); el.className = 'album-item'; el.src = getCDNUrl(img); el.onclick = () => view(getCDNUrl(img));
            grid.appendChild(el);
        });
    });
    container.appendChild(grid);
}

function renderPostList(posts, container) {
    posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase())).forEach(post => {
        const div = document.createElement('div');
        div.className = 'post-item';
        div.style = "background:var(--db-card-bg); padding:20px; border-radius:18px; margin-bottom:12px; cursor:pointer; border:1px solid var(--db-border);";
        div.innerHTML = `<div style="font-weight:bold; color:var(--accent-color);">${post.title}</div><div style="font-size:0.8rem; opacity:0.6;">${post.date}</div>`;
        div.onclick = () => loadMarkdown(post.file);
        container.appendChild(div);
    });
}

async function loadMarkdown(path) {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '读取中...';
    try {
        const res = await fetch(getRawUrl(path));
        const md = await res.text();
        display.innerHTML = `<div class="markdown-body">${marked.parse(md)}<hr><button onclick="setMode('posts')" class="db-btn" style="width:auto;padding:8px 20px;">← 返回列表</button></div>`;
        window.scrollTo(0, 0);
    } catch (e) { display.innerHTML = "读取失败"; }
}

function renderQnA(container) {
    container.innerHTML = `
        <div class="qna-container">
            <article class="qna-card">
                <div class="section-title">📮 提问箱</div>
                <textarea id="qnaInput" class="db-input" placeholder="在这里 write 下你的问题..." rows="3"></textarea>
                <button onclick="submitQnA()" class="db-btn" style="margin-top:10px">发送提问</button>
            </article>
            <div id="qnaList" style="margin-top:20px">
                ${qnaData.map((item, i) => `
                    <div class="qna-item visible ${i===0?'active':''}">
                        <div class="qna-q" onclick="this.parentElement.classList.toggle('active')">${item.q}</div>
                        <div class="qna-a"><p>${item.a}</p><span class="answer-time">${item.time}</span></div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// 辅助功能
const getCDNUrl = url => (!url || url.startsWith('http')) ? url : `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${url}`;
const getRawUrl = path => `https://${GITHUB_USER}.github.io/${GITHUB_REPO}/${path}`;

function updateSidebar(data) {
    let w = 0, i = 0, m = 0, txt = "";
    data.forEach(item => { w += (item.text||"").length; i += (item.imgs?item.imgs.length:0); if(item.music) m++; txt += (item.text||"")+" "; });
    const sc = document.getElementById('s-count');
    if (sc) {
        sc.innerText = data.length; document.getElementById('s-words').innerText = w;
        document.getElementById('s-imgs').innerText = i; document.getElementById('s-music').innerText = m;
    }
}

function renderYearBtns() {
    const years = [...new Set(rawData.moments.map(d => d.year))].sort().reverse();
    const c = document.getElementById('yearFilter');
    if(!c) return;
    c.innerHTML = `<button class="filter-btn active" onclick="setYear('all', this)">全部</button>`;
    years.forEach(y => c.innerHTML += `<button class="filter-btn" onclick="setYear('${y}', this)">${y}</button>`);
}

function setYear(y, b) { currentYear = y; document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active')); b.classList.add('active'); render(); }
function toggle(i) { const t = document.getElementById(`t-${i}`), b = document.getElementById(`b-${i}`); const isC = t.classList.toggle('collapsed'); b.innerText = isC ? '全文' : '收起'; }
function view(s) { const v = document.getElementById('image-viewer'); v.querySelector('img').src = s; v.style.display = 'flex'; }

// 启动
init();
