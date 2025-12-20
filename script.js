/**
 * Nightola-227 FM 综合管理脚本
 * 包含：动态、相册、Markdown长文章、Formspree提问箱
 */

// 1. 基础配置
const GITHUB_USER = "nightola"; 
const GITHUB_REPO = "blog-moments";
const GITHUB_BRANCH = "main";
const FORMSPREE_ID = "xblnqnen"; // 你的 Formspree ID

// 2. 全局状态
let rawData = { moments: [], posts: [] }; 
let currentMode = 'moments', currentYear = 'all', searchQuery = '';

// 3. 工具函数
const getCDNUrl = url => (!url || url.startsWith('http')) ? url : `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${url}`;
const getRawUrl = path => `https://${GITHUB_USER}.github.io/${GITHUB_REPO}/${path}`;

/**
 * 页面初始化
 */
async function init() {
    try {
        const res = await fetch('data.json?t=' + Date.now());
        rawData = await res.json();
        if (Array.isArray(rawData)) rawData = { moments: rawData, posts: [] };
        
        renderYearBtns();
        render();
    } catch (e) {
        console.error("数据加载失败:", e);
    }
}

/**
 * 导航切换
 */
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('#modeNav a').forEach(a => a.classList.remove('active'));
    document.getElementById('nav-' + mode).classList.add('active');
    
    // 仅在动态/相册模式显示年份条
    const yearBar = document.getElementById('yearFilter');
    if (yearBar) yearBar.style.display = (mode === 'moments' || mode === 'album') ? 'flex' : 'none';
    
    render();
}

/**
 * 核心渲染逻辑
 */
function render() {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '';

    // 过滤动态数据（供侧边栏统计使用）
    const filteredMoments = (rawData.moments || []).filter(item => {
        const matchesYear = (currentYear === 'all' || item.year === currentYear);
        const matchesSearch = (item.text || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesYear && matchesSearch;
    });

    updateSidebar(filteredMoments);

    // 根据模式分发渲染
    switch(currentMode) {
        case 'moments': renderMoments(filteredMoments, display); break;
        case 'album': renderAlbum(filteredMoments, display); break;
        case 'posts': renderPostList(rawData.posts || [], display); break;
        case 'qna': renderQnA(display); break;
    }
}

// ==================== 模块一：提问箱 (QnA) ====================

function renderQnA(container) {
    // 渲染提问表单和存档容器
    container.innerHTML = `
        <div class="qna-container">
            <article class="qna-card">
                <div class="section-title">📮 提问箱</div>
                <textarea id="newQuestionInput" class="db-input" placeholder="在这里 write 下你的问题...提问将被筛选展示。" rows="3"></textarea>
                <div class="qna-options">
                    <label class="qna-check"><input type="checkbox" id="newPrivateReplyCheck"><span>回复后不公开提问</span></label>
                    <label class="qna-check"><input type="checkbox" id="newNotifyCheck"><span>接收回复通知</span></label>
                </div>
                <input type="email" id="newEmailInput" class="db-input" placeholder="想收到回复请填邮箱" style="display:none;">
                <button id="newSubmitQuestionBtn" class="db-btn">发送提问</button>
                <div id="newFormMessage" style="text-align:center; margin-top:10px; font-size:12px;"></div>
            </article>
            <div class="qna-divider"></div>
            <article class="qna-card">
                <div class="section-title"><span>🔍 往期存档</span></div>
                <div id="qnaList">
                    <p style="text-align:center; padding:20px; opacity:0.5;">正在加载历史问答...</p>
                </div>
            </article>
        </div>
    `;

    // 绑定表单事件
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
                document.getElementById('newFormMessage').innerHTML = "<span style='color:#10b981'>发送成功！请耐心等待回复。</span>";
                document.getElementById('newQuestionInput').value = "";
            }
        } catch(e) {
            document.getElementById('newFormMessage').innerHTML = "<span style='color:#ef4444'>发送失败，请稍后再试。</span>";
        }
        submitBtn.disabled = false;
        submitBtn.innerText = "发送提问";
    };

    // 渲染历史问答（这里可以直接写死，也可以从 data.json 读取）
    // 为了方便你直接运行，我先写在脚本内，你可以根据需要迁移到 data.json
    const qnaData = [
        {q: "为什么要创建博客？", a: "简单打个比方吧，你可以把这个博客当作我在这个网络世界里自定义程度比较高的小房子...", time: "2025-12-13 01:30"},
        {q: "「Nightola-227 FM」的由来？", a: "这个名字最初是 2022 年年初用 Apple Music 的时候给一个歌单起的名字...", time: "2025-12-13 01:51"}
        // ... 更多问题在此添加
    ];

    const qnaList = document.getElementById('qnaList');
    qnaList.innerHTML = qnaData.map((item, index) => `
        <div class="qna-item visible ${index === 0 ? 'active' : ''}">
            <div class="qna-q" onclick="this.parentElement.classList.toggle('active')">${item.q}</div>
            <div class="qna-a">
                <p>${item.a}</p>
                <span class="answer-time">更新于 ${item.time}</span>
            </div>
        </div>
    `).join('');
}

