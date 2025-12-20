const GITHUB_USER = "nightola"; 
const GITHUB_REPO = "blog-moments";
const GITHUB_BRANCH = "main";

// 全局数据存储
let rawData = { moments: [], posts: [] }; 
let currentMode = 'moments', currentYear = 'all', searchQuery = '';

const getCDNUrl = url => (!url || url.startsWith('http')) ? url : `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${url}`;

async function init() {
    try {
        const res = await fetch('data.json');
        rawData = await res.json();
        renderYearBtns();
        render();
    } catch (e) {
        console.error("数据加载失败:", e);
    }
}

function renderYearBtns() {
    // 仅针对动态流进行年份提取
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
    
    // 切换到文章模式时，隐藏年份筛选栏以保持整洁
    document.getElementById('yearFilter').style.display = (mode === 'posts') ? 'none' : 'flex';
    render();
}

function handleSearch() {
    searchQuery = document.getElementById('searchInput').value;
    render();
}

function render() {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '';

    // 1. 处理动态和相册的过滤
    const filteredMoments = rawData.moments.filter(item => {
        const matchesYear = (currentYear === 'all' || item.year === currentYear);
        const matchesSearch = (item.text || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesYear && matchesSearch;
    });

    updateSidebar(filteredMoments);

    // 2. 路由分发
    if (currentMode === 'posts') {
        renderPostList(rawData.posts, display);
    } else if (currentMode === 'moments') {
        renderMoments(filteredMoments, display);
    } else if (currentMode === 'album') {
        renderAlbum(filteredMoments, display);
    }
}

// --- 文章渲染逻辑 ---
function renderPostList(posts, container) {
    // 搜索过滤文章标题
    const filteredPosts = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filteredPosts.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#888;">没有找到相关文章</p>';
        return;
    }

    filteredPosts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post-item'; // 记得在 style.css 加入对应的样式
        div.style = "background:rgba(255,255,255,0.3); padding:15px; border-radius:12px; margin-bottom:15px; cursor:pointer;";
        div.innerHTML = `<div style="font-weight:bold; color:var(--accent-color);">${post.title}</div>
                         <div style="font-size:0.8rem; color:#888;">${post.date}</div>`;
        div.onclick = () => loadMarkdown(post.file);
        container.appendChild(div);
    });
}

async function loadMarkdown(path) {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = "正在加载文章...";
    try {
        const res = await fetch(path);
        const md = await res.text();
        // 使用 marked 渲染 MD
        display.innerHTML = `<div class="markdown-body" style="text-align:left;">
                                ${marked.parse(md)}
                                <hr style="margin:20px 0; opacity:0.2;">
                                <button onclick="setMode('posts')" style="cursor:pointer; padding:5px 15px; border-radius:5px; border:none; background:var(--accent-color); color:white;">返回列表</button>
                             </div>`;
    } catch (e) {
        display.innerHTML = "读取文章失败，请确认文件路径。";
    }
}

// --- 原有功能逻辑 (统计/动态/相册) ---
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

// 绘制词云 (保持原样)
function drawCloud(text) {
    const container = document.getElementById('wordcloud-container');
    const words = text.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, " ").split(/\s+/).filter(w => w.length >= 1);
    if (words.length < 5) { container.innerHTML = '<div class="no-data-hint">字数较少...</div>'; return; }
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
