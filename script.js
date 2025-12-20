/**
 * Nightola-227 FM 终极管理脚本
 * 包含：观测站(Home)、动态(Moments)、相册(Album)、文章(Posts)、提问箱(QnA)
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
    formspreeQnA: 'xblnqnen',
    formspreeMsg: 'mdkrvbap' // 观测站私信
};

// 2. 全局状态
let rawData = { moments: [], posts: [] }; 
let currentMode = 'home', currentYear = 'all', searchQuery = '';
let sbClient = null;
let observationIntervals = []; // 存储观测站的定时器

// ==================== 完整问答数据存档 ====================
const qnaData = [
    {
        q: "为什么要创建博客？",
        a: "简单打个比方吧，你可以把这个博客当作我在这个网络世界里自定义程度比较高的小房子。秋秋空间、朋友圈之类的地方是现成的小房子，但是功能有限，不会有提问箱，也不会存在视奸一下这种好玩的网站。为了自己能住的更舒服，我当然需要自己建一个理想的房子喵～由于自搭博客太折腾，最终还是选择了这个平台作为博客根据地了。",
        time: "2025-12-13 01:30"
    },
    {
        q: "「Nightola-227 FM」的由来？",
        a: "这个名字最初是 2022 年年初用 Apple Music 的时候给一个歌单起的名字。Nightola 这个词是从 Night 来的自创词，现在就作为我的英文id使用了。227 就是我的生日，2 月 27 日。 FM 的话，因为有时挺喜欢音乐电台的嘛，当时希望那个歌单多收集一些适合夜晚听的安静歌曲，所以就那么起了。我感觉这个名字还是相对可以的，所以沿用到博客名上啦(¦3[▓▓]<br><br>至于寓意，并没想太多。现在想想吧，还是希望能通过这个'电台'去展示我自己，并且希望能遇见对的上电波的人。虽然这很难，但我会尽量坚持维护这个博客的～",
        time: "2025-12-13 01:51"
    },
    {
        q: "为什么会怀疑自己是孤独谱系？",
        a: "家里人曾说过，我小时候经常有那种叫名字但不答应的情况，以及人称代词使用错误、盯着天气预报说城市名这样的表现。后来因为心理问题去看医生，医生说我说话语速慢，总是避免眼神交流，行为看着很幼稚，看着就像孤独谱系的人，但是打了个问号。<br><br>后来再思考才发现，自己可能真的是孤独谱系吧。以前上学的时候也曾听到别人说我是'自闭症'，不过那是用来形容我平常在外说话很少，不主动社交的情况。他们把'自闭'想当然理解成了'自我封闭'，衡量也没毛病（笑）<br><br>认真说的话，我是对于八卦、內娱之类的话题提不起一点儿兴趣（除非看乐子），碰见自己感兴趣的领域就可能滔滔不绝，精神起来了。虽然现在还是决定多发空间少找人聊天了，但也习惯一个人在日记或者网络里自说自话了。经常用手机打字，然后就不知不觉打出了长难句……",
        time: "2025-12-13 02:20"
    },
    {
        q: "说出一首最喜欢的中文歌并讲述理由",
        a: "河图的《灯花佐酒》。<br><br>很喜欢这首歌曲的氛围，这里面有故人离去所带来的那种伤痛……以及曲风是河图的独一手，根本不存在替代品。难过的时候常常想听这首歌，虽然可能会听着听着更加emo（）",
        time: "2025-12-13 02:48"
    },
    {
        q: "为什么会喜欢夜晚？",
        a: "很久以前，感觉夜晚很浪漫，能看到很多星星。如果可以，没准能和喜欢的人在这漫漫夜色之下有段美好的回忆。以及以前总是在晚上偷偷用mp3听歌，被新颖旋律冲击的感觉也会让我感觉夜晚很美好。<br><br>只是现在好像对夜晚丧失了滤镜，但我依然喜欢能自由支配、不被打扰的时光。",
        time: "2025-12-13 03:05"
    },
    {
        q: "小时候最喜欢玩的游戏是什么？",
        a: "奥比岛、小花仙，还有皮卡堂。最大的影响就是到现在我还喜欢这种游戏，并且玩过一两百小时的星露谷（懒得完美通关.jpg）",
        time: "2025-12-13 08:39"
    },
    {
        q: "过生日的时候最想收到什么礼物？",
        a: "周边只要好看都可以，不论价格。也可以考虑送我喜欢的音乐人的专辑，或者送我个声库软件（妄想中）🥺",
        time: "2025-12-13 09:05"
    },
    {
        q: "有爱喝的饮料吗？",
        a: "偶然喝喝奶茶、椰奶还能接受。可乐、雪碧都属于气泡小甜水儿，我接受不能，虽然顺手买了之后还是会慢慢喝掉。",
        time: "2025-12-13 09:11"
    },
    {
        q: "最喜欢吃什么？",
        a: "这个问题我难以回答，因为每次我都要思索半天，然后还找不到一个确切的答案。我也怕如果有一天我说我喜欢吃什么之后，别人会为了讨好我而做这道菜，然后说'来，这是你最爱吃的xx，尝尝看'，我无法确定我对一个食物的喜欢是否能保持长期且坚定的态度。<br><br>感觉其他人好像都能比较明确自己喜欢吃什么，但我不是这样的人，不好意思……我只能尝试判断一个东西好吃不好吃。",
        time: "2025-12-13 09:28"
    },
    {
        q: "为什么会喜欢玩碧蓝航线？",
        a: "最初是我哥带我入坑的，但那个时候我还要上学，很少有时间玩。现在玩是发现自己就是喜欢这种挂机类游戏，没有特别的强度焦虑和糟糕的抽卡体验。还有q版小人很可爱，以及联动过我喜欢的角色。",
        time: "2025-12-13 09:33"
    }
];

// 4. 工具函数
const getCDNUrl = url => (!url || url.startsWith('http')) ? url : `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${url}`;
const getRawUrl = path => `https://${GITHUB_USER}.github.io/${GITHUB_REPO}/${path}`;

/**
 * 初始化
 */
