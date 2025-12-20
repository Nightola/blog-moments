/**
 * Nightola-227 FM 综合管理脚本
 * 功能：动态、相册、Markdown长文章、Formspree提问箱 (集成全局搜索)
 */

// 1. 基础配置
const GITHUB_USER = "nightola"; 
const GITHUB_REPO = "blog-moments";
const GITHUB_BRANCH = "main";
const FORMSPREE_ID = "xblnqnen"; 

// 2. 全局状态
let rawData = { moments: [], posts: [] }; 
let currentMode = 'moments', currentYear = 'all', searchQuery = '';

// 3. 历史问答数据 (放在外部方便管理)
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

// 4. 工具函数
const getCDNUrl = url => (!url || url.startsWith('http')) ? url : `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${url}`;
const getRawUrl = path => `https://${GITHUB_USER}.github.io/${GITHUB_REPO}/${path}`;

async function init() {
    try {
        const res = await fetch('data.json?t=' + Date.now());
        rawData = await res.json();
        if (Array.isArray(rawData)) rawData = { moments: rawData, posts: [] };
        renderYearBtns();
        render();
    } catch (e) { console.error("初始化失败:", e); }
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('#modeNav a').forEach(a => a.classList.remove('active'));
    document.getElementById('nav-' + mode).classList.add('active');
    const yearBar = document.getElementById('yearFilter');
    if (yearBar) yearBar.style.display = (mode === 'moments' || mode === 'album') ? 'flex' : 'none';
    render();
}

/**
 * 统一搜索处理逻辑
 */
function handleSearch() {
    searchQuery = document.getElementById('searchInput').value.toLowerCase();
    
    // 如果在提问箱模式，实时过滤 QnA 项
    if (currentMode === 'qna') {
        const items = document.querySelectorAll('.qna-item');
        items.forEach(item => {
            const text = item.innerText.toLowerCase();
            item.style.display = text.includes(searchQuery) ? 'block' : 'none';
        });
    } else {
        // 其他模式下重新触发全局渲染
        render();
    }
}

function render() {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '';

    const filteredMoments = (rawData.moments || []).filter(item => {
        const matchesYear = (currentYear === 'all' || item.year === currentYear);
        const matchesSearch = (item.text || "").toLowerCase().includes(searchQuery);
        return matchesYear && matchesSearch;
    });

    updateSidebar(filteredMoments);

    switch(currentMode) {
        case 'moments': renderMoments(filteredMoments, display); break;
        case 'album': renderAlbum(filteredMoments, display); break;
        case 'posts': renderPostList(rawData.posts || [], display); break;
        case 'qna': renderQnA(display); break;
    }
}

// ==================== 模块：提问箱 ====================

function renderQnA(container) {
    container.innerHTML = `
        <div class="qna-container">
            <article class="qna-card">
                <div class="section-title">📮 提问箱</div>
                <textarea id="newQuestionInput" class="db-input" placeholder="在这里 write 下你的问题..." rows="3"></textarea>
                <div class="qna-options">
                    <label class="qna-check"><input type="checkbox" id="newPrivateReplyCheck"><span>回复后不公开</span></label>
                    <label class="qna-check"><input type="checkbox" id="newNotifyCheck"><span>接收回复通知</span></label>
                </div>
                <input type="email" id="newEmailInput" class="db-input" placeholder="想收到回复请填邮箱" style="display:none;">
                <button id="newSubmitQuestionBtn" class="db-btn">发送提问</button>
                <div id="newFormMessage" style="text-align:center; margin-top:10px; font-size:12px;"></div>
            </article>
            <div class="qna-divider"></div>
            <article class="qna-card">
                <div class="section-title"><span>🔍 往期存档</span></div>
                <div id="qnaList"></div>
            </article>
        </div>
    `;

    // 渲染问答列表
    const qnaList = document.getElementById('qnaList');
    qnaList.innerHTML = qnaData.map((item, index) => {
        // 搜索过滤逻辑：如果搜索框有内容且不匹配，则初始隐藏
        const isMatch = (item.q + item.a).toLowerCase().includes(searchQuery);
        return `
            <div class="qna-item ${isMatch ? 'visible' : ''} ${index === 0 && !searchQuery ? 'active' : ''}" 
                 style="display: ${isMatch ? 'block' : 'none'}">
                <div class="qna-q" onclick="this.parentElement.classList.toggle('active')">${item.q}</div>
                <div class="qna-a">
                    <p>${item.a}</p>
                    <span class="answer-time">回答于 ${item.time}</span>
                </div>
            </div>
        `;
    }).join('');

    // 绑定表单交互
    const notifyCheck = document.getElementById('newNotifyCheck');
    const emailInput = document.getElementById('newEmailInput');
    const submitBtn = document.getElementById('newSubmitQuestionBtn');

    notifyCheck.onchange = (e) => emailInput.style.display = e.target.checked ? 'block' : 'none';
    submitBtn.onclick = async () => {
        const text = document.getElementById('newQuestionInput').value.trim();
        if(!text) return;
        submitBtn.disabled = true;
        submitBtn.innerText = "发送中...";
        const fd = new FormData();
        fd.append("question", text);
        fd.append("private", document.getElementById('newPrivateReplyCheck').checked);
        if(notifyCheck.checked) fd.append("email", emailInput.value);
        try {
            const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
                method: "POST", body: fd, headers: { Accept: "application/json" }
            });
            if(res.ok) {
                document.getElementById('newFormMessage').innerHTML = "<span style='color:#10b981'>发送成功！</span>";
                document.getElementById('newQuestionInput').value = "";
            }
        } catch(e) {
            document.getElementById('newFormMessage').innerHTML = "<span style='color:#ef4444'>发送失败。</span>";
        }
        submitBtn.disabled = false;
        submitBtn.innerText = "发送提问";
    };
}

