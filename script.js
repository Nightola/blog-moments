/**
 * Nightola-227 FM 终极管理脚本
 * 状态：修复了 UI 错位与数据同步失效问题
 */

const GITHUB_USER = "nightola";
const GITHUB_REPO = "blog-moments";
const GITHUB_BRANCH = "main";

const CONFIG = {
    supabaseUrl: 'https://pbjlcleefihfpeqkinyc.supabase.co',
    supabaseKey: 'sb_publishable_XzmbmXWoZARaKViOoKB95Q_Ut4N7oPr',
    tableName: 'sleep_tracker',
    recordId: 1,
    lastfmUser: 'nightola',
    lastfmKey: '875851062e9caa138b84dcc5554d026e'
};

let rawData = { moments: [], posts: [] };
let currentMode = 'home', currentYear = 'all', searchQuery = '';

let obsState = {
    sbClient: null,
    channel: null,
    intervals: [],
    pokeCount: parseInt(localStorage.getItem('db_pokes') || "0")
};

// --- 初始化进程 ---
async function init() {
    try {
        const res = await fetch('data.json?t=' + Date.now());
        rawData = await res.json();
        renderYearBtns();
        setMode('home'); 
    } catch (e) { console.error("数据加载失败"); }
}

function setMode(mode) {
    currentMode = mode;
    clearObsStation();
    document.querySelectorAll('#modeNav a').forEach(a => a.classList.remove('active'));
    const navItem = document.getElementById('nav-' + mode);
    if(navItem) navItem.classList.add('active');
    
    const yb = document.getElementById('yearFilter');
    if (yb) yb.style.display = (mode === 'moments' || mode === 'album') ? 'flex' : 'none';
    render();
}

function clearObsStation() {
    if (obsState.channel) { obsState.channel.unsubscribe(); obsState.channel = null; }
    obsState.intervals.forEach(clearInterval);
    obsState.intervals = [];
}

function render() {
    const display = document.getElementById('contentDisplay');
    if(!display) return;
    display.innerHTML = '';
    
    const filtered = (rawData.moments || []).filter(item => {
        return (currentYear === 'all' || item.year === currentYear) && 
               (item.text || "").toLowerCase().includes(searchQuery.toLowerCase());
    });

    switch(currentMode) {
        case 'home': 
            renderHome(display); 
            setTimeout(mountObservationStation, 50); 
            break;
        case 'moments': renderMoments(filtered, display); break;
        case 'album': renderAlbum(filtered, display); break;
        case 'posts': renderPostList(rawData.posts || [], display); break;
        case 'qna': renderQnA(display); break;
    }
}

// --- 首页渲染 (观测站) ---
function renderHome(container) {
    container.innerHTML = `
        <section class="db-container">
            <header class="db-header">
                <h3 class="db-title">亚离解星观测站 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg></h3>
                <span class="db-live-tag">LIVE</span>
            </header>
            
            <section class="db-grid">
                <!-- 状态卡片 -->
                <article class="db-card status-box">
                    <span class="db-label">当前状态</span>
                    <span class="status-wrap"><h4 id="status-text" class="status-val">同步中...</h4><span id="poke-bubble" class="db-bubble"></span></span>
                    <div class="status-footer">
                        <span id="status-time" class="db-meta">连接中...</span>
                        <div class="poke-group">
                            <button class="poke-btn" onclick="handlePoke(event)">戳我一下</button>
                        </div>
                    </div>
                </article>

                <!-- 时间卡片 -->
                <article class="db-card time-box">
                    <span class="db-label">本地时间</span>
                    <span class="time-wrap"><span id="local-clock" class="db-clock">00:00</span></span>
                    <div class="db-energy">
                        <div class="energy-bar"><div id="energy-fill" class="energy-in" style="width:0%"></div></div>
                        <span id="energy-value" class="db-meta">--%</span>
                    </div>
                </article>

                <!-- 应用卡片 PC -->
                <article class="db-card app-box full-row">
                    <span class="db-label">正在使用 (PC)</span>
                    <div class="app-content">
                        <svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><path d="M8 21h8M12 17v4"></path></svg>
                        <span id="desktop-app-name" class="app-name">等待同步...</span>
                    </div>
                    <span id="desktop-dot" class="dot-indicator"></span>
                </article>

                <!-- 应用卡片 Mobile -->
                <article class="db-card app-box full-row">
                    <span class="db-label">正在使用 (MB)</span>
                    <div class="app-content">
                        <svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12" y2="18"></line></svg>
                        <span id="mobile-app-name" class="app-name">休息中</span>
                    </div>
                    <span id="mobile-dot" class="dot-indicator"></span>
                </article>

                <!-- 音乐卡片 -->
                <article class="db-card music-box full-row" id="music-card">
                    <span class="db-label">正在聆听</span>
                    <div class="music-body">
                        <img id="music-art" class="music-img" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
                        <div class="music-content">
                            <span id="music-track" class="music-title">加载中...</span>
                            <span id="music-artist" class="music-sub">静音</span>
                        </div>
                    </div>
                </article>

                <!-- 私信互动 -->
                <article class="db-card msg-box full-row">
                    <div class="msg-header">
                        <span class="db-label">私信互动</span>
                        <span id="poke-count" class="db-meta">0 共鸣</span>
                    </div>
                    <form action="https://formspree.io/f/mdkrvbap" method="POST" class="msg-form" id="contact-form">
                        <div class="msg-input-container">
                            <textarea name="message" placeholder="此刻想对我说点什么？" required class="msg-area"></textarea>
                            <div id="reply-wrapper" class="reply-hidden">
                                <input type="text" name="_replyto" id="reply-field" placeholder="如何称呼你或联系你？" class="reply-input">
                            </div>
                        </div>
                        <div class="msg-footer-ctrl">
                            <button type="button" class="opt-text-btn" onclick="toggleReply(this)" id="opt-toggle">+ 联系方式</button>
                            <button type="submit" class="msg-submit-btn" id="submit-btn">发射信号</button>
                        </div>
                    </form>
                </article>
            </section>

            <footer class="db-footer">
                <a href="https://nightola.mataroa.blog/blog/comments/" class="footer-link">评论区 &rarr;</a>
                <span class="footer-note" style="font-size:11px; opacity:0.5;">Synced via Supabase</span>
            </footer>
        </section>
    `;
}