// ==================== 模块二：长文章 (Markdown) ====================

function renderPostList(posts, container) {
    const filtered = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
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
    display.innerHTML = '<div style="text-align:center;padding:50px;">正在抓取文章...</div>';
    try {
        const res = await fetch(getRawUrl(path), { cache: "no-cache" });
        if (!res.ok) throw new Error('文件未找到');
        const md = await res.text();
        display.innerHTML = `
            <div class="markdown-body" style="text-align:left; animation: fadeIn 0.4s;">
                ${marked.parse(md)}
                <hr style="margin:30px 0; opacity:0.1;">
                <button onclick="setMode('posts')" style="cursor:pointer; padding:8px 20px; border-radius:20px; border:none; background:var(--accent-color); color:white;">← 返回列表</button>
            </div>`;
        window.scrollTo(0, 0);
    } catch (e) {
        display.innerHTML = `<div style="text-align:center; padding:50px; color:#ef4444;">读取文章失败：${e.message}</div>`;
    }
}

// ==================== 模块三：动态与相册 ====================

function renderMoments(data, container) {
    data.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'moment-card';
        let mediaHtml = '';
        if (item.video) {
            mediaHtml = `<video class="moment-video" controls src="${getCDNUrl(item.video)}" preload="metadata"></video>`;
        } else if (item.music) {
            const cover = item.music.cover ? getCDNUrl(item.music.cover) : '';
            mediaHtml = `<a href="${item.music.url}" target="_blank" class="music-share-card">
                        <img src="${cover}" class="music-cover">
                        <div><div class="music-title">${item.music.title}</div><div class="music-artist">${item.music.artist}</div></div></a>`;
        } else if (item.imgs && item.imgs.length > 0) {
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
    const grid = document.createElement('div');
    grid.className = 'album-grid';
    data.forEach(item => {
        if (item.imgs) item.imgs.forEach(img => {
            const el = document.createElement('img');
            el.className = 'album-item'; el.src = getCDNUrl(img); el.onclick = () => view(getCDNUrl(img));
            grid.appendChild(el);
        });
    });
    container.appendChild(grid);
}

// ==================== 模块四：通用功能 (搜索/侧边栏/词云) ====================

function handleSearch() {
    searchQuery = document.getElementById('searchInput').value;
    render();
}

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
    if (words.length < 5) { container.innerHTML = '<div class="no-data-hint">积累中...</div>'; return; }
    container.innerHTML = '<canvas id="wordcloud-canvas"></canvas>';
    const canvas = document.getElementById('wordcloud-canvas');
    canvas.width = container.offsetWidth; canvas.height = 200;
    const freqMap = {};
    words.forEach(w => freqMap[w] = (freqMap[w] || 0) + 1);
    const list = Object.entries(freqMap).sort((a,b) => b[1]-a[1]).slice(0, 30);
    WordCloud(canvas, { list, gridSize: 8, weightFactor: size => Math.pow(size, 1.1) * (canvas.width / 150), color: 'random-dark', backgroundColor: 'transparent', rotateRatio: 0 });
}

function renderYearBtns() {
    if (!rawData.moments) return;
    const years = [...new Set(rawData.moments.map(d => d.year))].sort().reverse();
    const container = document.getElementById('yearFilter');
    container.innerHTML = `<button class="filter-btn active" onclick="setYear('all', this)">全部</button>`;
    years.forEach(year => {
        container.innerHTML += `<button class="filter-btn" onclick="setYear('${year}', this)">${year}</button>`;
    });
}

function setYear(year, btn) {
    currentYear = year;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
}

function toggle(i) {
    const t = document.getElementById(`t-${i}`), b = document.getElementById(`b-${i}`);
    const isCol = t.classList.toggle('collapsed');
    b.innerText = isCol ? '全文' : '收起';
}

function view(s) { const v = document.getElementById('image-viewer'); v.querySelector('img').src = s; v.style.display = 'flex'; }

init();