// ==================== 模块：长文章 ====================

function renderPostList(posts, container) {
    const filtered = posts.filter(p => p.title.toLowerCase().includes(searchQuery));
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#888;padding-top:50px;">未找到匹配文章</p>';
        return;
    }
    filtered.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post-item';
        div.style = "background:rgba(255,255,255,0.3); padding:20px; border-radius:12px; margin-bottom:15px; cursor:pointer; border:1px solid rgba(255,255,255,0.2);";
        div.innerHTML = `<div style="font-weight:bold; color:var(--accent-color); font-size:1.1rem;">${post.title}</div><div style="font-size:0.8rem; opacity:0.6;">${post.date}</div>`;
        div.onclick = () => loadMarkdown(post.file);
        container.appendChild(div);
    });
}

async function loadMarkdown(path) {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '<div style="text-align:center;padding:50px;">正在加载文章...</div>';
    try {
        const res = await fetch(getRawUrl(path), { cache: "no-cache" });
        const md = await res.text();
        display.innerHTML = `<div class="markdown-body">${marked.parse(md)}<hr><button onclick="setMode('posts')" class="db-btn" style="width:auto;padding:8px 20px;">← 返回列表</button></div>`;
        window.scrollTo(0, 0);
    } catch (e) { display.innerHTML = "读取失败"; }
}

// ==================== 模块：动态与相册 ====================

function renderMoments(data, container) {
    data.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'moment-card';
        let mediaHtml = '';
        if (item.video) {
            mediaHtml = `<video class="moment-video" controls src="${getCDNUrl(item.video)}"></video>`;
        } else if (item.music) {
            mediaHtml = `<a href="${item.music.url}" target="_blank" class="music-share-card"><img src="${getCDNUrl(item.music.cover)}" class="music-cover"><div><div class="music-title">${item.music.title}</div><div class="music-artist">${item.music.artist}</div></div></a>`;
        } else if (item.imgs) {
            mediaHtml = `<div class="moment-gallery">${item.imgs.map(img => `<img src="${getCDNUrl(img)}" onclick="view('${getCDNUrl(img)}')">`).join('')}</div>`;
        }
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

// ==================== 其他工具 ====================

function updateSidebar(data) {
    let words = 0, imgs = 0, music = 0, textAgg = "";
    data.forEach(item => {
        words += (item.text || "").length;
        imgs += (item.imgs ? item.imgs.length : 0);
        if (item.music) music++;
        textAgg += (item.text || "") + " ";
    });
    document.getElementById('s-count').innerText = data.length;
    document.getElementById('s-words').innerText = words;
    document.getElementById('s-imgs').innerText = imgs;
    document.getElementById('s-music').innerText = music;
    setTimeout(() => drawCloud(textAgg), 200);
}

function drawCloud(text) {
    const container = document.getElementById('wordcloud-container');
    const words = text.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, " ").split(/\s+/).filter(w => w.length >= 1);
    if (words.length < 5) { container.innerHTML = '积累中...'; return; }
    container.innerHTML = '<canvas id="wordcloud-canvas"></canvas>';
    const canvas = document.getElementById('wordcloud-canvas');
    canvas.width = container.offsetWidth; canvas.height = 200;
    const freqMap = {}; words.forEach(w => freqMap[w] = (freqMap[w] || 0) + 1);
    const list = Object.entries(freqMap).sort((a,b) => b[1]-a[1]).slice(0, 30);
    WordCloud(canvas, { list, gridSize: 8, weightFactor: size => Math.pow(size, 1.1) * (canvas.width / 150), color: 'random-dark', backgroundColor: 'transparent', rotateRatio: 0 });
}

function renderYearBtns() {
    if (!rawData.moments) return;
    const years = [...new Set(rawData.moments.map(d => d.year))].sort().reverse();
    const container = document.getElementById('yearFilter');
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

init();