async function init() {
    // 初始化 Supabase
    if (typeof supabase !== 'undefined') {
        sbClient = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    }

    try {
        const res = await fetch('data.json?t=' + Date.now());
        rawData = await res.json();
        renderYearBtns();
        render(); // 默认渲染 Home
    } catch (e) { console.error("数据加载失败:", e); }
}

/**
 * 模式切换
 */
function setMode(mode) {
    currentMode = mode;
    // 清除观测站的定时器避免内存泄漏
    observationIntervals.forEach(clearInterval);
    observationIntervals = [];

    document.querySelectorAll('#modeNav a').forEach(a => a.classList.remove('active'));
    const targetNav = document.getElementById('nav-' + mode);
    if (targetNav) targetNav.classList.add('active');

    const yearBar = document.getElementById('yearFilter');
    if (yearBar) yearBar.style.display = (mode === 'moments' || mode === 'album') ? 'flex' : 'none';
    
    render();
}

/**
 * 渲染分发
 */
function render() {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '';

    const filteredMoments = (rawData.moments || []).filter(item => {
        const matchesYear = (currentYear === 'all' || item.year === currentYear);
        const matchesSearch = (item.text || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesYear && matchesSearch;
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

// ==================== 模块：观测站 (Home) ====================

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
                <article class="db-card app-box full-row"><span class="db-label">正在使用 (PC)</span><span class="app-content"><svg class="app-icon" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><path d="M8 21h8M12 17v4"></path></svg><span id="desktop-app-name" class="app-name">等待同步...</span></span><span id="desktop-dot" class="dot-indicator"></span></article>
                <article class="db-card app-box full-row"><span class="db-label">正在使用 (MB)</span><span class="app-content"><svg class="app-icon" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12" y2="18"></line></svg><span id="mobile-app-name" class="app-name">休息中</span></span><span id="mobile-dot" class="dot-indicator"></span></article>
                <article class="db-card music-box full-row" id="music-card"><span class="db-label">正在聆听</span><div class="music-body"><img id="music-art" class="music-img" src="" alt=""><div class="music-content"><div class="music-info-wrap"><span id="music-track" class="music-title">静止中...</span><span id="music-artist" class="music-sub">无信号</span></div></div></div></article>
                <article class="db-card msg-box full-row">
                    <div class="msg-header"><span class="db-label">私信互动</span><span class="db-meta">加密传输</span></div>
                    <form id="contact-form" class="msg-form">
                        <textarea id="msg-input" class="msg-input msg-area" placeholder="此刻想对我说点什么？" required></textarea>
                        <div id="reply-wrapper" style="display:none;margin-top:8px;"><input type="text" id="reply-field" placeholder="如何称呼你或回信方式？" class="msg-input"></div>
                        <div class="msg-ctrl"><button type="button" class="opt-btn" onclick="toggleReply(this)">＋ 留下回信方式</button><button type="submit" id="msg-submit" class="msg-btn">发射信号</button></div>
                    </form>
                </article>
            </section>
        </section>
    `;

    initHomeLogic();
}

function initHomeLogic() {
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
        pokeCount: document.getElementById('poke-count')
    };

    // 戳一戳初始化
    let p = parseInt(localStorage.getItem('db_pokes') || "0");
    d.pokeCount.textContent = p + " 共鸣";

    // 实时更新函数
    const updateUI = (row) => {
        if(!row) return;
        d.statusText.textContent = row.status === 'awake' ? '清醒中 ✨' : '睡眠中 💤';
        const ld = new Date(row.updated_at);
        d.statusTime.textContent = '更新于 ' + ld.toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
        
        const isFresh = Math.abs(Date.now() - ld.getTime()) < 86400000;
        d.pcName.textContent = (row.pc_app && isFresh) ? row.pc_app : "离线";
        d.pcDot.classList.toggle('active', row.pc_app !== "离线" && isFresh);
        d.mbName.textContent = row.mobile_app || "休息中";
        d.mbDot.classList.toggle('active', row.mobile_app === "在线");
    };

    // Supabase 订阅
    if(sbClient) {
        sbClient.from(CONFIG.tableName).select('*').eq('id', CONFIG.recordId).single().then(({data}) => updateUI(data));
        const sub = sbClient.channel('db_realtime').on('postgres_changes', {event:'UPDATE', schema:'public', table:CONFIG.tableName}, p => updateUI(p.new)).subscribe();
        // 记录订阅以便切换模式时取消
    }

    // 定时任务
    const tick = () => {
        const n = new Date();
        d.clock.textContent = n.toLocaleTimeString('zh-CN', {hour12:false, hour:'2-digit', minute:'2-digit'});
        const s = n.getHours()*3600 + n.getMinutes()*60 + n.getSeconds();
        const eg = Math.floor((s/86400)*100);
        d.energyVal.textContent = eg + '%';
        d.energyFill.style.width = eg + '%';
    };

    const updateMusic = async () => {
        try {
            const r = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${CONFIG.lastfmUser}&api_key=${CONFIG.lastfmKey}&format=json&limit=1`);
            const dat = await r.json();
            const t = dat.recenttracks.track[0];
            if(t && t['@attr'] && t['@attr'].nowplaying === 'true') {
                d.musicTrack.textContent = t.name;
                d.musicArtist.textContent = t.artist['#text'];
                d.musicArt.src = t.image[2]?.['#text'];
                d.musicCard.style.opacity = "1";
            } else {
                d.musicTrack.textContent = "目前没有在听歌...";
                d.musicArt.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                d.musicCard.style.opacity = "0.7";
            }
        } catch(e) {}
    };

    tick(); updateMusic();
    observationIntervals.push(setInterval(tick, 1000));
    observationIntervals.push(setInterval(updateMusic, 15000));

    // 私信表单
    const form = document.getElementById('contact-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('msg-submit');
        btn.disabled = true; btn.innerText = "发射中...";
        const fd = new FormData();
        fd.append("message", document.getElementById('msg-input').value);
        fd.append("contact", document.getElementById('reply-field').value);
        
        try {
            await fetch(`https://formspree.io/f/${CONFIG.formspreeMsg}`, { method: "POST", body: fd, headers: { Accept: "application/json" }});
            btn.innerText = "发射成功！";
            setTimeout(() => { btn.disabled = false; btn.innerText = "发射信号"; form.reset(); }, 2000);
        } catch(e) { btn.innerText = "发射失败"; btn.disabled = false; }
    };
}

