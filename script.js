/**
 * Nightola-227 FM 核心逻辑脚本
 * 集成：动态流、相册切换、年份筛选、实时搜索、数据统计、词云生成
 */

// 1. 配置信息 - 请确保这里的用户名和仓库名正确
const GITHUB_USER = "nightola"; 
const GITHUB_REPO = "blog-moments";
const GITHUB_BRANCH = "main";

// 2. 全局状态变量
let globalData = [];       // 原始数据
let currentMode = 'moments'; // 模式：moments 或 album
let currentYear = 'all';    // 年份：all 或 具体年份
let searchQuery = '';      // 搜索关键词

// 3. CDN 地址转换工具
const getCDNUrl = url => (!url || url.startsWith('http')) ? url : `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${url}`;

/**
 * 初始化：从 data.json 获取数据并首次渲染
 */
async function init() {
    try {
        const res = await fetch('data.json');
        if (!res.ok) throw new Error('无法加载 data.json');
        globalData = await res.json();
        renderYearBtns();
        render();
    } catch (e) {
        console.error(e);
        document.getElementById('contentDisplay').innerHTML = `<p style="text-align:center; color:red;">数据加载失败，请检查文件是否存在或 JSON 格式是否正确。</p>`;
    }
}

/**
 * 渲染年份筛选按钮
 */
function renderYearBtns() {
    const years = [...new Set(globalData.map(d => d.year))].sort().reverse();
    const container = document.getElementById('yearFilter');
    // 保留第一个“全部”按钮，清除旧的年份按钮
    container.innerHTML = `<button class="filter-btn ${currentYear === 'all' ? 'active' : ''}" onclick="setYear('all', this)">全部</button>`;
    
    years.forEach(year => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        if(currentYear === year) btn.classList.add('active');
        btn.innerText = year;
        btn.onclick = (e) => setYear(year, e.target);
        container.appendChild(btn);
    });
}

/**
 * 筛选逻辑：设置年份
 */
function setYear(year, btn) {
    currentYear = year;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
}

/**
 * 模式切换：动态流 vs 纯相册
 */
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('#modeNav a').forEach(a => a.classList.remove('active'));
    document.getElementById('nav-' + mode).classList.add('active');
    render();
}

/**
 * 搜索处理逻辑
 */
function handleSearch() {
    searchQuery = document.getElementById('searchInput').value;
    render(); // 实时触发渲染
}

/**
 * 核心渲染函数：根据筛选条件展示内容
 */
function render() {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '';
    
    // 综合过滤逻辑：年份 + 关键词（不区分大小写）
    const filtered = globalData.filter(item => {
        const matchesYear = (currentYear === 'all' || item.year === currentYear);
        const matchesSearch = (item.text || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesYear && matchesSearch;
    });

    // 更新侧边栏统计数据
    updateSidebar(filtered);

    // 空状态处理
    if (filtered.length === 0) {
        display.innerHTML = `<div style="text-align:center; color:#888; margin-top:50px;">
            <p>没有找到相关动态</p>
            <small>试试其他关键词或年份</small>
        </div>`;
        return;
    }

    // 根据模式渲染不同组件
    if (currentMode === 'moments') {
        renderMoments(filtered, display);
    } else {
        renderAlbum(filtered, display);
    }
}

/**
 * 更新侧边栏：数字统计与词云
 */
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

    // 延迟绘制词云，确保 DOM 已更新
    setTimeout(() => drawCloud(textAgg), 200);
}

/**
 * 绘制词云
 */
function drawCloud(text) {
    const container = document.getElementById('wordcloud-container');
    // 基础过滤：提取汉字和英文，过滤掉符号
    const words = text.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, " ").split(/\s+/).filter(w => w.length >= 1);
    
    if (words.length < 10) {
        container.innerHTML = '<div class="no-data-hint">积累更多动态文字<br>即可生成词云</div>';
        return;
    }
    
    container.innerHTML = '<canvas id="wordcloud-canvas"></canvas>';
    const canvas = document.getElementById('wordcloud-canvas');
    canvas.width = container.offsetWidth;
    canvas.height = 200;

    // 计算词频
    const freqMap = {};
    words.forEach(w => freqMap[w] = (freqMap[w] || 0) + 1);
    const list = Object.entries(freqMap).sort((a,b) => b[1]-a[1]).slice(0, 30);

    WordCloud(canvas, { 
        list, 
        gridSize: 8, 
        weightFactor: size => Math.pow(size, 1.1) * (canvas.width / 150),
        color: 'random-dark',
        backgroundColor: 'transparent',
        rotateRatio: 0
    });
}

/**
 * 渲染模式：动态流
 */
function renderMoments(data, container) {
    data.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'moment-card';
        
        let mediaHtml = '';
        // 1. 视频渲染
        if (item.video) {
            mediaHtml = `<video class="moment-video" controls src="${getCDNUrl(item.video)}" preload="metadata"></video>`;
        } 
        // 2. 音乐渲染
        else if (item.music) {
            const cover = item.music.cover ? getCDNUrl(item.music.cover) : 'https://pic1.imgdb.cn/item/6946acea29a616e528622615.jpg';
            mediaHtml = `<a href="${item.music.url}" target="_blank" class="music-share-card">
                    <img src="${cover}" class="music-cover">
                    <div style="min-width:0">
                        <div class="music-title">${item.music.title}</div>
                        <div class="music-artist">${item.music.artist}</div>
                    </div></a>`;
        } 
        // 3. 多图渲染
        else if (item.imgs && item.imgs.length > 0) {
            mediaHtml = `<div class="moment-gallery">` + 
                item.imgs.map(img => `<img src="${getCDNUrl(img)}" onclick="view('${getCDNUrl(img)}')">`).join('') + `</div>`;
        }

        card.innerHTML = `
            <img src="${getCDNUrl('images/avatar.jpg')}" class="item-avatar">
            <div style="flex:1; min-width:0;">
                <div style="color:var(--accent-color); font-weight:bold;">亚离解星</div>
                <div id="t-${idx}" class="moment-text collapsed">${item.text}</div>
                <div id="b-${idx}" class="expand-btn" style="display:none" onclick="toggle(${idx})">全文</div>
                ${mediaHtml}
                <div style="font-size:0.75rem; color:#bbb; margin-top:10px;">${item.date}</div>
            </div>`;
        container.appendChild(card);
        
        // 检测是否需要显示“全文”按钮
        const t = document.getElementById(`t-${idx}`);
        if (t.scrollHeight > t.offsetHeight) document.getElementById(`b-${idx}`).style.display = 'block';
    });
}

/**
 * 渲染模式：纯相册
 */
function renderAlbum(data, container) {
    const grid = document.createElement('div');
    grid.className = 'album-grid';
    data.forEach(item => {
        if (item.imgs) item.imgs.forEach(img => {
            const el = document.createElement('img');
            el.className = 'album-item'; 
            el.src = getCDNUrl(img);
            el.loading = "lazy";
            el.onclick = () => view(getCDNUrl(img));
            grid.appendChild(el);
        });
    });
    container.appendChild(grid);
}

/**
 * 动态文字折叠切换
 */
function toggle(i) {
    const t = document.getElementById(`t-${i}`), b = document.getElementById(`b-${i}`);
    const isCol = t.classList.toggle('collapsed');
    b.innerText = isCol ? '全文' : '收起';
}

/**
 * 图片全屏查看器
 */
function view(s) { 
    const v = document.getElementById('image-viewer'); 
    const img = document.getElementById('viewer-img');
    img.src = s; 
    v.style.display = 'flex'; 
}

// 启动程序
init();
