const GITHUB_USER = "nightola"; 
const GITHUB_REPO = "blog-moments";
const GITHUB_BRANCH = "main";

let globalData = [], currentMode = 'moments', currentYear = 'all';

const getCDNUrl = url => (!url || url.startsWith('http')) ? url : `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${url}`;

async function init() {
    const res = await fetch('data.json');
    globalData = await res.json();
    renderYearBtns();
    render();
}

function renderYearBtns() {
    const years = [...new Set(globalData.map(d => d.year))].sort().reverse();
    const container = document.getElementById('yearFilter');
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

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('#modeNav a').forEach(a => a.classList.remove('active'));
    document.getElementById('nav-' + mode).classList.add('active');
    render();
}

function render() {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = '';
    const filtered = currentYear === 'all' ? globalData : globalData.filter(d => d.year === currentYear);
    updateSidebar(filtered);
    if (currentMode === 'moments') renderMoments(filtered, display);
    else renderAlbum(filtered, display);
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
    if (words.length < 10) {
        container.innerHTML = '<div class="no-data-hint">积攒更多动态文字<br>以生成个人词云</div>';
        return;
    }
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
        const t = document.getElementById(`t-${idx}`);
        if (t.scrollHeight > t.offsetHeight) document.getElementById(`b-${idx}`).style.display = 'block';
    });
}

function renderAlbum(data, container) {
    const grid = document.createElement('div');
    grid.className = 'album-grid';
    data.forEach(item => {
        if (item.imgs) item.imgs.forEach(img => {
            const el = document.createElement('img');
            el.className = 'album-item'; el.src = getCDNUrl(img);
            el.onclick = () => view(getCDNUrl(img));
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