// 戳一戳全局函数
window.handlePoke = (e) => {
    e.stopPropagation();
    let p = parseInt(localStorage.getItem('db_pokes') || "0") + 1;
    localStorage.setItem('db_pokes', p);
    document.getElementById('poke-count').textContent = p + " 共鸣";
    const bubble = document.getElementById('poke-bubble');
    const msgs = ["✨ 接收到信号...", "(。-ω-) 唔姆...", "别戳了，屏幕要裂了", "感觉到了一阵心电感应"];
    bubble.textContent = msgs[Math.floor(Math.random()*msgs.length)];
    bubble.classList.add('show');
    setTimeout(() => bubble.classList.remove('show'), 2000);
};

window.toggleReply = (btn) => {
    const wrap = document.getElementById('reply-wrapper');
    const isH = wrap.style.display === 'none';
    wrap.style.display = isH ? 'block' : 'none';
    btn.textContent = isH ? '－ 取消回信方式' : '＋ 留下回信方式';
};

// ==================== 模块：动态/相册/文章/提问箱 (复用之前逻辑) ====================

function handleSearch() {
    searchQuery = document.getElementById('searchInput').value.toLowerCase();
    if (currentMode === 'qna') {
        document.querySelectorAll('.qna-item').forEach(item => {
            item.style.display = item.innerText.toLowerCase().includes(searchQuery) ? 'block' : 'none';
        });
    } else { render(); }
}

