/**
 * Nightola-227 FM 核心逻辑脚本 - 最终修复版
 */

// 1. 配置信息
const GITHUB_USER = "nightola"; 
const GITHUB_REPO = "blog-moments";
const GITHUB_BRANCH = "main";

// 2. 状态变量
let rawData = { moments: [], posts: [] }; 
let currentMode = 'moments', currentYear = 'all', searchQuery = '';

// 3. 路径工具：媒体走CDN，MD走原始路径
const getCDNUrl = url => (!url || url.startsWith('http')) ? url : `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${url}`;
// 获取 GitHub Pages 的原始绝对路径
const getRawUrl = path => `https://${GITHUB_USER}.github.io/${GITHUB_REPO}/${path}`;

async function init() {
    try {
        // 读取 JSON，加上随机数防止被浏览器强行缓存旧数据
        const res = await fetch('data.json?t=' + Date.now());
        rawData = await res.json();
        if (Array.isArray(rawData)) rawData = { moments: rawData, posts: [] };
        renderYearBtns();
        render();
    } catch (e) {
        console.error("加载数据失败:", e);
    }
}

/**
 * 核心：读取并渲染 Markdown
 */
async function loadMarkdown(path) {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '<div style="text-align:center;padding:50px;">正在获取文章内容...</div>';
    
    // 强制使用绝对路径访问 GitHub Pages 上的文件
    const targetUrl = getRawUrl(path);

    try {
        const res = await fetch(targetUrl, { cache: "no-cache" }); 
        if (!res.ok) throw new Error(`服务器响应异常: ${res.status}`);
        const md = await res.text();
        
        display.innerHTML = `
            <div class="markdown-body" style="text-align:left; animation: fadeIn 0.4s ease-out;">
                ${marked.parse(md)}
                <hr style="margin:30px 0; opacity:0.1;">
                <button onclick="setMode('posts')" style="cursor:pointer; padding:8px 20px; border-radius:20px; border:none; background:var(--accent-color); color:white; font-weight:bold;">← 返回列表</button>
            </div>`;
        window.scrollTo(0, 0);
    } catch (e) {
        display.innerHTML = `
            <div style="text-align:center; padding:50px; color:#cc0000;">
                <h3>抓取文章失败</h3>
                <p>尝试地址：<a href="${targetUrl}" target="_blank">${targetUrl}</a></p>
                <p>错误详情：${e.message}</p>
                <small>既然手动能打开，请尝试按下 <b>Ctrl + F5</b> 强制刷新网页缓存。</small>
            </div>`;
    }
}

// ==================== 渲染逻辑 ====================

function render() {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '';

    const filteredMoments = (rawData.moments || []).filter(item => {
        const matchesYear = (currentYear === 'all' || item.year === currentYear);
        const matchesSearch = (item.text || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesYear && matchesSearch;
    });

    updateSidebar(filteredMoments);

    if (currentMode === 'posts') {
        renderPostList(rawData.posts || [], display);
    } else if (currentMode === 'moments') {
        renderMoments(filteredMoments, display);
    } else if (currentMode === 'album') {
        renderAlbum(filteredMoments, display);
    }
}

function renderPostList(posts, container) {
    const filtered = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#888;padding-top:50px;">未找到匹配文章</p>';
        return;
    }
    filtered.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post-item';
        div.style = "background:rgba(255,255,255,0.3); padding:20px; border-radius:12px; margin-bottom:15px; cursor:pointer; border:1px solid rgba(255,255,255,0.2); transition: 0.3s;";
        div.innerHTML = `<div style="font-weight:bold; color:var(--accent-color); font-size:1.1rem; margin-bottom:5px;">${post.title}</div><div style="font-size:0.8rem; color:#888;">${post.date}</div>`;
        div.onmouseover = () => div.style.backgroundColor = "rgba(255,255,255,0.6)";
        div.onmouseout = () => div.style.backgroundColor = "rgba(255,255,255,0.3)";
        div.onclick = () => loadMarkdown(post.file);
        container.appendChild(div);
    });
}

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

// ==================== 工具函数 ====================

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

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('#modeNav a').forEach(a => a.classList.remove('active'));
    document.getElementById('nav-' + mode).classList.add('active');
    const yearBar = document.getElementById('yearFilter');
    if (yearBar) yearBar.style.display = (mode === 'posts') ? 'none' : 'flex';
    render();
}

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

function toggle(i) {
    const t = document.getElementById(`t-${i}`), b = document.getElementById(`b-${i}`);
    const isCol = t.classList.toggle('collapsed');
    b.innerText = isCol ? '全文' : '收起';
}

function view(s) { const v = document.getElementById('image-viewer'); v.querySelector('img').src = s; v.style.display = 'flex'; }

init();
