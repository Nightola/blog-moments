/**
 * Nightola-227 FM 核心逻辑
 * 状态：完全回退版 (无观测站/无 Supabase)
 */

const GITHUB_USER = "nightola";
const GITHUB_REPO = "blog-moments";
const GITHUB_BRANCH = "main";

let rawData = { moments: [], posts: [] };
let currentMode = 'moments', currentYear = 'all', searchQuery = '';

// 预设 QnA 数据
const qnaData = [
    {q: "为什么要创建博客？", a: "简单打个比方吧，你可以把这个博客当作我在这个网络世界里自定义程度比较高的小房子...", time: "2025-12-13"},
    {q: "Nightola-227 FM 的由来？", a: "Nightola 是 Night 衍生出的自创词。227 是我的生日。", time: "2025-12-13"}
];

// --- 初始化 ---
async function init() {
    try {
        const res = await fetch('data.json?t=' + Date.now());
        rawData = await res.json();
        renderYearBtns();
        setMode('moments'); 
    } catch (e) {
        console.error("数据加载失败:", e);
    }
}

function setMode(mode) {
    currentMode = mode;
    // 切换导航高亮
    document.querySelectorAll('#modeNav a').forEach(a => a.classList.remove('active'));
    const navItem = document.getElementById('nav-' + mode);
    if(navItem) navItem.classList.add('active');
    
    // 只有动态和相册显示年份筛选
    const yb = document.getElementById('yearFilter');
    if (yb) yb.style.display = (mode === 'moments' || mode === 'album') ? 'flex' : 'none';
    
    render();
}

function render() {
    const display = document.getElementById('contentDisplay');
    if(!display) return;
    display.innerHTML = '';
    
    const filtered = (rawData.moments || []).filter(item => {
        const matchYear = (currentYear === 'all' || item.year === currentYear);
        const matchSearch = (item.text || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchYear && matchSearch;
    });

    updateSidebarStats(filtered);

    switch(currentMode) {
        case 'moments': renderMoments(filtered, display); break;
        case 'album': renderAlbum(filtered, display); break;
        case 'posts': renderPostList(rawData.posts || [], display); break;
        case 'qna': renderQnA(display); break;
    }
}

// --- 渲染函数 ---

function renderMoments(data, container) {
    data.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'moment-card';
        
        let mediaHtml = '';
        if (item.imgs) {
            mediaHtml = `<div class="moment-gallery">${item.imgs.map(img => `<img src="${getCDNUrl(img)}" onclick="view('${getCDNUrl(img)}')">`).join('')}</div>`;
        }
        
        card.innerHTML = `
            <div class="item-header">
                <img src="${getCDNUrl('images/avatar.jpg')}" class="item-avatar">
                <div style="font-weight:bold; color:var(--accent-color);">亚离解星</div>
            </div>
            <div id="t-${idx}" class="moment-text collapsed">${item.text}</div>
            <div id="b-${idx}" class="expand-btn" style="display:none" onclick="toggleText(${idx})">全文</div>
            ${mediaHtml}
            <div style="font-size:12px; color:#bbb; margin-top:15px;">${item.date}</div>
        `;
        container.appendChild(card);
        
        const textEl = document.getElementById(`t-${idx}`);
        if (textEl && textEl.scrollHeight > textEl.offsetHeight) {
            document.getElementById(`b-${idx}`).style.display = 'block';
        }
    });
}

function renderAlbum(data, container) {
    const grid = document.createElement('div');
    grid.className = 'album-grid';
    data.forEach(item => {
        if (item.imgs) {
            item.imgs.forEach(img => {
                const imgEl = document.createElement('img');
                imgEl.className = 'album-item';
                imgEl.src = getCDNUrl(img);
                imgEl.onclick = () => view(imgEl.src);
                grid.appendChild(imgEl);
            });
        }
    });
    container.appendChild(grid);
}

function renderPostList(posts, container) {
    const searchVal = searchQuery.toLowerCase();
    posts.filter(p => p.title.toLowerCase().includes(searchVal)).forEach(post => {
        const div = document.createElement('div');
        div.className = 'post-item';
        div.style.cursor = 'pointer';
        div.innerHTML = `
            <div style="font-weight:bold; color:var(--accent-color); font-size:16px;">${post.title}</div>
            <div style="font-size:12px; opacity:0.5; margin-top:5px;">${post.date}</div>
        `;
        div.onclick = () => loadMarkdown(post.file);
        container.appendChild(div);
    });
}

function renderQnA(container) {
    container.innerHTML = `
        <div class="qna-list">
            ${qnaData.map(item => `
                <div class="moment-card">
                    <div style="font-weight:bold; color:var(--accent-color); margin-bottom:10px;">Q: ${item.q}</div>
                    <div style="font-size:14px; line-height:1.6; opacity:0.8;">A: ${item.a}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// --- 辅助功能 ---

const getCDNUrl = url => (!url || url.startsWith('http')) ? url : `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${url}`;

function handleSearch() {
    searchQuery = document.getElementById('searchInput').value;
    render();
}

function updateSidebarStats(data) {
    let words = 0, imgs = 0;
    data.forEach(item => {
        words += (item.text || "").length;
        imgs += (item.imgs ? item.imgs.length : 0);
    });
    const el = {
        count: document.getElementById('s-count'),
        words: document.getElementById('s-words'),
        imgs: document.getElementById('s-imgs')
    };
    if(el.count) el.count.innerText = data.length;
    if(el.words) el.words.innerText = words;
    if(el.imgs) el.imgs.innerText = imgs;
}

function renderYearBtns() {
    const years = [...new Set(rawData.moments.map(d => d.year))].sort().reverse();
    const container = document.getElementById('yearFilter');
    if(!container) return;
    container.innerHTML = `<button class="filter-btn active" onclick="setYear('all', this)">全部</button>`;
    years.forEach(y => {
        container.innerHTML += `<button class="filter-btn" onclick="setYear('${y}', this)">${y}</button>`;
    });
}

function setYear(y, btn) {
    currentYear = y;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
}

function toggleText(idx) {
    const t = document.getElementById(`t-${idx}`);
    const b = document.getElementById(`b-${idx}`);
    const isCollapsed = t.classList.toggle('collapsed');
    b.innerText = isCollapsed ? '全文' : '收起';
}

function view(src) {
    const viewer = document.getElementById('image-viewer');
    viewer.querySelector('img').src = src;
    viewer.style.display = 'flex';
}

async function loadMarkdown(path) {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5;">读取中...</div>';
    try {
        const res = await fetch(`https://${GITHUB_USER}.github.io/${GITHUB_REPO}/${path}`);
        const md = await res.text();
        display.innerHTML = `
            <div class="moment-card markdown-body" style="background:white; padding:30px;">
                ${marked.parse(md)}
                <hr style="margin:20px 0; border:none; border-top:1px solid #eee;">
                <button onclick="setMode('posts')" style="border:none; background:var(--accent-color); color:white; padding:8px 16px; border-radius:8px; cursor:pointer;">← 返回列表</button>
            </div>`;
        window.scrollTo(0, 0);
    } catch (e) {
        display.innerHTML = "文章加载失败，请检查路径。";
    }
}

init();
