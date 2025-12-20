const GITHUB_USER = "nightola"; 
const GITHUB_REPO = "blog-moments";
const GITHUB_BRANCH = "main";

// 存储从 JSON 获取的数组数据
let globalData = []; 
let currentMode = 'moments'; 
let currentYear = 'all';

// CDN 路径转换函数
const getCDNUrl = url => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${url}`;
};

// 1. 初始化数据
async function init() {
    try {
        const res = await fetch('data.json');
        if (!res.ok) throw new Error('无法读取 data.json，请检查文件是否存在');
        
        const json = await res.json();
        // 关键点：你的 JSON 数据在 moments 字段下
        globalData = json.moments || []; 
        
        renderYearBtns();
        render();
    } catch (error) {
        console.error("初始化失败:", error);
        document.getElementById('contentDisplay').innerHTML = `<div style="text-align:center;padding:20px;">数据加载失败，请检查控制台 (F12) 错误信息。</div>`;
    }
}

// 2. 生成年份筛选按钮
function renderYearBtns() {
    const years = [...new Set(globalData.map(d => d.year))].sort().reverse();
    const container = document.getElementById('yearFilter');
    if (!container) return;
    container.innerHTML = '';

    // 手动创建一个“全部”按钮
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.innerText = '全部';
    allBtn.onclick = (e) => setYear('all', e.target);
    container.appendChild(allBtn);

    // 动态创建年份按钮
    years.forEach(year => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.innerText = year;
        btn.onclick = (e) => setYear(year, e.target);
        container.appendChild(btn);
    });
}

// 3. 筛选逻辑
function setYear(year, btn) {
    currentYear = year;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
}

function setMode(mode) {
    currentMode = mode;
    const navItems = document.querySelectorAll('#modeNav a');
    if (navItems.length) {
        navItems.forEach(a => a.classList.remove('active'));
        const activeNav = document.getElementById('nav-' + mode);
        if (activeNav) activeNav.classList.add('active');
    }
    render();
}

// 4. 核心渲染函数
function render() {
    const display = document.getElementById('contentDisplay');
    if (!display) return;
    display.innerHTML = '';

    // 根据年份过滤
    const filtered = currentYear === 'all' 
        ? globalData 
        : globalData.filter(d => d.year === currentYear);

    // 更新侧边栏统计
    updateSidebar(filtered);

    // 渲染模式切换
    if (currentMode === 'moments') {
        renderMoments(filtered, display);
    } else {
        renderAlbum(filtered, display);
    }
}

// 5. 侧边栏统计与词云
function updateSidebar(data) {
    let words = 0, imgs = 0, music = 0, textAgg = "";
    data.forEach(item => {
        words += (item.text || "").length;
        imgs += (item.imgs ? item.imgs.length : 0);
        if (item.music) music++;
        textAgg += (item.text || "") + " ";
    });
    
    // 安全赋值
    const updateText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };
    
    updateText('s-count', data.length);
    updateText('s-words', words);
    updateText('s-imgs', imgs);
    updateText('s-music', music);

    // 延迟绘制词云以等待 DOM 渲染
    setTimeout(() => drawCloud(textAgg), 200);
}

function drawCloud(text) {
    const container = document.getElementById('wordcloud-container');
    if (!container) return;
    
    const words = text.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, " ").split(/\s+/).filter(w => w.length >= 1);
    
    if (words.length < 5) { // 降低门槛，方便测试
        container.innerHTML = '<div class="no-data-hint">积攒更多动态文字<br>以生成个人词云</div>';
        return;
    }

    container.innerHTML = '<canvas id="wordcloud-canvas"></canvas>';
    const canvas = document.getElementById('wordcloud-canvas');
    canvas.width = container.offsetWidth; 
    canvas.height = 200;

    const freqMap = {};
    words.forEach(w => freqMap[w] = (freqMap[w] || 0) + 1);
    const list = Object.entries(freqMap).sort((a,b) => b[1]-a[1]).slice(0, 30);

    // 检查 WordCloud 库是否存在
    if (typeof WordCloud !== 'undefined') {
        WordCloud(canvas, { 
            list, 
            gridSize: 8, 
            weightFactor: size => Math.pow(size, 1.1) * (canvas.width / 150), 
            color: 'random-dark', 
            backgroundColor: 'transparent', 
            rotateRatio: 0 
        });
    }
}

// 6. 朋友圈模式布局
function renderMoments(data, container) {
    data.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'moment-card';
        
        let mediaHtml = '';
        if (item.video) {
            mediaHtml = `<video class="moment-video" controls src="${getCDNUrl(item.video)}" preload="metadata"></video>`;
        } else if (item.music) {
            const cover = item.music.cover ? getCDNUrl(item.music.cover) : 'https://pic1.imgdb.cn/item/6946acea29a616e528622615.jpg';
            mediaHtml = `
                <a href="${item.music.url}" target="_blank" class="music-share-card">
                    <img src="${cover}" class="music-cover">
                    <div style="min-width:0">
                        <div class="music-title">${item.music.title}</div>
                        <div class="music-artist">${item.music.artist}</div>
                    </div>
                </a>`;
        } else if (item.imgs && item.imgs.length > 0) {
            mediaHtml = `<div class="moment-gallery">` + 
                item.imgs.map(img => `<img src="${getCDNUrl(img)}" onclick="view('${getCDNUrl(img)}')">`).join('') + `</div>`;
        }

        card.innerHTML = `
            <img src="${getCDNUrl('images/avatar.jpg')}" class="item-avatar">
            <div style="flex:1; min-width:0;">
                <div style="color:var(--accent-color); font-weight:bold;">亚离解星</div>
                <div id="t-${idx}" class="moment-text collapsed">${item.text || ''}</div>
                <div id="b-${idx}" class="expand-btn" style="display:none" onclick="toggle(${idx})">全文</div>
                ${mediaHtml}
                <div style="font-size:0.75rem; color:#bbb; margin-top:10px;">${item.date}</div>
            </div>`;
        
        container.appendChild(card);
        
        // 检查是否需要显示“全文”按钮
        const t = document.getElementById(`t-${idx}`);
        if (t && t.scrollHeight > t.offsetHeight) {
            const b = document.getElementById(`b-${idx}`);
            if (b) b.style.display = 'block';
        }
    });
}

// 7. 相册模式布局
function renderAlbum(data, container) {
    const grid = document.createElement('div');
    grid.className = 'album-grid';
    data.forEach(item => {
        if (item.imgs) {
            item.imgs.forEach(img => {
                const el = document.createElement('img');
                el.className = 'album-item'; 
                el.src = getCDNUrl(img);
                el.onclick = () => view(getCDNUrl(img));
                grid.appendChild(el);
            });
        }
    });
    container.appendChild(grid);
}

// 8. 辅助功能：折叠、查看大图
function toggle(i) {
    const t = document.getElementById(`t-${i}`), b = document.getElementById(`b-${i}`);
    if (t && b) {
        const isCol = t.classList.toggle('collapsed');
        b.innerText = isCol ? '全文' : '收起';
    }
}

function view(s) { 
    const v = document.getElementById('image-viewer'); 
    if (v) {
        v.querySelector('img').src = s; 
        v.style.display = 'flex'; 
    }
}

// 启动
init();