function renderMoments(data, container) {
    data.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'moment-card';
        let media = '';
        if (item.imgs) media = `<div class="moment-gallery">${item.imgs.map(img => `<img src="${getCDNUrl(img)}" onclick="view('${getCDNUrl(img)}')">`).join('')}</div>`;
        if (item.music) media = `<a href="${item.music.url}" target="_blank" class="music-share-card"><img src="${getCDNUrl(item.music.cover)}" class="music-cover"><div><div class="music-title">${item.music.title}</div><div class="music-artist">${item.music.artist}</div></div></a>`;
        
        card.innerHTML = `<img src="${getCDNUrl('images/avatar.jpg')}" class="item-avatar">
            <div style="flex:1; min-width:0;">
                <div style="color:var(--accent-color); font-weight:bold;">亚离解星</div>
                <div id="t-${idx}" class="moment-text collapsed">${item.text}</div>
                <div id="b-${idx}" class="expand-btn" style="display:none" onclick="toggle(${idx})">全文</div>
                ${media}
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
    const filtered = posts.filter(p => p.title.toLowerCase().includes(searchQuery));
    filtered.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post-item';
        div.style = "background:var(--db-card-bg); padding:20px; border-radius:12px; margin-bottom:15px; cursor:pointer; border:1px solid var(--db-border);";
        div.innerHTML = `<div style="font-weight:bold; color:var(--accent-color);">${post.title}</div><div style="font-size:0.8rem; opacity:0.6;">${post.date}</div>`;
        div.onclick = () => loadMarkdown(post.file);
        container.appendChild(div);
    });
}

async function loadMarkdown(path) {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '抓取中...';
    try {
        const res = await fetch(getRawUrl(path));
        const md = await res.text();
        display.innerHTML = `<div class="markdown-body">${marked.parse(md)}<hr><button onclick="setMode('posts')" class="db-btn" style="width:auto;padding:8px 20px;">← 返回</button></div>`;
        window.scrollTo(0,0);
    } catch (e) { display.innerHTML = "加载失败"; }
}

function renderQnA(container) {
    container.innerHTML = `
        <div class="qna-container">
            <div class="qna-card">
                <div class="section-title">📮 提问箱</div>
                <textarea id="qna-input" class="db-input" placeholder="提问将被筛选展示..." rows="3"></textarea>
                <div class="qna-options"><label class="qna-check"><input type="checkbox" id="qna-private"><span>不公开</span></label></div>
                <button id="qna-submit" class="db-btn">发送提问</button>
            </div>
            <div class="qna-divider"></div>
            <div id="qnaList">${qnaData.map((item, i) => `
                <div class="qna-item visible ${i===0?'active':''}">
                    <div class="qna-q" onclick="this.parentElement.classList.toggle('active')">${item.q}</div>
                    <div class="qna-a"><p>${item.a}</p><span class="answer-time">${item.time}</span></div>
                </div>`).join('')}</div>
        </div>
    `;
    
    document.getElementById('qna-submit').onclick = async () => {
        const btn = document.getElementById('qna-submit');
        const text = document.getElementById('qna-input').value;
        if(!text) return;
        btn.disabled = true; btn.innerText = "发送中...";
        const fd = new FormData(); fd.append("question", text);
        try {
            await fetch(`https://formspree.io/f/${CONFIG.formspreeQnA}`, { method: "POST", body: fd, headers: { Accept: "application/json" }});
            btn.innerText = "成功！";
            document.getElementById('qna-input').value = "";
        } catch(e) { btn.innerText = "失败"; }
        setTimeout(() => { btn.disabled = false; btn.innerText = "发送提问"; }, 2000);
    };
}

