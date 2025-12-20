/**
 * Nightola-227 FM 核心逻辑脚本 - 文章增强版
 * 支持：动态流、纯相册、Markdown长文章读取、实时搜索、数据统计
 */

// 1. 配置信息
const GITHUB_USER = "nightola"; 
const GITHUB_REPO = "blog-moments";
const GITHUB_BRANCH = "main";

// 2. 全局状态变量
let rawData = { moments: [], posts: [] }; 
let currentMode = 'moments', currentYear = 'all', searchQuery = '';

// 3. CDN 地址转换工具
const getCDNUrl = url => (!url || url.startsWith('http')) ? url : `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${url}`;

/**
 * 初始化：从 data.json 获取数据
 */
async function init() {
    try {
        const res = await fetch('data.json');
        if (!res.ok) throw new Error('无法加载 data.json');
        rawData = await res.json();
        
        // 如果 JSON 还是旧的数组格式，自动兼容包裹
        if (Array.isArray(rawData)) {
            rawData = { moments: rawData, posts: [] };
        }
        
        renderYearBtns();
        render();
    } catch (e) {
        console.error("初始化失败:", e);
        document.getElementById('contentDisplay').innerHTML = `<p style="color:red;text-align:center;">数据初始化失败，请检查文件结构。</p>`;
    }
}

/**
 * 渲染年份筛选按钮
 */
function renderYearBtns() {
    if (!rawData.moments) return;
    const years = [...new Set(rawData.moments.map(d => d.year))].sort().reverse();
    const container = document.getElementById('yearFilter');
    container.innerHTML = `<button class="filter-btn active" onclick="setYear('all', this)">全部</button>`;
    years.forEach(year => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.innerText = year;
        btn.onclick = (e) => setYear(year, e.target);
        container.appendChild(btn);
    });
}

function setYear(year, btn) {
    currentYear = year;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
}

/**
 * 导航模式切换
 */
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('#modeNav a').forEach(a => a.classList.remove('active'));
    document.getElementById('nav-' + mode).classList.add('active');
    
    // 切换到文章模式时隐藏年份筛选，动态/相册模式显示
    const yearBar = document.getElementById('yearFilter');
    if (yearBar) yearBar.style.display = (mode === 'posts') ? 'none' : 'flex';
    
    render();
}

/**
 * 实时搜索处理
 */
function handleSearch() {
    searchQuery = document.getElementById('searchInput').value;
    render();
}

/**
 * 核心渲染分发
 */
function render() {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '';

    // 过滤动态数据
    const filteredMoments = (rawData.moments || []).filter(item => {
        const matchesYear = (currentYear === 'all' || item.year === currentYear);
        const matchesSearch = (item.text || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesYear && matchesSearch;
    });

    // 无论在哪个页面，侧边栏数据统计始终基于“动态流”
    updateSidebar(filteredMoments);

    if (currentMode === 'posts') {
        renderPostList(rawData.posts || [], display);
    } else if (currentMode === 'moments') {
        renderMoments(filteredMoments, display);
    } else if (currentMode === 'album') {
        renderAlbum(filteredMoments, display);
    }
}

// ==================== 文章模式逻辑 ====================

function renderPostList(posts, container) {
    // 搜索过滤文章标题
    const filteredPosts = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filteredPosts.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#888;margin-top:50px;">未找到匹配的文章</p>';
        return;
    }

    filteredPosts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post-item';
        div.style = "background:rgba(255,255,255,0.3); padding:20px; border-radius:12px; margin-bottom:15px; cursor:pointer; transition:0.3s; border:1px solid rgba(255,255,255,0.2);";
        div.innerHTML = `
            <div style="font-weight:bold; color:var(--accent-color); font-size:1.1rem; margin-bottom:5px;">${post.title}</div>
            <div style="font-size:0.8rem; color:#888;">发布于 ${post.date}</div>
        `;
        div.onmouseover = () => div.style.background = "rgba(255,255,255,0.6)";
        div.onmouseout = () => div.style.background = "rgba(255,255,255,0.3)";
        div.onclick = () => loadMarkdown(post.file);
        container.appendChild(div);
    });
}

async function loadMarkdown(path) {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '<div style="text-align:center;padding:50px;">正在加载文章内容...</div>';
    
    // 使用 CDN 工具确保路径正确
    const fullUrl = getCDNUrl(path);

    try {
        const res = await fetch(fullUrl);
        if (!res.ok) throw new Error(`HTTP 错误! 状态码: ${res.status}`);
        const md = await res.text();
        
        // 渲染 Markdown
        display.innerHTML = `
            <div class="markdown-body" style="text-align:left; animation: fadeIn 0.5s;">
                ${marked.parse(md)}
                <hr style="margin:30px 0; opacity:0.1;">
                <button onclick="setMode('posts')" style="cursor:pointer; padding:8px 20px; border-radius:20px; border:none; background:var(--accent-color); color:white; font-weight:bold;">← 返回列表</button>
            </div>`;
        window.scrollTo(0, 0); // 自动回滚到顶部
    } catch (e) {
        console.error("加载文章失败:", e);
        display.innerHTML = `
            <div style="text-align:center; padding:50px; color:#cc0000;">
                <h3>读取文章失败</h3>
                <p>尝试访问路径：${path}</p>
                <p>请确认文件已上传至 post 文件夹，且 data.json 中的文件名大小写一致。</p>
                <button onclick="setMode('posts')" style="margin-top:20px;">返回列表</button>
            </div>`;
    }
}

// ==================== 原有功能逻辑 ====================

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
    if (words.length < 5) { container.innerHTML = '<div class="no-data-hint">积累动态中...</div>'; return; }
    container.innerHTML = '<canvas id="wordcloud-canvas"></canvas>';
    const canvas = document.getElementById('wordcloud-canvas');
    canvas.width = container.offsetWidth; canvas.height = 200;
    const freqMap = {};
    words.forEach(w => freqMap[w] = (freqMap[w] || 0) + 1);
    const list = Object.entries(freqMap).sort((a,b) => b[1]-a[1]).slice(0, 30);
    WordCloud(canvas, { list, gridSize: 8, weightFactor: size => Math.pow(size, 1.1) * (canvas.width / 150), color: 'random-dark', backgroundColor: 'transparent', rotateRatio: 0 });
}

function renderMoments(data, container) {
    data.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'moment-card';
        let mediaHtml = '';
        if (item.video) {
            mediaHtml = `<video class="moment-video" controls src="${getCDNUrl(item.video)}" preload="metadata"></video>`;
        } else if (item.music) {
            const cover = item.music.cover ? getCDNUrl(item.music.cover) : 'https://pic1.imgdb.cn/item/6946acea29a616e528622615.jpg';
            mediaHtml = `<a href="${item.music.url}" target="_blank" class="music-share-card">
                        <img src="${cover}" class="music-cover">
                        <div style="min-width:0">
                            <div class="music-title">${item.music.title}</div>
                            <div class="music-artist">${item.music.artist}</div>
                        </div></a>`;
        } else if (item.imgs && item.imgs.length > 0) {
            mediaHtml = `<div class="moment-gallery">` + item.imgs.map(img => `<img src="${getCDNUrl(img)}" onclick="view('${getCDNUrl(img)}')">`).join('') + `</div>`;
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

function toggle(i) {
    const t = document.getElementById(`t-${i}`), b = document.getElementById(`b-${i}`);
    const isCol = t.classList.toggle('collapsed');
    b.innerText = isCol ? '全文' : '收起';
}

function view(s) { const v = document.getElementById('image-viewer'); v.querySelector('img').src = s; v.style.display = 'flex'; }

init();