// --- 核心：挂载与数据同步 ---
function mountObservationStation() {
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

    if(!d.statusText) return;
    d.pokeCount.textContent = obsState.pokeCount + " 共鸣";

    const renderData = (row) => {
        if(!row) return;
        d.statusText.textContent = row.status === 'awake' ? '清醒中 ✨' : '睡眠中 💤';
        const ld = new Date(row.updated_at);
        d.statusTime.textContent = '更新于 ' + ld.toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
        
        const isFresh = Math.abs(Date.now() - ld.getTime()) < 86400000;
        const pc = (row.pc_app && row.pc_app !== "离线" && isFresh) ? row.pc_app : "离线";
        d.pcName.textContent = pc; 
        d.pcDot.className = pc !== "离线" ? 'dot-indicator active' : 'dot-indicator';
        
        const mb = row.mobile_app || "在线";
        if (mb === "在线" || (mb !== "休息中" && mb !== "离线" && isFresh)) {
            d.mbName.textContent = mb; d.mbDot.className = 'dot-indicator active';
        } else {
            d.mbName.textContent = "休息中"; d.mbDot.className = 'dot-indicator';
        }
    };

    // Supabase 初始化
    if (!obsState.sbClient && typeof supabase !== 'undefined') {
        obsState.sbClient = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    }
    if (obsState.sbClient) {
        obsState.sbClient.from(CONFIG.tableName).select('*').eq('id', CONFIG.recordId).single().then(({data}) => renderData(data));
        obsState.channel = obsState.sbClient.channel('db_realtime').on('postgres_changes', {event:'UPDATE', schema:'public', table:CONFIG.tableName, filter:`id=eq.${CONFIG.recordId}`}, p => renderData(p.new)).subscribe();
    }

    // Last.fm 音乐同步
    const updateMusic = async () => {
        try {
            const r = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${CONFIG.lastfmUser}&api_key=${CONFIG.lastfmKey}&format=json&limit=1`);
            const dat = await r.json();
            const t = dat.recenttracks.track[0];
            if(t && t['@attr'] && t['@attr'].nowplaying === 'true'){
                d.musicTrack.textContent = t.name; 
                d.musicArtist.textContent = t.artist['#text'];
                d.musicArt.src = t.image[2]?.['#text'] || t.image[1]?.['#text'];
                d.musicCard.style.opacity = "1";
            } else {
                d.musicTrack.textContent = "目前没有在听歌..."; 
                d.musicArtist.textContent = "静音中";
                d.musicArt.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                d.musicCard.style.opacity = "0.7";
            }
        } catch(e) {}
    };

    const tick = () => {
        const n = new Date(); 
        d.clock.textContent = n.toLocaleTimeString('zh-CN', {hour12:false, hour:'2-digit', minute:'2-digit'});
        const s = n.getHours()*3600 + n.getMinutes()*60 + n.getSeconds();
        const eg = Math.floor((s/86400)*100);
        d.energyVal.textContent = eg + '%'; 
        d.energyFill.style.width = eg + '%';
    };

    tick(); updateMusic();
    obsState.intervals.push(setInterval(tick, 1000));
    obsState.intervals.push(setInterval(updateMusic, 20000));
}

// --- 通用交互 ---
window.handlePoke = (e) => {
    e.stopPropagation();
    obsState.pokeCount++;
    localStorage.setItem('db_pokes', obsState.pokeCount);
    const pc = document.getElementById('poke-count');
    if(pc) pc.textContent = obsState.pokeCount + " 共鸣";
    
    const bubble = document.getElementById('poke-bubble');
    if(bubble) {
        const q = ["✨ 捕捉到一颗流星！", "捕捉到信号...", "感觉到心电感应", "(。-ω-) 唔姆"];
        bubble.textContent = q[Math.floor(Math.random()*q.length)];
        bubble.classList.add('show');
        setTimeout(() => bubble.classList.remove('show'), 2000);
    }
};

window.toggleReply = (btn) => {
    const f = document.getElementById('reply-wrapper');
    if(f.classList.contains('reply-hidden')) {
        f.classList.remove('reply-hidden');
        btn.textContent = '－ 联系方式';
    } else {
        f.classList.add('reply-hidden');
        btn.textContent = '+ 联系方式';
    }
};

// --- 其他渲染逻辑 (保持原有逻辑) ---
function renderMoments(data, container) { /* ...数据流渲染... */ }
function renderAlbum(data, container) { /* ...相册渲染... */ }
function renderPostList(posts, container) { /* ...文章渲染... */ }
function renderQnA(container) { /* ...问答渲染... */ }

init();