// ==================== 公共辅助逻辑 ====================

function updateSidebar(data) {
    let words = 0, imgs = 0, music = 0, textAgg = "";
    data.forEach(item => {
        words += (item.text || "").length;
        imgs += (item.imgs ? item.imgs.length : 0);
        if (item.music) music++;
        textAgg += (item.text || "") + " ";
    });
    const sCount = document.getElementById('s-count');
    if(sCount) {
        sCount.innerText = data.length;
        document.getElementById('s-words').innerText = words;
        document.getElementById('s-imgs').innerText = imgs;
        document.getElementById('s-music').innerText = music;
        setTimeout(() => drawCloud(textAgg), 200);
    }
}

function drawCloud(text) {
    const container = document.getElementById('wordcloud-container');
    if(!container) return;
    const words = text.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, " ").split(/\s+/).filter(w => w.length >= 1);
    if (words.length < 5) { container.innerHTML = '积累中...'; return; }
    container.innerHTML = '<canvas id="wordcloud-canvas"></canvas>';
    const canvas = document.getElementById('wordcloud-canvas');
    canvas.width = container.offsetWidth; canvas.height = 200;
    const freqMap = {}; words.forEach(w => freqMap[w] = (freqMap[w] || 0) + 1);
    const list = Object.entries(freqMap).sort((a,b) => b[1]-a[1]).slice(0, 30);
    if(typeof WordCloud !== 'undefined') WordCloud(canvas, { list, gridSize: 8, weightFactor: 10, color: 'random-dark', backgroundColor: 'transparent', rotateRatio: 0 });
}

function renderYearBtns() {
    const years = [...new Set(rawData.moments.map(d => d.year))].sort().reverse();
    const container = document.getElementById('yearFilter');
    if(!container) return;
    container.innerHTML = `<button class="filter-btn active" onclick="setYear('all', this)">全部</button>`;
    years.forEach(year => { container.innerHTML += `<button class="filter-btn" onclick="setYear('${year}', this)">${year}</button>`; });
}

function setYear(year, btn) {
    currentYear = year;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); render();
}

function toggle(i) {
    const t = document.getElementById(`t-${i}`), b = document.getElementById(`b-${i}`);
    const isCol = t.classList.toggle('collapsed'); b.innerText = isCol ? '全文' : '收起';
}

function view(s) { const v = document.getElementById('image-viewer'); v.querySelector('img').src = s; v.style.display = 'flex'; }

// 启动！
init();
