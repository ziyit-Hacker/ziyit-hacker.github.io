 






 
function switchSection(sectionId) {
     
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

     
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');

     
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    const menuItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (menuItem) menuItem.classList.add('active');
}

document.addEventListener('DOMContentLoaded', function () {
    // v1.31：任何侧栏菜单点击都视为用户主动选段，标记后异步权限校验不再覆盖（修复在线客服被弹回）
    const sidebarMenu = document.querySelector('.sidebar-menu');
    if (sidebarMenu) {
        sidebarMenu.addEventListener('click', function (e) {
            if (e.target && e.target.closest && e.target.closest('.menu-item[data-section]')) adminSectionLocked = true;
        }, true);
    }

     
    document.querySelector('[data-section="music-management"]').addEventListener('click', function () {
        switchSection('music-management');
        updateSystemInfo('切换到音乐管理');
    });

     
    document.querySelector('[data-section="user-management"]').addEventListener('click', function () {
         
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById('user-management').classList.add('active');

         
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        this.classList.add('active');

         
        loadUsers();
        loadIpBans();
    });

     
    document.getElementById('refresh-users').addEventListener('click', function () {
        loadUsers();
        updateSystemInfo('用户列表已刷新');
    });

     
    document.getElementById('user-search').addEventListener('input', searchUsers);

     
    document.getElementById('export-users').addEventListener('click', exportUsers);

     
    document.querySelector('[data-section="api-key-management"]').addEventListener('click', function () {
        switchSection('api-key-management');
        updateSystemInfo('切换到 API Key 管理');
        loadApiKeys();
    });

     
    document.querySelector('[data-section="pricing-management"]').addEventListener('click', function () {
        switchSection('pricing-management');
        updateSystemInfo('切换到定价管理');
        loadPricing();
    });
    document.getElementById('refresh-pricing').addEventListener('click', function () {
        loadPricing();
        updateSystemInfo('价目表已刷新');
    });
    document.getElementById('save-pricing').addEventListener('click', savePricing);
    document.getElementById('reset-pricing').addEventListener('click', resetPricing);

     
    document.querySelector('[data-section="injection-management"]').addEventListener('click', function () {
        switchSection('injection-management');
        updateSystemInfo('切换到防注入检测');
        loadInjection();
    });
    document.getElementById('refresh-injection').addEventListener('click', function () {
        loadInjection();
        updateSystemInfo('防注入数据已刷新');
    });
    document.getElementById('save-injection-pricing').addEventListener('click', saveInjectionPricing);
    document.getElementById('query-injection-report').addEventListener('click', loadInjectionReport);
    document.getElementById('switch-injection-model').addEventListener('click', switchInjectionModel);
    document.getElementById('inj-model-select').addEventListener('change', syncSwitchModelBtn);

     
    document.querySelector('[data-section="mod-management"]').addEventListener('click', function () {
        switchSection('mod-management');
        updateSystemInfo('切换到 MOD/DLC 管理');
        loadMods();
    });

     
    document.querySelector('[data-section="rc-key-management"]').addEventListener('click', function () {
        switchSection('rc-key-management');
        updateSystemInfo('切换到 RC 软件密钥管理');
        loadRcKeys();
    });

     
    document.getElementById('add-api-key-btn').addEventListener('click', function () {
        document.getElementById('apikey-userid').value = '';
        // v0.3.43：默认允许两种验证方式、默认 phantom（等价于"不做额外限制"）
        document.getElementById('apikey-new-allow-phantom').checked = true;
        document.getElementById('apikey-new-allow-pow').checked = true;
        syncNewHumanModeOptions();
        document.getElementById('apikey-new-human-mode').value = 'phantom';
        document.getElementById('api-key-modal').classList.add('active');
    });
    document.getElementById('refresh-api-keys').addEventListener('click', function () {
        loadApiKeys();
        updateSystemInfo('API Key 列表已刷新');
    });
    document.getElementById('api-key-search').addEventListener('input', renderApiKeys);

     
    document.getElementById('add-mod-btn').addEventListener('click', openAddMod);
    document.getElementById('refresh-mods').addEventListener('click', function () {
        loadMods();
        updateSystemInfo('MOD 列表已刷新');
    });
    document.getElementById('mod-search').addEventListener('input', renderMods);

     
    document.getElementById('refresh-rc-keys').addEventListener('click', function () {
        loadRcKeys();
        updateSystemInfo('密钥列表已刷新');
    });
    document.getElementById('rc-key-search').addEventListener('input', renderRcKeys);

     
    document.querySelector('[data-section="rc-bug-management"]').addEventListener('click', function () {
        switchSection('rc-bug-management');
        updateSystemInfo('切换到 RC BUG 管理');
        loadRcBugs();
    });
    document.getElementById('refresh-rc-bugs').addEventListener('click', function () {
        loadRcBugs();
        updateSystemInfo('RC BUG 列表已刷新');
    });
    document.getElementById('rc-bug-search').addEventListener('input', renderRcBugs);
    document.getElementById('rc-bug-filter').addEventListener('change', renderRcBugs);

     
    document.querySelector('[data-section="rcu-management"]').addEventListener('click', function () {
        switchSection('rcu-management');
        updateSystemInfo('切换到 RCU 更新管理');
        loadRcuPanel();
    });
    document.getElementById('refresh-rcu').addEventListener('click', function () {
        loadRcuPanel();
        updateSystemInfo('RCU 列表已刷新');
    });
    document.getElementById('rcu-search').addEventListener('input', renderRcuUpdates);
    document.getElementById('rcu-publish-btn').addEventListener('click', publishRcuUpdate);
    document.getElementById('rcu-revoke-add-btn').addEventListener('click', addRcuRevoked);

     
    document.querySelector('[data-section="afdian-management"]').addEventListener('click', function () {
        switchSection('afdian-management');
        updateSystemInfo('切换到爱发电订单');
        loadAfdian();
    });
    document.getElementById('refresh-afdian').addEventListener('click', function () {
        loadAfdian();
        updateSystemInfo('爱发电订单已刷新');
    });
    document.getElementById('afdian-search').addEventListener('input', renderAfdianOrders);
    document.getElementById('afdian-filter').addEventListener('change', renderAfdianOrders);
    document.getElementById('afdian-reconcile-btn').addEventListener('click', function () { doAfdianReconcile(true); });
    document.getElementById('afdian-scan-btn').addEventListener('click', function () { doAfdianReconcile(false); });

     
    document.querySelector('[data-section="pentest-management"]').addEventListener('click', function () {
        switchSection('pentest-management');
        updateSystemInfo('切换到渗透测试管理');
        loadPentest();
    });
    document.getElementById('refresh-pentest').addEventListener('click', function () {
        loadPentest();
        updateSystemInfo('渗透测试列表已刷新');
    });
    document.getElementById('pentest-code-search').addEventListener('input', renderPentestCodes);
    document.getElementById('pentest-app-search').addEventListener('input', renderPentestApps);
    document.getElementById('pentest-assign-btn').addEventListener('click', doPentestAssign);
    document.getElementById('pentest-pw-copy').addEventListener('click', copyPentestPassword);
    document.getElementById('pentest-pw-close').addEventListener('click', closePentestPasswordModal);
     
    document.getElementById('pentest-code-list').addEventListener('click', onPentestCodeClick);
    document.getElementById('pentest-app-list').addEventListener('click', onPentestAppClick);

     
    document.querySelector('[data-section="admin-management"]').addEventListener('click', function () {
        switchSection('admin-management');
        updateSystemInfo('切换到管理员管理');
        loadAdmins();
    });

     
    document.querySelector('[data-section="backrooms-members"]').addEventListener('click', function () {
        switchSection('backrooms-members');
        updateSystemInfo('切换到后室成员管理');
        loadBackroomsMembers();
    });

     
    document.querySelector('[data-section="guide-console"]').addEventListener('click', function () {
        switchSection('guide-console');
        updateSystemInfo('切换到在线客服');
        guideStartPolling();
        loadGuideInjection();
    });
    document.getElementById('guide-inj-refresh').addEventListener('click', loadGuideInjection);
    document.getElementById('guide-inj-range').addEventListener('change', loadGuideInjection);

     
    document.getElementById('add-admin-btn').addEventListener('click', openAddAdminModal);
    document.getElementById('refresh-admins').addEventListener('click', function () {
        loadAdmins();
        updateSystemInfo('管理员列表已刷新');
    });
    document.getElementById('admin-search').addEventListener('input', renderAdmins);
    document.getElementById('cancel-admin-add').addEventListener('click', closeAdminAddModal);
    document.getElementById('confirm-admin-add').addEventListener('click', confirmAddAdmin);
    document.getElementById('cancel-admin-edit').addEventListener('click', closeAdminEditModal);
    document.getElementById('confirm-admin-edit').addEventListener('click', confirmEditAdmin);

     
    document.getElementById('refresh-backrooms-members').addEventListener('click', function () {
        loadBackroomsMembers();
        updateSystemInfo('成员列表已刷新');
    });
    document.getElementById('backrooms-member-search').addEventListener('input', renderBackroomsMembers);

     
    document.getElementById('cancel-promote-user').addEventListener('click', closePromoteModal);
    document.getElementById('confirm-promote-user').addEventListener('click', confirmPromoteUser);
    document.getElementById('promote-type').addEventListener('change', syncPromoteFields);
});

 
 
function loadingHTML() {
    var rows = '';
    for (var i = 0; i < 5; i++) {
        rows += '<div class="skeleton-row">' +
            '<div class="sk-block sk-avatar"></div>' +
            '<div class="sk-details"><div class="sk-block sk-line"></div><div class="sk-block sk-line"></div></div>' +
            '<div class="sk-block sk-line" style="width:70%"></div>' +
            '<div class="sk-block sk-line" style="width:60%"></div>' +
            '<div class="sk-block sk-line" style="width:60%"></div>' +
            '<div class="sk-block sk-btn"></div>' +
            '</div>';
    }
    return '<div class="skeleton-loading">' +
        '<div class="ziyit-loader" style="margin: 6px 0 12px;">' +
        '<div class="loader-bar"><div class="loader-fill"></div></div>' +
        '</div>' +
        '<div class="skeleton-list">' + rows + '</div>' +
        '</div>';
}

 
 
let currentAdminLevel = 0;
let currentAdminInfo = null;

// v1.31：头像与邮箱验证门相关状态
const DEFAULT_AVATAR = '../assets/ziyit.png';
let adminSectionLocked = false;   // 用户已主动选择分节（点击/直达），异步校验不得再覆盖
const adminAvatarCache = {};      // userId -> avatarUrl（'' 表示已确认无头像）
const adminAvatarPending = {};    // userId -> true（正在拉取）

 
function adminLevelName(level) {
    level = Number(level);
    if (level === 4) return '超级管理员';
    if (level === 3) return '高级管理员';
    if (level === 2) return '中级管理员';
    if (level === 1) return '初级管理员';
    return '非管理员';
}

 
function applyMenuByLevel() {
    const level = currentAdminLevel || 0;
    document.querySelectorAll('.sidebar-menu .menu-item[data-level]').forEach(function (item) {
        const need = Number(item.getAttribute('data-level')) || 1;
        item.style.display = level >= need ? '' : 'none';
    });
}

 
function canAccess(needLevel) {
    return (currentAdminLevel || 0) >= needLevel;
}

 
 
let authRedirecting = false;
function leaveAdminPage(message) {
    if (authRedirecting) return;
    authRedirecting = true;
    alert(message);
    window.location.href = '../user/';
}

function checkUserPermission() {
    const authToken = ZIYIT_API.getToken();

    if (!authToken) {
        leaveAdminPage('请先登录以访问管理员页面');
        return;
    }

     
    window.ZIYIT_ON_UNAUTHORIZED = function () {
        leaveAdminPage('登录已过期，请重新登录');
    };

    ZIYIT_API.adminMe().then(function (me) {
        if (!me) {
            leaveAdminPage('您没有权限访问管理员页面');
            return;
        }
        const level = Number(me.level != null ? me.level : 0);
        if (!level) {
            leaveAdminPage('您没有权限访问管理员页面');
            return;
        }
        currentAdminLevel = level;
        currentAdminInfo = me;

         
        const userRole = document.getElementById('user-role');
        if (userRole) {
            userRole.textContent = adminLevelName(level) + '（Lv.' + level + '）';
        }
        const userNameEl = document.querySelector('.user-info .user-name');
        if (userNameEl && me.username) userNameEl.textContent = me.username;

        // v1.31：顶栏展示当前登录管理员的真实头像
        loadHeaderAvatar(me.userId);

        applyMenuByLevel();
         
        chatLoadHistory();
        const bcastBtn = document.getElementById('broadcast-btn');
        if (bcastBtn) bcastBtn.style.display = canAccess(2) ? '' : 'none';
        if (!chatPollTimer) {
            chatPollTimer = setInterval(pollChatInbox, 5000);
            setTimeout(pollChatInbox, 300);
        }

        // v1.31：仅当用户尚未主动选择分节时，才做兜底切段；且优先尊重 URL hash（如 #guide-console）。
        // 修正：此前该异步回调无条件切到首个可见菜单，会把用户点击的「在线客服」覆盖回用户管理。
        if (!adminSectionLocked) {
            const hashSec = String(location.hash || '').replace('#', '');
            let target = '';
            if (hashSec && document.getElementById(hashSec)) target = hashSec;
            if (!target) {
                const firstVisible = document.querySelector('.sidebar-menu .menu-item[data-level]:not([style*="display: none"])');
                if (firstVisible) target = firstVisible.getAttribute('data-section') || '';
            }
            if (target) switchSection(target);
        }

        // v1.31：管理员邮箱验证强制门
        enforceAdminEmailVerification();
    }).catch(function (err) {
        console.error('权限校验失败:', err);
        if (err && err.status === 401) {
            leaveAdminPage('登录已过期，请重新登录');
        } else {
            leaveAdminPage('您没有权限访问管理员页面');
        }
    });
}

// ===== v1.31：头像与邮箱验证辅助 =====

// 顶栏「当前登录管理员」头像
function loadHeaderAvatar(uid) {
    const img = document.getElementById('header-avatar-img');
    if (!img || uid == null || uid === '') return;
    ZIYIT_API.request('/users/' + encodeURIComponent(uid)).then(function (u) {
        if (u && u.avatarUrl) {
            ZIYIT_API.applyImage(img, u.avatarUrl, DEFAULT_AVATAR).catch(function () { });
        }
    }).catch(function () { });
}

// 管理员列表头像：优先用已加载的全量用户列表 / 缓存，未知的按 userId 逐个补拉
function adminAvatarOf(uid) {
    const key = String(uid);
    if (Object.prototype.hasOwnProperty.call(adminAvatarCache, key)) return adminAvatarCache[key];
    const list = Array.isArray(userList) ? userList : [];
    for (let i = 0; i < list.length; i++) {
        if (String(list[i].userId) === key) {
            adminAvatarCache[key] = list[i].avatarUrl || '';
            return adminAvatarCache[key];
        }
    }
    return '';
}

function hydrateAdminAvatars(list) {
    const tasks = [];
    (Array.isArray(list) ? list : []).forEach(function (a) {
        const f = adminFields(a);
        const key = String(f.userId);
        if (key === '-' || Object.prototype.hasOwnProperty.call(adminAvatarCache, key) || adminAvatarPending[key]) return;
        adminAvatarPending[key] = true;
        tasks.push(
            ZIYIT_API.request('/users/' + encodeURIComponent(key)).then(function (u) {
                adminAvatarCache[key] = (u && u.avatarUrl) || '';
            }).catch(function () {
                adminAvatarCache[key] = '';
            }).then(function () { delete adminAvatarPending[key]; })
        );
    });
    if (!tasks.length) return Promise.resolve();
    return Promise.all(tasks).then(function () { renderAdmins(); });
}

// 邮箱验证强制门：/admin/me 不返回 emailVerified，需另查 /auth/me
function enforceAdminEmailVerification() {
    return ZIYIT_API.me().then(function (u) {
        if (u && u.emailVerified) {
            hideEmailGate();
            return true;
        }
        showEmailGate(u || {});
        return false;
    }).catch(function (err) {
        // 401 会由全局未授权处理跳登录；其余情况（网络抖动等）不误伤
        if (!(err && err.status === 401)) hideEmailGate();
        return true;
    });
}

function showEmailGate(u) {
    const gate = document.getElementById('email-verify-gate');
    if (!gate) return;
    const status = document.getElementById('email-gate-status');
    const sendBtn = document.getElementById('email-gate-send');
    const email = u && u.email ? String(u.email) : '';
    if (status) {
        status.innerHTML = email
            ? ('当前邮箱：<b>' + escAdmin(email) + '</b><br>状态：<span style="color:var(--danger-color,#e74c3c);">未验证</span>')
            : '当前账号未绑定邮箱，请先前往个人资料页绑定邮箱后再验证。';
    }
    if (sendBtn) {
        sendBtn.style.display = email ? '' : 'none';
        sendBtn.disabled = false;
        sendBtn.textContent = '发送验证邮件';
    }
    gate.classList.add('active');
}

function hideEmailGate() {
    const gate = document.getElementById('email-verify-gate');
    if (gate) gate.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', function () {
    const sendBtn = document.getElementById('email-gate-send');
    if (sendBtn) sendBtn.addEventListener('click', function () {
        sendBtn.disabled = true;
        sendBtn.textContent = '发送中…';
        ZIYIT_API.sendVerifyEmail().then(function () {
            showToast('验证邮件已发送，请查收邮箱', 'success');
            sendBtn.textContent = '已发送（60s 后可重发）';
            setTimeout(function () { sendBtn.disabled = false; sendBtn.textContent = '重新发送验证邮件'; }, 60000);
        }).catch(function (err) {
            sendBtn.disabled = false;
            sendBtn.textContent = '发送失败，请重试';
            showToast((err && err.data && err.data.detail) || '发送失败，请稍后再试', 'error');
        });
    });
    const recheck = document.getElementById('email-gate-recheck');
    if (recheck) recheck.addEventListener('click', function () {
        recheck.disabled = true;
        enforceAdminEmailVerification().then(function (ok) {
            recheck.disabled = false;
            showToast(ok ? '邮箱已验证，已解锁管理功能' : '邮箱仍未验证', ok ? 'success' : 'error');
        });
    });
    const profileBtn = document.getElementById('email-gate-profile');
    if (profileBtn) profileBtn.addEventListener('click', function () {
        window.location.href = '../user/profile.html';
    });
});






let currentMusicIndex = -1;
let musicList = [];
let isPlaying = false;

const audioPlayer = document.getElementById('audio-player');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const currentSong = document.getElementById('current-song');
const playerStatus = document.getElementById('player-status');
const progress = document.getElementById('progress');
const musicListElement = document.getElementById('music-list');
const currentTimeElement = document.getElementById('current-time');
const totalTimeElement = document.getElementById('total-time');
const lyricsContent = document.getElementById('lyrics-content');
const lyricsInfo = document.getElementById('lyrics-info');
const totalSongs = document.getElementById('total-songs');
const playingSong = document.getElementById('playing-song');

 
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) {
        return '00:00';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

 
function updateTimeDisplay() {
    currentTimeElement.textContent = formatTime(audioPlayer.currentTime);
    totalTimeElement.textContent = formatTime(audioPlayer.duration);
}

 
async function loadLyrics(lyricsPath) {
    if (lyricsPath === '[NO DATA]') {
        lyricsContent.innerHTML = '暂无歌词数据';
        lyricsInfo.textContent = '无歌词';
        return;
    }

    try {
        const normalizedPath = lyricsPath.replace(/\\/g, '/');
        const response = await fetch(normalizedPath);
        if (!response.ok) {
            throw new Error('歌词文件不存在');
        }
        const lyricsText = await response.text();

         
        lyricsContent.innerHTML = lyricsText;
        lyricsInfo.textContent = '已加载';

         
        updateSystemInfo('歌词加载成功');
    } catch (error) {
        console.error('加载歌词失败:', error);
        lyricsContent.innerHTML = '暂无歌词数据';
        lyricsInfo.textContent = '加载失败';
        updateSystemInfo('暂无歌词数据');
    }
}

 
function renderMusicList() {
    musicListElement.innerHTML = '';
    musicList.forEach((music, index) => {
        const [name, location, lyricsPath] = music.split(' \\ ');
        const item = document.createElement('div');
        item.className = 'music-item';
        if (index === currentMusicIndex) {
            item.classList.add('playing');
        }

        item.innerHTML = `
                    <div class="music-info">
                        <div class="music-name">${name}</div>
                        <div class="music-details">${location.split('/').pop()}</div>
                    </div>
                `;

        item.addEventListener('click', () => playMusic(index));
        musicListElement.appendChild(item);
    });

     
    totalSongs.textContent = musicList.length;
}

 
function playMusic(index) {
    if (index < 0 || index >= musicList.length) return;

    const [name, location, lyricsPath] = musicList[index].split(' \\ ');
    audioPlayer.src = location;
    currentMusicIndex = index;
    currentSong.textContent = name;
    playingSong.textContent = name;

     
    document.querySelectorAll('.music-item').forEach((item, i) => {
        item.classList.toggle('playing', i === index);
    });

     
    currentTimeElement.textContent = '00:00';
    totalTimeElement.textContent = '00:00';

     
    loadLyrics(lyricsPath);

    audioPlayer.play();
    isPlaying = true;
    playBtn.textContent = '||';
    playerStatus.textContent = '播放中';

    updateSystemInfo(`正在播放: ${name}`);
}

 
fetch('music.txt')
    .then(response => response.text())
    .then(data => {
        musicList = data.split('\n').filter(line => line.trim() !== '');
        renderMusicList();
        updateSystemInfo('音乐列表加载完成');
    })
    .catch(error => {
        console.error('加载音乐列表失败:', error);
        updateSystemInfo('音乐列表加载失败');
    });

 
playBtn.addEventListener('click', () => {
    if (currentMusicIndex === -1 && musicList.length > 0) {
        playMusic(0);
        return;
    }

    if (isPlaying) {
        audioPlayer.pause();
        playBtn.textContent = '▶';
        playerStatus.textContent = '暂停中';
    } else {
        audioPlayer.play();
        playBtn.textContent = '||';
        playerStatus.textContent = '播放中';
    }
    isPlaying = !isPlaying;
});

 
prevBtn.addEventListener('click', () => {
    if (musicList.length === 0) return;
    let newIndex = currentMusicIndex - 1;
    if (newIndex < 0) newIndex = musicList.length - 1;
    playMusic(newIndex);
});

 
nextBtn.addEventListener('click', () => {
    if (musicList.length === 0) return;
    let newIndex = currentMusicIndex + 1;
    if (newIndex >= musicList.length) newIndex = 0;
    playMusic(newIndex);
});

 
audioPlayer.addEventListener('timeupdate', () => {
    const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progress.style.width = progressPercent + '%';
    updateTimeDisplay();
});

 
document.querySelector('.progress-bar').addEventListener('click', (e) => {
    const rect = e.target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const duration = audioPlayer.duration;

    if (duration) {
        audioPlayer.currentTime = (clickX / width) * duration;
    }
});

 
audioPlayer.addEventListener('loadedmetadata', () => {
    updateTimeDisplay();
});

 
document.getElementById('search-button').addEventListener('click', function (e) {
    e.preventDefault();
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const musicItems = document.querySelectorAll('.music-item');

    musicItems.forEach(item => {
        const musicName = item.querySelector('.music-name').textContent.toLowerCase();
        item.style.display = musicName.includes(searchInput) ? 'flex' : 'none';
    });

    updateSystemInfo(`搜索: ${searchInput}`);
});

 
 
setInterval(loadServerStats, 5000);

 
document.addEventListener('DOMContentLoaded', () => {
    checkUserPermission();
    loadServerStats();
    updateSystemInfo('系统初始化完成');
});






 
let lrcConversionActive = false;
let currentLyricsLines = [];
let currentLrcIndex = 0;
let lrcContent = '';
let timeUpdateInterval = null;  

 
function updateCurrentTimeDisplay() {
    if (!lrcConversionActive) return;
    
    const currentTime = audioPlayer.currentTime;
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const milliseconds = Math.floor((currentTime % 1) * 100);
    
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    const timeDisplay = document.getElementById('current-time-display');
    if (timeDisplay) {
        timeDisplay.textContent = timeString;
    }
}

 
document.getElementById('start-lrc-conversion').addEventListener('click', function () {
     
    const lyricsContent = document.getElementById('lyrics-content');
    if (!lyricsContent || lyricsContent.innerHTML.trim() === '') {
        alert('请先选择一首歌曲并加载歌词');
        return;
    }

     
     
    const lyricsText = lyricsContent.innerHTML;

     
    const normalizedText = lyricsText
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<div[^>]*>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/\r\n/g, '\n')   
        .replace(/\r/g, '\n')     
        .replace(/\n+/g, '\n')   
        .replace(/<[^>]*>/g, '')  
        .trim();

     
    console.log('原始歌词内容:', lyricsText);
    console.log('处理后的歌词内容:', normalizedText);

     
    const allLyricsLines = normalizedText.split('\n').filter(line => line.trim() !== '');

     
    console.log('分割后的歌词行数:', allLyricsLines.length);
    console.log('分割后的歌词行:', allLyricsLines);

    if (allLyricsLines.length === 0) {
        alert('没有可转换的歌词内容');
        return;
    }

     
    const lrcTimeRegex = /\[\d{1,2}[:：]\d{1,2}(?:\.\d{1,2})?\].*/;
    const linesToProcess = allLyricsLines.filter(line => {
        const trimmedLine = line.trim();
        return !lrcTimeRegex.test(trimmedLine);
    });

     
    console.log('总歌词行数:', allLyricsLines.length);
    console.log('需要处理的行数:', linesToProcess.length);
    console.log('被过滤的行:', allLyricsLines.filter(line => lrcTimeRegex.test(line.trim())));

    if (linesToProcess.length === 0) {
        alert('所有歌词行都已经包含时间戳，无需转换');
        return;
    }

    lrcConversionActive = true;
    currentLrcIndex = 0;
    lrcContent = '';
     
    window.allLyricsLines = allLyricsLines;  
    currentLyricsLines = linesToProcess;  

     
    document.getElementById('lrc-conversion-panel').style.display = 'block';
    document.getElementById('current-line-index').textContent = '0';
    document.getElementById('total-lines').textContent = currentLyricsLines.length;
    document.getElementById('lrc-preview-content').value = '';
    document.getElementById('lrc-status').textContent = '转换进行中';
    document.getElementById('start-lrc-conversion').disabled = true;
    document.getElementById('download-lrc').disabled = true;

     
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
    }
    timeUpdateInterval = setInterval(updateCurrentTimeDisplay, 100);  

    updateSystemInfo(`开始LRC歌词转换，需要处理${currentLyricsLines.length}行歌词`);
});

 
document.getElementById('next-line-btn').addEventListener('click', function () {
    if (!lrcConversionActive || currentLrcIndex >= currentLyricsLines.length) return;

     
    const currentTime = audioPlayer.currentTime;
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const milliseconds = Math.floor((currentTime % 1) * 100);

    const timeString = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}]`;
    const currentLine = currentLyricsLines[currentLrcIndex];

     
    lrcContent += timeString + currentLine + '\n';
    document.getElementById('lrc-preview-content').value = lrcContent;

     
    currentLrcIndex++;
    document.getElementById('current-line-index').textContent = currentLrcIndex;

     
    if (currentLrcIndex >= currentLyricsLines.length) {
        lrcConversionActive = false;
        document.getElementById('lrc-status').textContent = '转换完成';
        document.getElementById('download-lrc').disabled = false;
        
         
        if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
            timeUpdateInterval = null;
        }
        
        updateSystemInfo('LRC歌词转换完成');
    } else {
        updateSystemInfo(`已转换第${currentLrcIndex}行歌词，时间: ${timeString}`);
    }
});

 
document.getElementById('reset-lrc-btn').addEventListener('click', function () {
    lrcConversionActive = false;
    currentLyricsLines = [];
    currentLrcIndex = 0;
    lrcContent = '';
    window.allLyricsLines = null;

    document.getElementById('lrc-conversion-panel').style.display = 'none';
    document.getElementById('lrc-preview-content').value = '';
    document.getElementById('current-time-display').textContent = '00:00.00';
    document.getElementById('current-line-index').textContent = '0';
    document.getElementById('lrc-status').textContent = '准备就绪';
    document.getElementById('start-lrc-conversion').disabled = false;
    document.getElementById('download-lrc').disabled = true;

     
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
    }

    updateSystemInfo('LRC转换已重置');
});

 
document.getElementById('download-lrc').addEventListener('click', function () {
    if (lrcContent.trim() === '') {
        alert('没有可下载的LRC内容');
        return;
    }

     
     
    const finalLrcContent = lrcContent.split('\n')
        .filter(line => line.trim() !== '')
        .join('\n');

    const currentSongName = document.getElementById('current-song').textContent;
    const fileName = currentSongName + '.lrc';

     
    const blob = new Blob([finalLrcContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    updateSystemInfo(`已下载LRC文件: ${fileName}`);
});

 
async function loadLyrics(lyricsPath) {
     
    window.currentLyricsPath = lyricsPath;

    if (lyricsPath === '[NO DATA]') {
         
        lyricsContent.innerHTML = '';
        lyricsContent.classList.add('editable');
        lyricsContent.contentEditable = true;
        lyricsInfo.textContent = '无歌词 - 可编辑';

         
        setTimeout(() => {
            startEditLyrics();
        }, 100);
        return;
    }

    try {
        const normalizedPath = lyricsPath.replace(/\\/g, '/');
        const response = await fetch(normalizedPath);
        if (!response.ok) {
            throw new Error('歌词文件不存在');
        }
        const lyricsText = await response.text();

         
        lyricsContent.innerHTML = lyricsText;
        lyricsContent.classList.remove('editable');
        lyricsContent.contentEditable = false;
        lyricsInfo.textContent = '已加载';

         
        updateSystemInfo('歌词加载成功');
    } catch (error) {
        console.error('加载歌词失败:', error);
         
        lyricsContent.innerHTML = '';
        lyricsContent.classList.add('editable');
        lyricsContent.contentEditable = true;
        lyricsInfo.textContent = '加载失败 - 可编辑';

         
        setTimeout(() => {
            startEditLyrics();
        }, 100);
        updateSystemInfo('歌词文件不存在，可编辑添加歌词');
    }
}

 
let isEditingLyrics = false;
let originalLyricsContent = '';

 
function startEditLyrics() {
    if (isEditingLyrics) return;

    isEditingLyrics = true;
    originalLyricsContent = lyricsContent.innerHTML;

     
    lyricsContent.classList.add('editable');
    lyricsContent.contentEditable = true;
    lyricsContent.focus();

     
    document.getElementById('lyrics-controls').style.display = 'flex';
    document.getElementById('edit-lyrics-btn').style.display = 'none';
    document.getElementById('save-lyrics-btn').style.display = 'inline-block';

    lyricsInfo.textContent = '编辑模式';
    updateSystemInfo('进入歌词编辑模式');
}

 
function cancelEditLyrics() {
    if (!isEditingLyrics) return;

    isEditingLyrics = false;

     
    lyricsContent.innerHTML = originalLyricsContent;
    lyricsContent.classList.remove('editable');
    lyricsContent.contentEditable = false;

     
    document.getElementById('lyrics-controls').style.display = 'none';
    document.getElementById('edit-lyrics-btn').style.display = 'inline-block';
    document.getElementById('save-lyrics-btn').style.display = 'none';

    lyricsInfo.textContent = '已取消编辑';
    updateSystemInfo('取消歌词编辑');
}

 
async function saveLyrics() {
    if (!isEditingLyrics) return;

    const newLyricsContent = lyricsContent.innerHTML.trim();

     
    if (!newLyricsContent) {
        alert('请输入歌词内容');
        return;
    }

    try {
         
        if (window.currentLyricsPath === '[NO DATA]') {
            const songName = document.getElementById('current-song').textContent;
            const fileName = prompt('请输入歌词文件名（不含扩展名）:', songName);

            if (!fileName) {
                alert('文件名不能为空');
                return;
            }

             
            const newLyricsPath = `Lyrics/${fileName}.txt`;

             
             
            alert(`歌词已保存到: ${newLyricsPath}`);

             
            lyricsInfo.textContent = '已保存';
            updateSystemInfo(`歌词已保存: ${newLyricsPath}`);
        } else {
             
            alert(`歌词本地已更新到: ${window.currentLyricsPath}`);
            lyricsInfo.textContent = '已更新';
            updateSystemInfo(`歌词已本地更新: ${window.currentLyricsPath}`);
        }

         
        isEditingLyrics = false;
        lyricsContent.classList.remove('editable');
        lyricsContent.contentEditable = false;

         
        document.getElementById('lyrics-controls').style.display = 'none';
        document.getElementById('edit-lyrics-btn').style.display = 'inline-block';
        document.getElementById('save-lyrics-btn').style.display = 'none';

    } catch (error) {
        console.error('保存歌词失败:', error);
        alert('保存歌词失败: ' + error.message);
        updateSystemInfo('保存歌词失败');
    }
}

 
document.getElementById('edit-lyrics-btn').addEventListener('click', startEditLyrics);
document.getElementById('cancel-edit-btn').addEventListener('click', cancelEditLyrics);
document.getElementById('confirm-save-btn').addEventListener('click', saveLyrics);
document.getElementById('save-lyrics-btn').addEventListener('click', saveLyrics);

 
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isEditingLyrics) {
        cancelEditLyrics();
    }
});






let userList = [];

function loadUsers() {
    if (!canAccess(4)) { alert('仅 4 级超级管理员可访问用户管理'); return; }
    const userListEl = document.getElementById('user-list');
    if (userListEl) userListEl.innerHTML = loadingHTML();
    return ZIYIT_API.request('/admin/users').then(function (data) {
        userList = Array.isArray(data) ? data : (data.users || data.data || []);
        renderUserList();
        updateUserStats();
        updateSystemInfo('用户数据加载成功 (' + userList.length + ' 人)');
        return userList;
    }).catch(function (err) {
        console.error('加载用户数据失败:', err);
        userList = [];
        renderUserList();
        updateUserStats();
        updateSystemInfo('用户数据加载失败');
    });
}

function parseDate(v) {
    if (!v) return null;
    if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v);
    return new Date(v);
}

function formatDateTime(d) {
    if (!d || isNaN(d.getTime())) return '-';
    const p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function isBanned(user) {
    if (!user) return false;
    var s = user.status;
    if (typeof s === 'string') return s !== 'ok' && s !== 'active';
    if (s && typeof s === 'object') {
        if (s.active && s.active !== 'ok') return true;
        if (s.banned) return true;
        if (s.lockedUntil) return true;
    }
    return user.banned === true || user.is_banned === true;
}

function pendingDeletion(user) {
    if (!user) return null;
    var d = parseDate(user.deletionScheduledAt || user.deletionDate || user.scheduledDeletionAt);
    if (!d || isNaN(d.getTime())) return null;
    return d;
}

function roleLabel(user) {
    var role = String(user.role || user.user_type || user.type || '').toLowerCase();
    if (role === 'zc' || role === 'vip' || role === 'admin') return 'VIP用户';
    if (role === 'ztg' || role === 'isztg') return 'ZTG用户';
    return '普通用户';
}

function banUser(userId, username) {
    var reason = prompt('请输入封禁 ' + username + ' 的原因（可留空）:');
    if (reason === null) return;
    var minsInput = prompt('请输入封禁时长（分钟），留空为永久封禁:');
    if (minsInput === null) return;
    var durationMinutes = minsInput.trim() ? Math.max(1, parseInt(minsInput.trim(), 10) || 0) : 0;
    var durTip = durationMinutes > 0 ? ('时长：' + durationMinutes + ' 分钟') : '永久封禁';
    if (!confirm('确定封禁 ' + username + ' 吗？' + (reason ? '（原因：' + reason + '）' : '') + '（' + durTip + '）')) return;
    var body = { reason: reason || null };
    if (durationMinutes > 0) body.durationMinutes = durationMinutes;
    ZIYIT_API.request('/admin/users/' + userId + '/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then(function () {
        alert(username + ' 已被封禁（' + durTip + '）');
        loadUsers();
    }).catch(function (err) {
        alert('封禁失败: ' + (err.message || err));
    });
}

function unbanUser(userId, username) {
    if (!confirm('确定要解封 ' + username + ' 吗？')) return;
    ZIYIT_API.request('/admin/users/' + userId + '/unban', { method: 'POST' }).then(function () {
        alert(username + ' 已解封');
        loadUsers();
    }).catch(function (err) {
        alert('解封失败: ' + (err.message || err));
    });
}

function renderUserList(list) {
    const items = Array.isArray(list) ? list : userList;
    const userListElement = document.getElementById('user-list');
    userListElement.innerHTML = '';

    if (!items.length) {
        userListElement.innerHTML = '<p style="padding: 20px; color: var(--ziyit-text-secondary);">暂无匹配的用户</p>';
        return;
    }

    for (let i = 0; i < items.length; i++) {
        const user = items[i];
        const banned = isBanned(user);
        const pendingDel = pendingDeletion(user);
        const username = user.username || '-';
        const userId = user.userId;

        const item = document.createElement('div');
        item.className = 'user-item';

        const avatar = document.createElement('img');
        avatar.className = 'user-avatar-small';
        avatar.alt = username + ' 的头像';
        avatar.src = DEFAULT_AVATAR;
        // v1.31：从用户资料读取头像，加载失败回退默认头像
        if (user.avatarUrl) ZIYIT_API.applyImage(avatar, user.avatarUrl, DEFAULT_AVATAR).catch(function () { });
        avatar.addEventListener('error', function () {
            if (avatar.getAttribute('src') !== DEFAULT_AVATAR) avatar.src = DEFAULT_AVATAR;
        });

        const details = document.createElement('div');
        details.className = 'user-details';
        const typeCls = banned ? 'banned' : (pendingDel ? 'pending' : 'normal');
        details.innerHTML = `<div class="user-name">${username}</div><div class="user-type ${typeCls}">${roleLabel(user)}</div>` +
            (pendingDel ? `<div class="user-del-date">删除于 ${formatDateTime(pendingDel)}</div>` : '');

        const statusId = document.createElement('div');
        statusId.className = 'user-status';
        statusId.textContent = 'ID: ' + userId;

        const statusBan = document.createElement('div');
        statusBan.className = 'user-status ' + (banned ? 'blacklisted' : (pendingDel ? 'pending' : 'safe'));
         
        const banUntil = banned && parseDate(user.bannedUntil || user.banned_until || user.banExpiresAt || user.expiresAt || user.expires_at);
        statusBan.textContent = banned
            ? ('已封禁' + (banUntil && !isNaN(banUntil.getTime()) ? ' ·至 ' + formatDateTime(banUntil) : ''))
            : (pendingDel ? '注销中' : '正常');

        const actions = document.createElement('div');
        actions.className = 'user-actions';
         
        const isSuper = String(userId) === '1' || user.userId === 1;
        const mkBtn = function (cls, text, fn, disable) {
            const b = document.createElement('button');
            b.className = cls;
            b.textContent = text;
            if (disable) { b.disabled = true; b.title = '超级管理员不可操作'; }
            else b.addEventListener('click', fn);
            return b;
        };
        actions.appendChild(mkBtn('action-btn edit', '记录', function () { showLoginHistory(user); }, isSuper));
        actions.appendChild(mkBtn('action-btn edit', 'DLC', function () { showDlcManager(user); }, isSuper));
        actions.appendChild(mkBtn('action-btn edit', '编辑', function () { openEditModal(user); }, isSuper));
         
        if (canAccess(4) && !isSuper) {
            actions.appendChild(mkBtn('action-btn edit', '升级', function () { openPromoteModal(user); }, false));
        }
        actions.appendChild(mkBtn(banned ? 'action-btn edit' : 'action-btn delete', banned ? '解封' : '封禁', function () {
            if (banned) unbanUser(userId, username);
            else banUser(userId, username);
        }, isSuper));
        actions.appendChild(mkBtn('action-btn delete', '删除', function () { deleteUser(userId, username); }, isSuper));

        item.appendChild(avatar);
        item.appendChild(details);
        item.appendChild(statusId);
        item.appendChild(statusBan);
        item.appendChild(actions);
        userListElement.appendChild(item);
    }
}

function isOnline(user) {
    if (!user) return false;
    if (user.online === true || user.is_online === true) return true;
    var t = null;
    if (Array.isArray(user.loginHistory) && user.loginHistory.length) {
        t = user.loginHistory[user.loginHistory.length - 1].time;
    } else {
        t = user.lastLoginTime || user.last_login;
    }
    if (!t) return false;
    var d = parseDate(t);
    if (!d || isNaN(d.getTime())) return false;
    return (Date.now() - d.getTime()) < 10 * 60 * 1000;
}

function setOnlineCount(n) {
    document.getElementById('online-user-count').textContent = n;
    const onlineHeader = document.getElementById('online-users');
    if (onlineHeader) onlineHeader.textContent = n;
}

function loadOnlineStats() {
    ZIYIT_API.request('/stats/online', { method: 'GET' }).then(function (data) {
        const v = data && data.onlineUsers !== undefined ? data.onlineUsers : (data && data.online);
        setOnlineCount(typeof v === 'number' ? v : 0);
    }).catch(function () {
        setOnlineCount(userList.filter(isOnline).length);
    });
}

function updateUserStats() {
    document.getElementById('total-users').textContent = userList.length;
    document.getElementById('vip-users').textContent = userList.filter(function (u) {
        var r = String(u.role || u.user_type || u.type || '').toLowerCase();
        return r === 'zc' || r === 'vip' || r === 'admin';
    }).length;
    document.getElementById('normal-users').textContent = userList.filter(function (u) {
        var r = String(u.role || u.user_type || u.type || '').toLowerCase();
        return r === 'ur' || r === '';
    }).length;
    loadOnlineStats();
    const blacklistElement = document.getElementById('blacklist-users');
    if (blacklistElement) {
        blacklistElement.textContent = userList.filter(isBanned).length;
    }
}

 
let ipBans = [];

function formatBanTime(t) {
    if (!t) return '-';
    let d;
    if (typeof t === 'number') d = new Date(t < 1e12 ? t * 1000 : t);
    else d = new Date(t);
    if (isNaN(d.getTime())) return String(t);
    const p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function loadIpBans() {
    if (!canAccess(4)) { alert('仅 4 级超级管理员可管理 IP 封禁'); return; }
    const area = document.getElementById('ip-ban-list');
    if (area) area.innerHTML = loadingHTML();
    ZIYIT_API.adminListIpBans().then(function (data) {
        ipBans = Array.isArray(data) ? data
            : (data && (data.bans || data.list || data.ip_bans || data.banned_ips || data.bannedIps || data.items || data.records || data.result || data.data)) || [];
        if (!Array.isArray(ipBans)) ipBans = [];
        renderIpBans();
    }).catch(function (err) {
        const area = document.getElementById('ip-ban-list');
        if (area) area.innerHTML = '<p style="padding: 20px; color: var(--ziyit-danger);">加载封禁列表失败: ' + ((err && err.data && err.data.detail) || (err && err.message) || '网络错误') + '</p>';
    });
}

function renderIpBans() {
    const area = document.getElementById('ip-ban-list');
    const countEl = document.getElementById('ip-ban-count');
    if (countEl) countEl.textContent = ipBans.length;
    if (!area) return;
    if (!ipBans.length) {
        area.innerHTML = '<p style="padding: 20px; color: var(--ziyit-text-secondary);">暂无封禁的 IP</p>';
        return;
    }
    const cols = 'grid-template-columns: 1.4fr 1fr 1.4fr 1.2fr 0.8fr;';
    let html = '<div class="user-item" style="' + cols + 'font-weight: 700; background: var(--ziyit-bg-hover);">'
        + '<div class="user-name">IP</div>'
        + '<div class="user-name">封禁者</div>'
        + '<div class="user-name">原因</div>'
        + '<div class="user-name">封禁时间</div>'
        + '<div class="user-name">操作</div>'
        + '</div>';
    ipBans.forEach(function (b) {
        const ip = b.ip || b.ip_address || b.ipAddress || '-';
        const by = b.banned_by || b.bannedBy || b.addedBy || b.banner || b.admin || b.by || b.operator || '-';
        const reason = b.reason || '-';
        const time = formatBanTime(b.banned_at || b.bannedAt || b.addedAt || b.time || b.created_at || b.createdAt);
         
        const exp = b.bannedUntil || b.banned_until || b.expiresAt || b.expireAt || b.expires_at || b.unbanAt;
        const expTip = exp ? '<br><span style="color:var(--ziyit-text-secondary);font-size:12px;">到期 ' + formatBanTime(exp) + '</span>' : '';
        html += '<div class="user-item" style="' + cols + '">'
            + '<div class="user-name">' + ip + '</div>'
            + '<div class="user-name">' + by + '</div>'
            + '<div class="user-name">' + reason + '</div>'
            + '<div class="user-name">' + time + expTip + '</div>'
            + '<div class="user-name"><button class="user-btn danger" data-unban-ip="' + ip + '">解封</button></div>'
            + '</div>';
    });
    area.innerHTML = html;
    area.querySelectorAll('[data-unban-ip]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const ip = btn.getAttribute('data-unban-ip');
            if (!confirm('确定解封 IP ' + ip + ' 吗？')) return;
            ZIYIT_API.adminUnbanIp(ip).then(function () {
                alert('已解封 ' + ip);
                loadIpBans();
            }).catch(function (err) {
                alert((err && err.data && err.data.detail) || '解封失败');
            });
        });
    });
}

 
function userSearchText(user) {
    const uid = user.userId != null ? user.userId
        : (user.id != null ? user.id : (user.user_id != null ? user.user_id : ''));
    const ips = (Array.isArray(user.loginHistory) ? user.loginHistory : [])
        .map(function (h) { return h.ip || h.ipAddress || h.ip_address || ''; })
        .join(' ');
    return [user.username, user.email, 'ID:' + uid, uid, roleLabel(user),
        isBanned(user) ? '已封禁' : (pendingDeletion(user) ? '注销中' : '正常'), ips]
        .join(' ');
}

function searchUsers() {
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    let list = userList;
    if (searchTerm) {
        list = userList.filter(function (u) {
            return userSearchText(u).toLowerCase().indexOf(searchTerm) !== -1;
        });
    }
    renderUserList(list);
    updateSystemInfo(`搜索用户: ${searchTerm || '(全部)'}`);
}

function exportUsers() {
    const data = JSON.stringify(userList, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.json';
    a.click();
    URL.revokeObjectURL(url);
    updateSystemInfo('用户数据导出成功');
}

let editingUser = null;

function openEditModal(user) {
    editingUser = user;
    document.getElementById('modal-title').textContent = '编辑用户 ID:' + (user.userId ?? '-');
    document.getElementById('edit-username').value = user.username || '';
    document.getElementById('edit-email').value = user.email && user.email !== '[NO DATA]' ? user.email : '';
    document.getElementById('edit-role').value = (String(user.role || '').toUpperCase() === 'ZC') ? 'ZC' : 'UR';
    document.getElementById('edit-password').value = '';
    // v1.31：详情弹窗展示用户头像（失败回退默认头像）
    const avatarEl = document.getElementById('edit-avatar');
    if (avatarEl) {
        avatarEl.alt = (user.username || '用户') + ' 的头像';
        avatarEl.src = DEFAULT_AVATAR;
        if (user.avatarUrl) ZIYIT_API.applyImage(avatarEl, user.avatarUrl, DEFAULT_AVATAR).catch(function () { });
    }
    document.getElementById('user-modal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('user-modal').classList.remove('active');
    editingUser = null;
}

function saveEditUser(e) {
    e.preventDefault();
    if (!editingUser) return;

    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');

    const userId = editingUser.userId;
    const username = document.getElementById('edit-username').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const role = document.getElementById('edit-role').value;
    const newPassword = document.getElementById('edit-password').value;

    if (!username) {
        alert('用户名不能为空');
        return;
    }

    const body = {
        username: username,
        email: email || null,
        role: role
    };

    if (newPassword) {
        if (typeof CryptoJS !== 'undefined') {
            body.md5Password = CryptoJS.MD5(newPassword).toString(CryptoJS.enc.Base64);
        } else {
            body.md5Password = newPassword;
        }
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-inline"></span>保存中...';
    }
    ZIYIT_API.request('/admin/users/' + userId + '/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then(function () {
        alert('用户信息已更新');
        closeEditModal();
        loadUsers();
    }).catch(function (err) {
        alert('保存失败: ' + (err.message || err));
    }).finally(function () {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '保存';
        }
    });
}

let deletingUser = null;

function deleteUser(userId, username) {
    deletingUser = { userId: userId, username: username };
    document.getElementById('del-username').textContent = username;
    document.getElementById('del-userid').textContent = userId;
    const graceRadio = document.querySelector('input[name="delMode"][value="grace"]');
    if (graceRadio) graceRadio.checked = true;
    document.getElementById('delete-user-modal').classList.add('active');
}

function closeDeleteUserModal() {
    document.getElementById('delete-user-modal').classList.remove('active');
    deletingUser = null;
}

 
function showLoginHistory(user) {
    document.getElementById('lh-user-label').textContent = (user.username || '-') + '（ID: ' + (user.userId ?? '-') + '）的登录记录';
    const area = document.getElementById('login-history-list');
    const list = Array.isArray(user.loginHistory) ? user.loginHistory : [];
    if (!list.length) {
        area.innerHTML = '<p style="color: var(--ziyit-text-secondary); padding: 12px 0;">暂无登录记录</p>';
        document.getElementById('login-history-modal').classList.add('active');
        return;
    }
     
    const items = list.map(function (rec, index) {
        return {
            index: index,
            time: formatDateTime(parseDate(rec.time || rec.loginTime || rec.timestamp)),
            ip: rec.ip || rec.ipAddress || '-'
        };
    }).reverse();
    let html = '';
    items.forEach(function (it) {
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--ziyit-border-light);gap:10px;flex-wrap:wrap;">'
            + '<div style="min-width:0;"><div><b>' + it.time + '</b></div><div style="color:var(--ziyit-text-secondary);word-break:break-all;">IP: ' + it.ip + ' <span class="lh-loc" data-loc-ip="' + it.ip + '">查询中...</span></div></div>'
            + '</div>';
    });
    area.innerHTML = html;
    document.getElementById('login-history-modal').classList.add('active');

     
    area.querySelectorAll('[data-loc-ip]').forEach(function (span) {
        const ip = span.getAttribute('data-loc-ip');
        if (!ip || ip === '-') {
            span.textContent = '';
            return;
        }
        ZIYIT_API.getIpLocation(user.userId, ip).then(function (d) {
            const loc = ZIYIT_API.formatIpLocation(d);
            span.textContent = '(' + loc + ')';
        }).catch(function () {
            span.textContent = '(未知)';
        });
    });
}

function closeLoginHistory() {
    document.getElementById('login-history-modal').classList.remove('active');
}

 
let dlcManagerUser = null;

function showDlcManager(user) {
    dlcManagerUser = user;
    const uname = (user && user.username) || '-';
    const uid = user && user.userId != null ? user.userId : '-';
    document.getElementById('dlc-user-label').textContent = uname + '（ID: ' + uid + '）的 DLC';
    document.getElementById('dlc-list').innerHTML = loadingHTML();
    document.getElementById('dlc-modal').classList.add('active');
    fillDlcSelect();
    loadUserDlc(user);
}

function fillDlcSelect() {
    const sel = document.getElementById('dlc-grant-select');
    sel.innerHTML = '<option value="">请选择要授予的 DLC...</option>';
    ZIYIT_API.getDlc().then(function (data) {
        let list = (data && (data.dlc || data.mods || data.items || data.list || data.data)) || [];
        if (!Array.isArray(list)) list = [];
        list.forEach(function (m) {
            const id = m.modId != null ? m.modId : (m.id != null ? m.id : m.mod_id);
            if (id == null) return;
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = (m.modName || m.name || 'DLC ' + id) + '（ID: ' + id + '）';
            sel.appendChild(opt);
        });
    }).catch(function () {
        sel.innerHTML = '<option value="">DLC 列表加载失败</option>';
    });
}

function loadUserDlc(user) {
    const area = document.getElementById('dlc-list');
    ZIYIT_API.adminGetUserDlc(user.userId).then(function (data) {
        let list = Array.isArray(data) ? data : (data && (data.mods || data.dlc || data.items || data.list || data.result || data.data)) || [];
        if (!Array.isArray(list)) list = [];
        if (!list.length) {
            area.innerHTML = '<p style="color: var(--ziyit-text-secondary); padding: 12px 0;">该用户暂无 DLC</p>';
            return;
        }
        let html = '';
        list.forEach(function (d) {
            const id = d.modId != null ? d.modId : (d.id != null ? d.id : d.mod_id);
            const name = d.modName || d.name || d.mod_name || ('MOD ' + (id == null ? '' : id));
            const isDlc = d.isDLC === true || d.isDlc === true || d.is_dlc === true || d.isDLC === 1 || d.is_dlc === 1 || d.isDLC === 'true';
            const purchased = formatDateTime(parseDate(d.purchasedAt || d.purchased_at || d.purchaseTime || d.purchase_time));
            let expireTxt = '永久';
            const expire = d.expireAt || d.expire_at || d.expiresAt || d.expires_at;
            if (expire) {
                const t = parseDate(expire);
                expireTxt = t ? formatDateTime(t) : String(expire);
            }
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--ziyit-border-light);gap:10px;flex-wrap:wrap;">'
                + '<div style="min-width:0;">'
                + '<div><b>' + escAdmin(name) + '</b> <span style="color:#7c3aed;font-size:0.75rem;">' + (isDlc ? 'DLC' : 'MOD') + '</span></div>'
                + '<div style="color:var(--ziyit-text-secondary);font-size:0.8rem;">ID: ' + escAdmin(String(id == null ? '-' : id)) + ' | 获得于: ' + purchased + ' | 到期: ' + expireTxt + '</div>'
                + '</div>'
                + '<button class="action-btn delete" data-revoke-id="' + id + '">撤销</button>'
                + '</div>';
        });
        area.innerHTML = html;
        area.querySelectorAll('[data-revoke-id]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                revokeDlc(user, btn.getAttribute('data-revoke-id'));
            });
        });
    }).catch(function (err) {
        area.innerHTML = '<p style="color: var(--ziyit-danger); padding: 12px 0;">加载失败：' + escAdmin(err.message || '请求错误') + '</p>';
    });
}

function grantDlc() {
    if (!dlcManagerUser) return;
    const sel = document.getElementById('dlc-grant-select');
    const modId = parseInt(sel.value, 10);
    if (!modId || isNaN(modId)) {
        alert('请先选择要授予的 DLC');
        return;
    }
    ZIYIT_API.adminGrantDlc(dlcManagerUser.userId, modId).then(function () {
        alert('已授予 DLC');
        loadUserDlc(dlcManagerUser);
    }).catch(function (err) {
        alert('授予失败：' + (err.message || '请求错误'));
    });
}

function revokeDlc(user, modId) {
    if (!confirm('确定撤销该用户 ID:' + modId + ' 的 DLC 吗？')) return;
    ZIYIT_API.adminRevokeDlc(user.userId, modId).then(function () {
        alert('已撤销 DLC');
        loadUserDlc(user);
    }).catch(function (err) {
        alert('撤销失败：' + (err.message || '请求错误'));
    });
}

function closeDlcManager() {
    document.getElementById('dlc-modal').classList.remove('active');
    dlcManagerUser = null;
}

 
function escAdmin(str) {
    return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

 
function fmtPoints(n) {
    const v = parseFloat(n);
    if (!isFinite(v)) return String(n == null ? '' : n);
    return String(Math.round(v * 100) / 100);
}

 
const HUMAN_MODE_LABELS = {
    phantom: 'phantom（视觉拖拽）',
    pow: 'pow（工作量证明）',
    both: 'both（两套都过）'
};

function normalizeHumanMode(v) {
    const s = String(v == null ? '' : v).trim().toLowerCase();
    return (s === 'pow' || s === 'both') ? s : 'phantom';
}

function allowedModesOf(k) {
    const raw = k ? (k.allowed_modes != null ? k.allowed_modes : k.allowedModes) : null;
    if (Array.isArray(raw)) {
        const out = raw.map(function (m) { return String(m).trim().toLowerCase(); })
            .filter(function (m) { return m === 'phantom' || m === 'pow'; });
        if (out.length) return out;
    }
    // 旧密钥没有该字段：按 human_mode 推断（both → 两者都允许）
    const hm = normalizeHumanMode(k && (k.human_mode != null ? k.human_mode : k.humanMode));
    return hm === 'both' ? ['phantom', 'pow'] : [hm];
}

function syncHumanModeOptionsFor(prefix) {
    const allowP = document.getElementById(prefix + '-allow-phantom').checked;
    const allowW = document.getElementById(prefix + '-allow-pow').checked;
    const sel = document.getElementById(prefix + '-human-mode');
    const prev = sel.value;
    const opts = [];
    if (allowP) opts.push('phantom');
    if (allowW) opts.push('pow');
    if (allowP && allowW) opts.push('both');
    sel.innerHTML = opts.map(function (m) {
        return '<option value="' + m + '">' + HUMAN_MODE_LABELS[m] + '</option>';
    }).join('');
    sel.value = opts.indexOf(prev) !== -1 ? prev : (opts[0] || '');
}

function syncHumanModeOptions() { syncHumanModeOptionsFor('apikey-edit'); }
function syncNewHumanModeOptions() { syncHumanModeOptionsFor('apikey-new'); }

// 读取并校验「允许的验证项目（≥1）+ 默认验证方式（必须落在允许项内）」
function readModeFields(prefix) {
    const allowed = [];
    if (document.getElementById(prefix + '-allow-phantom').checked) allowed.push('phantom');
    if (document.getElementById(prefix + '-allow-pow').checked) allowed.push('pow');
    if (!allowed.length) return { error: '「允许的验证项目」至少要选一个' };
    const humanMode = document.getElementById(prefix + '-human-mode').value;
    if (humanMode === 'both' ? allowed.length !== 2 : allowed.indexOf(humanMode) === -1) {
        return { error: '「默认验证方式」必须从已允许的验证项目里选' };
    }
    return { allowed: allowed, humanMode: humanMode };
}

 
let apiKeyList = [];
let editingApiKey = null;
let editingApiKeyOwner = null;    // 正在编辑的密钥所属用户 ID（用于改「账户点数」）
let editingApiKeyPoints = 0;      // 打开弹窗时该用户的账户点数（用于判断是否变更）

function apiKeyFields(k) {
    if (!k) return {};
    return {
        key: k.api_key || k.apiKey || k.key || k.keyHash || k.apiKeyHash || '-',
        userId: k.userId != null ? k.userId : (k.user_id != null ? k.user_id : '-'),
        username: k.username || k.userName || '',
        status: k.status || 'active',
        origins: Array.isArray(k.allowed_origins) ? k.allowed_origins.slice() : (Array.isArray(k.allowedOrigins) ? k.allowedOrigins.slice() : []),
        created: k.created_at || k.createdAt || k.createTime || k.created || '',
        // v0.3.38：月/日「次数额度」与预警已彻底废弃，只用点数口径展示。
        points: k.points != null ? k.points : (k.pointsBalance != null ? k.pointsBalance : 0),
        minRequired: k.minRequired != null ? k.minRequired : (k.min_required != null ? k.min_required : 0),
        dailyPointsLimit: k.daily_points_limit != null ? k.daily_points_limit : (k.dailyPointsLimit != null ? k.dailyPointsLimit : -1),
        dailyPointsUsed: k.daily_points_used != null ? k.daily_points_used : (k.dailyPointsUsed != null ? k.dailyPointsUsed : 0),
        // v0.3.39：密钥上的「点数上限」已取消，点数一律以「账户点数」（该用户余额）为准
        pointsUsed: k.points_used != null ? k.points_used : (k.pointsUsed != null ? k.pointsUsed : 0),
        // v0.3.39：允许的验证项目（多选，至少一个）与默认验证方式（单选）
        allowedModes: allowedModesOf(k),
        humanMode: normalizeHumanMode(k.human_mode != null ? k.human_mode : k.humanMode)
    };
}

function loadApiKeys() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可访问 API Key 管理'); return; }
    document.getElementById('api-key-list').innerHTML = loadingHTML();;
    return ZIYIT_API.request('/admin/api-keys').then(function (data) {
        apiKeyList = Array.isArray(data) ? data : (data.api_keys || data.keys || data.data || data.items || []);
        renderApiKeys();
    }).catch(function (err) {
        document.getElementById('api-key-list').innerHTML = '<p style="padding: 20px; color: var(--ziyit-danger);">加载失败: ' + escAdmin(err.message || err) + '</p>';
    });
}

function renderApiKeys() {
    const search = (document.getElementById('api-key-search').value || '').trim().toLowerCase();
    const area = document.getElementById('api-key-list');
    const list = apiKeyList.filter(function (k) {
        if (!search) return true;
        const f = apiKeyFields(k);
        return String(f.key).toLowerCase().indexOf(search) !== -1 ||
            String(f.username).toLowerCase().indexOf(search) !== -1 ||
            String(f.userId).toLowerCase().indexOf(search) !== -1;
    });
    if (!list.length) {
        area.innerHTML = '<p style="padding: 20px; color: var(--ziyit-text-secondary);">暂无 API Key 数据</p>';
        return;
    }
    let html = '';
    list.forEach(function (k) {
        const f = apiKeyFields(k);
        const idx = apiKeyList.indexOf(k);
        const statusCls = String(f.status).toLowerCase() === 'active' ? 'normal' : 'banned';
        html += '<div class="user-item wide-item"><div class="user-details">'
            + '<div class="user-name">' + escAdmin(f.username ? f.username + '（ID: ' + f.userId + '）' : '用户ID: ' + f.userId) + '</div>'
            + '<div class="user-email" style="font-family: monospace;">' + escAdmin(f.key) + '</div>'
            + '<div class="user-status ' + statusCls + '">' + escAdmin(f.status) + '</div>'
            + '<div class="user-del-date">账户点数: ' + escAdmin(fmtPoints(f.points)) + ' 点'
            + '（每 ' + escAdmin(fmtPoints(f.minRequired)) + ' 点起可验证）'
            + ' ｜ 本密钥累计消耗: ' + escAdmin(fmtPoints(f.pointsUsed)) + ' 点'
            + '<br>今日最大消耗点数: ' + (f.dailyPointsLimit === -1 || f.dailyPointsLimit === '-1' ? '不限' : escAdmin(fmtPoints(f.dailyPointsLimit)) + ' 点')
            + ' ｜ 今日已消耗: ' + escAdmin(fmtPoints(f.dailyPointsUsed)) + ' 点'
            + '<br>验证: 允许 ' + escAdmin(f.allowedModes.join(' / ')) + '，默认 ' + escAdmin(f.humanMode)
            + (f.created ? '<br>创建: ' + escAdmin(String(f.created).slice(0, 10)) : '')
            + ' ｜ 白名单: ' + (f.origins.length ? (f.origins.length + ' 条来源') : '不限来源')
            + '</div>'
            + '</div><div class="user-actions">'
            + '<button class="action-btn edit" data-act="edit" data-idx="' + idx + '">编辑</button>'
            + '<button class="action-btn danger" data-act="del" data-idx="' + idx + '">删除</button>'
            + '</div></div>';
    });
    area.innerHTML = html;
    area.querySelectorAll('[data-act]').forEach(function (btn) {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const k = apiKeyList[idx];
        if (!k) return;
        btn.addEventListener('click', function () {
            if (btn.getAttribute('data-act') === 'edit') openEditApiKey(apiKeyFields(k).key);
            else deleteApiKey(apiKeyFields(k).key);
        });
    });
}

function createApiKey() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可创建 API Key'); return; }
    const userId = parseInt(document.getElementById('apikey-userid').value, 10);
    if (!userId) {
        alert('请输入用户ID');
        return;
    }
    // v0.3.43：建密钥时一并设置验证方式
    const modeFields = readModeFields('apikey-new');
    if (modeFields.error) {
        alert(modeFields.error);
        return;
    }
    const btn = document.getElementById('confirm-api-key');
    btn.disabled = true;
     
    ZIYIT_API.request('/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: userId,
            allowed_modes: modeFields.allowed,
            human_mode: modeFields.humanMode
        })
    }).then(function (data) {
        alert('创建成功' + (data && data.api_key ? '：' + data.api_key : ''));
        document.getElementById('api-key-modal').classList.remove('active');
        loadApiKeys();
        btn.disabled = false;
    }).catch(function (err) {
        btn.disabled = false;
        alert('创建失败: ' + ((err && err.data && err.data.detail) || (err && err.message) || err));
    });
}

function openEditApiKey(key) {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可编辑 API Key'); return; }
    editingApiKey = key;
    document.getElementById('apikey-edit-key').value = key;
    let cur = null;
    apiKeyList.forEach(function (k) {
        const f = apiKeyFields(k);
        if (f.key === key) cur = f;
    });
    document.getElementById('apikey-edit-status').value = cur && String(cur.status).toLowerCase() === 'disabled' ? 'disabled' : 'active';
    // v0.3.39：「账户点数」= 该用户名下的点数余额（直接读改余额，不再是密钥上限）
    editingApiKeyOwner = cur ? cur.userId : null;
    editingApiKeyPoints = cur ? parseFloat(cur.points) : 0;
    if (!isFinite(editingApiKeyPoints)) editingApiKeyPoints = 0;
    document.getElementById('apikey-edit-points').value = cur ? fmtPoints(cur.points) : '0';

     
    const dailyUnlimited = !cur || cur.dailyPointsLimit === -1 || cur.dailyPointsLimit === '-1' || cur.dailyPointsLimit == null;
    document.getElementById('apikey-edit-daily-unlimited').checked = dailyUnlimited;
    document.getElementById('apikey-edit-daily').value = dailyUnlimited ? '' : cur.dailyPointsLimit;
    setEditDailyDisabled();

    // v0.3.39：允许的验证项目（多选，至少一个）+ 默认验证方式（单选，只能是允许项）
    const modes = cur ? cur.allowedModes : ['phantom'];
    document.getElementById('apikey-edit-allow-phantom').checked = modes.indexOf('phantom') !== -1;
    document.getElementById('apikey-edit-allow-pow').checked = modes.indexOf('pow') !== -1;
    syncHumanModeOptions();
    const hm = cur ? cur.humanMode : 'phantom';
    const hmSel = document.getElementById('apikey-edit-human-mode');
    if (Array.prototype.some.call(hmSel.options, function (o) { return o.value === hm; })) hmSel.value = hm;

     
    document.getElementById('apikey-edit-origins').value = cur ? cur.origins.join('\n') : '';

    document.getElementById('api-key-edit-modal').classList.add('active');
}

function setEditDailyDisabled() {
    const un = document.getElementById('apikey-edit-daily-unlimited').checked;
    const input = document.getElementById('apikey-edit-daily');
    input.disabled = un;
    if (un) input.value = '';
}

function saveApiKeyEdit() {
    if (!editingApiKey) return;
    const status = document.getElementById('apikey-edit-status').value;
    // v0.3.39：账户点数 = 该用户名下的点数余额（保存即把余额设为该值，不是密钥上限）
    const userPoints = parseFloat(document.getElementById('apikey-edit-points').value);
    if (isNaN(userPoints) || userPoints < 0) {
        alert('请输入有效的账户点数（≥0）');
        return;
    }
     
    let dailyPoints = -1;
    if (!document.getElementById('apikey-edit-daily-unlimited').checked) {
        dailyPoints = parseFloat(document.getElementById('apikey-edit-daily').value);
        if (isNaN(dailyPoints) || dailyPoints < 0) {
            alert('请输入有效的今日最大消耗点数（≥0），或勾选「今日不限」');
            return;
        }
    }
     
    const origins = document.getElementById('apikey-edit-origins').value
        .split('\n')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s; });

    // v0.3.43：允许的验证项目（多选，至少一个）+ 默认验证方式（单选，必须落在允许项内）
    const modeFields = readModeFields('apikey-edit');
    if (modeFields.error) {
        alert(modeFields.error);
        return;
    }

    const jobs = [];
    jobs.push(ZIYIT_API.request('/admin/api-keys/' + encodeURIComponent(editingApiKey), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: status,
            daily_points_limit: dailyPoints,
            allowed_origins: origins,
            allowed_modes: modeFields.allowed,
            human_mode: modeFields.humanMode
        })
    }));
    // 账户点数有变动才调「改用户点数」接口（PUT /admin/users/{userId}/points）
    if (editingApiKeyOwner != null && Math.abs(userPoints - editingApiKeyPoints) > 1e-9) {
        jobs.push(ZIYIT_API.request('/admin/users/' + encodeURIComponent(editingApiKeyOwner) + '/points', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points: userPoints })
        }));
    }
    Promise.all(jobs).then(function () {
        alert('API Key 已更新');
        document.getElementById('api-key-edit-modal').classList.remove('active');
        loadApiKeys();
    }).catch(function (err) {
        alert('更新失败: ' + ((err && err.data && err.data.detail) || (err && err.message) || err));
    });
}

function deleteApiKey(key) {
    if (!confirm('确定删除 API Key ' + key + ' 吗？')) return;
    ZIYIT_API.request('/admin/api-keys/' + encodeURIComponent(key), { method: 'DELETE' }).then(function () {
        alert('API Key 已删除');
        loadApiKeys();
    }).catch(function (err) {
        alert('删除失败: ' + (err.message || err));
    });
}

 
// ------------------------------------------------------------
// 定价管理（v0.3.39）
//   GET  /admin/pricing        → 读价目表（含 endpointLabels / verifyPlan）
//   PUT  /admin/pricing        → 保存，**必须整份回传**（缺项会落回默认值）
//   POST /admin/pricing/reset  → 恢复默认
// 所有单价一律来自后端返回值，前端不硬编码任何价格。
// ------------------------------------------------------------
let pricingCache = null;

function pricingModeName(m) {
    return m === 'per_request' ? '按请求计费' : '按单次验证';
}

function pricingNum(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
}

function pricingField(id, label, val) {
    return '<div><label class="form-label">' + escAdmin(label) + '</label>' +
        '<input type="number" class="form-input" id="' + id + '" step="0.01" min="0" value="' +
        escAdmin(val != null ? val : '') + '"></div>';
}

function loadPricing() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可访问定价管理'); return; }
    const panel = document.getElementById('pricing-panel');
    panel.innerHTML = loadingHTML();
    return ZIYIT_API.request('/admin/pricing').then(function (cfg) {
        renderPricingForm(cfg);
    }).catch(function (err) {
        panel.innerHTML = '<p style="padding:20px;color:var(--ziyit-danger);">加载失败: ' +
            escAdmin((err && err.data && err.data.detail) || (err && err.message) || err) + '</p>';
    });
}

function renderPricingForm(cfg) {
    pricingCache = cfg || {};
    const pv = pricingCache.per_verification || {};
    const pr = pricingCache.per_request || {};
    const eps = pr.endpoints || {};
    const vr = pr.verify || {};
    const vrCplx = vr.complexity || {};
    const vip = pricingCache.vip || {};
    const labels = pricingCache.endpointLabels || {};
    const vlabels = pricingCache.verifyEndpointLabels || {};
    const isPV = pricingCache.mode !== 'per_request';
    const activeTag = ' <span style="font-size:12px;font-weight:400;color:var(--ziyit-success);">（当前生效）</span>';

    // 逐端点行：端点清单与中文名都取自后端 endpointLabels，不写死价格
    let rows = '';
    const paths = Object.keys(labels).length ? Object.keys(labels) : Object.keys(eps);
    paths.forEach(function (path) {
        const item = eps[path] || {};
        rows += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap;">' +
            '<label style="display:inline-flex;align-items:center;gap:6px;min-width:220px;">' +
            '<input type="checkbox" class="pr-charge" data-path="' + escAdmin(path) + '"' + (item.charge ? ' checked' : '') + '> ' +
            escAdmin(labels[path] || path) +
            ' <span style="color:var(--ziyit-text-secondary);font-size:12px;">' + escAdmin(path) + '</span></label>' +
            '<input type="number" class="form-input pr-price" data-path="' + escAdmin(path) + '" step="0.01" min="0" style="max-width:160px;" value="' +
            escAdmin(item.price != null ? item.price : '') + '">' +
            '<span style="color:var(--ziyit-text-secondary);font-size:13px;">点 / 次</span></div>';
    });

    function radio(mode, label) {
        return '<label style="display:block;margin-bottom:6px;"><input type="radio" name="pricing-mode" value="' + mode + '"' +
            (pricingCache.mode === mode ? ' checked' : '') + '> ' + label + '</label>';
    }
    function opt(value, label, cur) {
        return '<option value="' + value + '"' + (cur === value ? ' selected' : '') + '>' + label + '</option>';
    }

    document.getElementById('pricing-panel').innerHTML =
        '<div class="form-group"><label class="form-label">收费模式</label>' +
        radio('per_verification', '按单次验证（一次验证只收一档固定价）') +
        radio('per_request', '按请求（逐个请求计费）') + '</div>' +

        '<div style="border:1px solid var(--border-color);border-radius:8px;padding:16px;margin-bottom:16px;">' +
        '<h3 style="margin:0 0 12px;color:var(--primary-color);">按单次验证 · 三档价（点）' + (isPV ? activeTag : '') + '</h3>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">' +
        pricingField('pv-phantom', '纯 Phantom', pv.phantom) +
        pricingField('pv-pow', '纯 PoW', pv.pow) +
        pricingField('pv-both', 'Phantom + PoW', pv.both) + '</div></div>' +

        '<div style="border:1px solid var(--border-color);border-radius:8px;padding:16px;margin-bottom:16px;">' +
        '<h3 style="margin:0 0 12px;color:var(--primary-color);">按请求' + (isPV ? '' : activeTag) + '</h3>' +
        '<div class="form-group"><label style="display:inline-flex;align-items:center;gap:6px;">' +
        '<input type="checkbox" id="pr-all"' + (pr.all_requests ? ' checked' : '') + '> 所有请求统一价（含验证类请求；启用后下方逐端点与验证段不参与）</label></div>' +
        '<div style="max-width:220px;"><label class="form-label">统一单价（点 / 次）</label>' +
        '<input type="number" class="form-input" id="pr-all-price" step="0.01" min="0" value="' + escAdmin(pr.all_price != null ? pr.all_price : '') + '"></div>' +
        '<h4 style="margin:16px 0 10px;">逐端点（勾选 = 收费）</h4>' +
        (rows || '<p style="color:var(--ziyit-text-secondary);">后端未返回端点清单</p>') +
        '<h4 style="margin:16px 0 10px;">验证类请求（' + escAdmin(vlabels['/verify'] || '/verify') + ' / ' +
        escAdmin(vlabels['/pow/verify'] || '/pow/verify') + '）</h4>' +
        '<div class="form-group" style="max-width:260px;"><label class="form-label">计费方式</label>' +
        '<select class="form-input" id="pr-verify-mode">' +
        opt('complexity', '按复杂度分档（增量补差）', vr.mode) +
        opt('flat', '固定一个价', vr.mode) + '</select></div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">' +
        pricingField('pr-verify-flat', '固定价（点）', vr.flat) +
        pricingField('vc-phantom', '分档 · 纯 Phantom', vrCplx.phantom) +
        pricingField('vc-pow', '分档 · 纯 PoW', vrCplx.pow) +
        pricingField('vc-both', '分档 · Phantom + PoW', vrCplx.both) + '</div></div>' +

        '<div style="border:1px solid var(--border-color);border-radius:8px;padding:16px;">' +
        '<h3 style="margin:0 0 12px;color:var(--primary-color);">VIP 分档</h3>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">' +
        '<div><label class="form-label">模式</label><select class="form-input" id="vip-mode">' +
        opt('off', '不分档', vip.mode) +
        opt('discount', '按折扣率', vip.mode) +
        opt('free', 'VIP 免费', vip.mode) + '</select></div>' +
        pricingField('vip-discount', '折扣率（0~1）', vip.discount) + '</div></div>';

    const meta = document.getElementById('pricing-meta');
    const when = pricingCache.updatedAt ? new Date(Number(pricingCache.updatedAt)).toLocaleString() : '从未修改';
    const who = (pricingCache.updatedBy != null && pricingCache.updatedBy !== '') ? pricingCache.updatedBy : '—';
    meta.textContent = '当前生效口径：' + pricingModeName(pricingCache.mode) +
        ' ｜ 最近修改：' + when + ' ｜ 修改人：' + who;
}

function savePricing() {
    if (!pricingCache) { alert('价目表尚未加载完成'); return; }
    const modeEl = document.querySelector('input[name="pricing-mode"]:checked');
    // 以 GET 回来的一份为底**整份回传**：先深拷贝，再覆盖表单里改过的叶子。
    const payload = JSON.parse(JSON.stringify(pricingCache));
    delete payload.endpointLabels;
    delete payload.verifyEndpointLabels;
    delete payload.verifyPlan;
    delete payload.updatedAt;
    delete payload.updatedBy;
    payload.mode = modeEl ? modeEl.value : 'per_verification';
    payload.per_verification = {
        phantom: pricingNum('pv-phantom'),
        pow: pricingNum('pv-pow'),
        both: pricingNum('pv-both')
    };
    const endpoints = {};
    document.querySelectorAll('#pricing-panel .pr-charge').forEach(function (cb) {
        const path = cb.getAttribute('data-path');
        const priceEl = document.querySelector('#pricing-panel .pr-price[data-path="' + path + '"]');
        endpoints[path] = {
            charge: cb.checked,
            price: priceEl ? (parseFloat(priceEl.value) || 0) : 0
        };
    });
    payload.per_request = {
        all_requests: document.getElementById('pr-all').checked,
        all_price: pricingNum('pr-all-price'),
        endpoints: endpoints,
        verify: {
            mode: document.getElementById('pr-verify-mode').value,
            flat: pricingNum('pr-verify-flat'),
            complexity: {
                phantom: pricingNum('vc-phantom'),
                pow: pricingNum('vc-pow'),
                both: pricingNum('vc-both')
            }
        }
    };
    payload.vip = {
        mode: document.getElementById('vip-mode').value,
        discount: pricingNum('vip-discount')
    };

    const btn = document.getElementById('save-pricing');
    btn.disabled = true;
    ZIYIT_API.request('/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(function (cfg) {
        renderPricingForm(cfg);
        updateSystemInfo('价目表已保存');
    }).catch(function (err) {
        alert('保存失败: ' + ((err && err.data && err.data.detail) || (err && err.message) || err));
    }).finally(function () { btn.disabled = false; });
}

function resetPricing() {
    if (!confirm('确定恢复默认价目表吗？当前自定义价格会被覆盖。')) return;
    const btn = document.getElementById('reset-pricing');
    btn.disabled = true;
    ZIYIT_API.request('/admin/pricing/reset', { method: 'POST' }).then(function (cfg) {
        renderPricingForm(cfg);
        updateSystemInfo('已恢复默认价目表');
    }).catch(function (err) {
        alert('恢复失败: ' + ((err && err.data && err.data.detail) || (err && err.message) || err));
    }).finally(function () { btn.disabled = false; });
}

// ------------------------------------------------------------
// 防注入检测（澄镜对外接口）：模型版本 / 定价配置 / 用量报表
// 单价一律取后端返回值，前端不硬编码任何价格。
// ------------------------------------------------------------
function injectionErrText(err) {
    if (err && err.data && err.data.detail) {
        const d = err.data.detail;
        if (typeof d === 'string') return d;
        return d.message || JSON.stringify(d);
    }
    if (err && err.status === 403) return '权限不足（需 Lv.3+ 管理员）';
    if (err && err.status === 401) return '登录状态已失效，请重新登录';
    return (err && err.message) || '请求失败';
}

function loadInjection() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可访问防注入检测'); return; }
    loadInjectionModels();
    loadInjectionPricing();
    loadInjectionReport();
}

let injModelCurrent = '';
let injModelLocked = false;

// 选中的版本 == 当前生效版本时没有可切换的目标，按钮置灰（避免白等 20 秒重载）
function syncSwitchModelBtn() {
    const sel = document.getElementById('inj-model-select');
    const btn = document.getElementById('switch-injection-model');
    if (!sel || !btn) return;
    btn.disabled = injModelLocked || !sel.value || sel.value === injModelCurrent;
}

function loadInjectionModels() {
    const box = document.getElementById('injection-model');
    const sel = document.getElementById('inj-model-select');
    const state = document.getElementById('injection-model-state');
    sel.innerHTML = '<option value="">加载中…</option>';
    box.textContent = '';
    state.textContent = '';
    return ZIYIT_API.adminInjectionModel().then(function (data) {
        data = data || {};
        const items = data.items || [];
        injModelCurrent = data.current || '';
        injModelLocked = !!data.locked;
        if (!items.length) {
            sel.innerHTML = '<option value="">后端未发现可用模型版本</option>';
            syncSwitchModelBtn();
            return;
        }
        // 下拉列出全部可用版本，当前生效的那条直接标出来
        sel.innerHTML = items.map(function (m) {
            const on = m.current || m.version === injModelCurrent;
            return '<option value="' + escAdmin(m.version) + '"' + (on ? ' selected' : '') + '>' +
                escAdmin(m.version) + (on ? '（当前使用）' : '') + '</option>';
        }).join('');

        const svc = data.service || {};
        const bits = ['当前生效：' + (injModelCurrent || '未知')];
        bits.push(data.selected ? '管理端选定：' + data.selected : '管理端选定：自动（取最新版本）');
        if (svc.reachable === false) bits.push('推理服务：不可达');
        else if (svc.modelVersion) bits.push('推理服务已载：' + svc.modelVersion + (svc.device ? '（' + svc.device + '）' : ''));
        state.textContent = bits.join(' ｜ ');

        box.textContent = injModelLocked
            ? '当前版本被环境变量 GUIDE_INJECTION_MODEL_DIR 锁定，在线切换不生效。'
            : '';
        syncSwitchModelBtn();
    }).catch(function (err) {
        sel.innerHTML = '<option value="">加载失败</option>';
        box.innerHTML = '<span style="color:var(--ziyit-danger);">加载失败：' + escAdmin(injectionErrText(err)) + '</span>';
        syncSwitchModelBtn();
    });
}

function switchInjectionModel() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可切换模型版本'); return; }
    const version = document.getElementById('inj-model-select').value;
    if (!version) { alert('请先选择要切换的模型版本'); return; }
    if (!confirm('确定切换到模型版本 ' + version + ' ？\n\n切换会通知推理服务重新加载模型，过程约需 20 秒，期间检测请求自动降级放行（fail-open，不误扣点数）。')) return;

    const btn = document.getElementById('switch-injection-model');
    const state = document.getElementById('injection-model-state');
    btn.disabled = true;
    btn.textContent = '切换中…';
    state.textContent = '正在切换并重载模型，约需 20 秒，请勿关闭页面…';

    ZIYIT_API.adminInjectionSetModel(version).then(function (r) {
        r = r || {};
        const done = r.requested || version;
        state.textContent = (r.reloaded ? '重载完成' : '已提交，重载结果未确认') + '，目标版本 ' + done + '…';
        updateSystemInfo('模型版本已切换到 ' + done);
        // 契约要求：切换完成后重新拉一次模型列表刷新选中态
        return ZIYIT_API.injectionModels();
    }).then(function () {
        return loadInjectionModels();
    }).catch(function (err) {
        alert('切换失败：' + injectionErrText(err));
        state.textContent = '';
    }).finally(function () {
        btn.textContent = '切换';
        syncSwitchModelBtn();
    });
}

function loadInjectionPricing() {
    const meta = document.getElementById('injection-pricing-meta');
    return ZIYIT_API.adminInjectionPricing().then(function (cfg) {
        cfg = cfg || {};
        const tppEl = document.getElementById('inj-tokens-per-point');
        const ppkEl = document.getElementById('inj-points-per-keyword');
        tppEl.value = cfg.tokensPerPoint != null ? cfg.tokensPerPoint : '';
        ppkEl.value = cfg.pointsPerKeyword != null ? cfg.pointsPerKeyword : '';

        let line = '';
        if (cfg.updatedAt) line += '最近修改：' + new Date(Number(cfg.updatedAt)).toLocaleString() + ' ｜ ';
        if (cfg.updatedBy != null && cfg.updatedBy !== '') line += '修改人：' + cfg.updatedBy + ' ｜ ';
        line += '可只改其中一项，保存后即刻生效。';
        meta.textContent = line;
    }).catch(function (err) {
        meta.innerHTML = '<span style="color:var(--ziyit-danger);">定价加载失败：' + escAdmin(injectionErrText(err)) + '</span>';
    });
}

function saveInjectionPricing() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可修改定价'); return; }
    const tpp = parseFloat(document.getElementById('inj-tokens-per-point').value);
    const ppk = parseFloat(document.getElementById('inj-points-per-keyword').value);
    const body = {};
    if (isFinite(tpp)) body.tokensPerPoint = tpp;
    if (isFinite(ppk)) body.pointsPerKeyword = ppk;
    if (!Object.keys(body).length) { alert('请至少填写一项要修改的价格'); return; }

    const btn = document.getElementById('save-injection-pricing');
    btn.disabled = true;
    btn.textContent = '保存中…';
    ZIYIT_API.adminInjectionSavePricing(body).then(function () {
        updateSystemInfo('防注入定价已保存');
        const meta = document.getElementById('injection-pricing-meta');
        return loadInjectionPricing().then(function () {
            meta.innerHTML = '<span style="color:var(--success-color,#2ecc71);">已保存，即刻生效（新价从下一次检测起计费）。</span>' + meta.innerHTML;
        });
    }).catch(function (err) {
        alert('保存失败：' + injectionErrText(err));
    }).finally(function () {
        btn.disabled = false;
        btn.textContent = '保存定价';
    });
}

function loadInjectionReport() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可查看防注入报表'); return; }
    const panel = document.getElementById('injection-report-panel');
    panel.innerHTML = loadingHTML();
    return ZIYIT_API.adminInjectionReport({
        start: document.getElementById('inj-start').value || '',
        end: document.getElementById('inj-end').value || '',
        userId: document.getElementById('inj-user-id').value || '',
        source: document.getElementById('inj-source').value || '',
        limit: document.getElementById('inj-limit').value
    }).then(function (d) {
        renderInjectionReport(d || {});
    }).catch(function (err) {
        panel.innerHTML = '<p style="padding:20px;color:var(--ziyit-danger);">加载失败: ' + escAdmin(injectionErrText(err)) + '</p>';
    });
}

function renderInjectionReport(d) {
    const panel = document.getElementById('injection-report-panel');
    const calls = Number(d.calls || 0);
    const injected = Number(d.injected || 0);
    const degraded = Number(d.degraded || 0);
    const rate = calls ? Math.round(injected / calls * 1000) / 10 : 0;

    let html = '<div class="user-stats">' +
        statCard(fmtPoints(calls), '调用次数') +
        statCard(fmtPoints(injected), '判为注入') +
        statCard(rate + '%', '注入占比') +
        statCard(fmtPoints(degraded), '降级次数') +
        statCard(fmtPoints(d.totalTokens), '总 Token') +
        statCard(fmtPoints(d.totalPoints), '消耗点数') +
        '</div>';

    if (!calls) {
        html += '<p style="padding:12px 0;color:var(--secondary-color);font-size:14px;">该筛选条件下没有调用记录。</p>';
        panel.innerHTML = html;
        return;
    }

    const tops = d.topKeywords || [];
    html += '<div style="border:1px solid var(--border-color);border-radius:8px;padding:16px;margin-bottom:16px;">' +
        '<h3 style="margin:0 0 12px;color:var(--primary-color);">命中关键词 Top' + tops.length + '</h3>' +
        (tops.length
            ? '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + tops.map(function (t) {
                return '<span style="font-size:13px;padding:2px 8px;border-radius:10px;background:var(--danger-color,#e74c3c);color:#fff;">' +
                    escAdmin(t.keyword) + ' × ' + escAdmin(t.count) + '</span>';
            }).join('') + '</div>'
            : '<p style="color:var(--secondary-color);font-size:13px;">没有命中任何关键词。</p>') +
        '</div>';

    html += injectionTable('分模型版本', d.byVersion || [], function (v) {
        return [v.version, v.calls, v.tokens, v.points];
    });
    const srcLabels = { api: '对外 API', cs: '在线客服内部' };
    const bySource = d.bySource || [];
    html += injectionTable('分调用来源', bySource.map(function (s) {
        return { label: srcLabels[s.source] || s.source, calls: s.calls, tokens: s.tokens, points: s.points };
    }), function (s) {
        return [s.label, s.calls, s.tokens, s.points];
    }, '来源');
    // 「调用来源」筛选需要后端按 source 过滤；未生效时明确说出来，别让人以为筛选坏了
    const srcFilter = (document.getElementById('inj-source') || {}).value || '';
    if (srcFilter && bySource.length > 1) {
        html += '<p style="margin:-6px 0 16px;font-size:12px;color:var(--secondary-color);">' +
            '注意：后端当前未按 source 过滤（返回仍含全部来源），需后端给 <code>/admin/injection/report</code> 加 <code>source</code> 参数后此筛选才会生效。</p>';
    }
    html += injectionTable('分密钥', d.byKey || [], function (k) {
        return [k.keyMasked, k.calls, k.tokens, k.points];
    });

    panel.innerHTML = html;
}

function statCard(value, label) {
    return '<div class="user-stat-card"><div class="user-stat-number">' + escAdmin(value) + '</div>' +
        '<div class="user-stat-label">' + escAdmin(label) + '</div></div>';
}

// ---------------- 在线客服后台：本站注入检测消耗（source=cs，Lv.1+ 可读） ----------------
function fmtDayInput(d) {
    const p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function loadGuideInjection() {
    const panel = document.getElementById('guide-inj-panel');
    if (!panel) return;
    const days = Number((document.getElementById('guide-inj-range') || {}).value || 1);
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 86400000);
    panel.innerHTML = '<p style="font-size:13px;color:var(--secondary-color);">加载中…</p>';
    return ZIYIT_API.guideInjectionUsage({
        start: fmtDayInput(start), end: fmtDayInput(end), limit: 10
    }).then(function (d) {
        d = d || {};
        const calls = Number(d.calls || 0);
        let html = '<div class="user-stats">' +
            statCard(fmtPoints(calls), '检测次数') +
            statCard(fmtPoints(d.injected), '判为注入') +
            statCard(fmtPoints(d.totalTokens), '总 Token') +
            statCard(fmtPoints(d.totalPoints), '本站消耗点数') +
            '</div>';
        const tops = d.topKeywords || [];
        if (tops.length) {
            html += '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">' + tops.map(function (t) {
                return '<span style="font-size:12px;padding:2px 8px;border-radius:10px;background:var(--danger-color,#e74c3c);color:#fff;">' +
                    escAdmin(t.keyword) + ' × ' + escAdmin(t.count) + '</span>';
            }).join('') + '</div>';
        }
        if (!calls) {
            html += '<p style="font-size:13px;color:var(--secondary-color);margin-top:10px;">该区间内没有本站检测记录。</p>';
        }
        panel.innerHTML = html;
    }).catch(function (err) {
        panel.innerHTML = '<p style="font-size:13px;color:var(--ziyit-danger);">加载失败：' + escAdmin(injectionErrText(err)) +
            '（若为 404，说明后端 <code>/guide/injection/usage</code> 尚未上线）</p>';
    });
}

function injectionTable(title, rows, pick, firstHead) {
    let html = '<div style="border:1px solid var(--border-color);border-radius:8px;padding:16px;margin-bottom:16px;">' +
        '<h3 style="margin:0 0 12px;color:var(--primary-color);">' + escAdmin(title) + '</h3>';
    if (!rows.length) {
        return html + '<p style="color:var(--secondary-color);font-size:13px;">暂无数据。</p></div>';
    }
    const title2 = [firstHead || (title === '分密钥' ? '密钥（脱敏）' : '版本'), '调用', 'Token', '点数'];
    html += '<div style="display:flex;gap:10px;padding:8px 10px;font-size:12px;color:var(--secondary-color);border-bottom:1px solid var(--border-color);">' +
        title2.map(function (h) {
            return '<span style="flex:1;min-width:0;">' + escAdmin(h) + '</span>';
        }).join('') + '</div>';
    rows.forEach(function (r) {
        const cells = pick(r);
        html += '<div style="display:flex;gap:10px;padding:9px 10px;font-size:13px;border-bottom:1px solid var(--border-color);">' +
            cells.map(function (c, i) {
                return '<span style="flex:1;min-width:0;' + (i ? 'font-family:Consolas,monospace;white-space:nowrap;' : 'word-break:break-all;') + '">' +
                    escAdmin(c == null ? '-' : c) + '</span>';
            }).join('') + '</div>';
    });
    return html + '</div>';
}

let modList = [];
let editingMod = null;

function modFields(m) {
    if (!m) return {};
     
    var v = m.modVersion != null ? m.modVersion : m.versions;
    return {
        id: m.modId != null ? m.modId : (m.id != null ? m.id : '-'),
        name: m.modName || m.name || '-',
        desc: m.modDescription || m.description || '',
        author: m.modAuthor || m.author || '',
        versions: Array.isArray(v) ? v : (v ? [String(v)] : []),
        fileUrl: m.lastFileUrl || m.fileUrl || m.downloadUrl || '',
        isDlc: m.isDLC === true || m.is_dlc === true || String(m.isDLC || m.is_dlc || '').toLowerCase() === 'true'
    };
}

function loadMods() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可访问 MOD/DLC 管理'); return; }
    document.getElementById('mod-list').innerHTML = loadingHTML();;
    return ZIYIT_API.request('/admin/mods').then(function (data) {
        modList = Array.isArray(data) ? data : (data.mods || data.data || data.items || []);
        renderMods();
        const dlcCount = modList.filter(function (m) { return modFields(m).isDlc; }).length;
        document.getElementById('mod-total').textContent = modList.length;
        document.getElementById('mod-dlc-count').textContent = dlcCount;
    }).catch(function (err) {
        document.getElementById('mod-list').innerHTML = '<p style="padding: 20px; color: var(--ziyit-danger);">加载失败: ' + escAdmin(err.message || err) + '</p>';
    });
}

function renderMods() {
    const search = (document.getElementById('mod-search').value || '').trim().toLowerCase();
    const area = document.getElementById('mod-list');
    const list = modList.filter(function (m) {
        if (!search) return true;
        const f = modFields(m);
        const hay = [f.name, f.id, f.author, f.desc, (f.versions || []).join(' '), f.isDlc ? 'DLC' : 'MOD']
            .join(' ').toLowerCase();
        return hay.indexOf(search) !== -1;
    });
    if (!list.length) {
        area.innerHTML = '<p style="padding: 20px; color: var(--ziyit-text-secondary);">暂无 MOD 数据</p>';
        return;
    }
    let html = '';
    list.forEach(function (m) {
        const f = modFields(m);
        const idx = modList.indexOf(m);
        html += '<div class="user-item wide-item"><div class="user-details">'
            + '<div class="user-name">' + escAdmin(f.name) + ' <span class="user-type ' + (f.isDlc ? 'pending' : 'normal') + '" style="font-size:11px;">' + (f.isDlc ? 'DLC' : 'MOD') + '</span></div>'
            + '<div class="user-email">ID: ' + escAdmin(f.id) + ' ｜ 作者: ' + escAdmin(f.author || '未知') + '</div>'
            + '<div class="user-email">' + escAdmin(f.desc) + '</div>'
            + '<div class="user-del-date">版本: ' + escAdmin(f.versions.join(', ') || '-') + ' ｜ 文件: ' + escAdmin(f.fileUrl || '-') + '</div>'
            + '</div><div class="user-actions">'
            + '<button class="action-btn edit" data-act="edit" data-idx="' + idx + '">编辑</button>'
            + '<button class="action-btn danger" data-act="del" data-idx="' + idx + '">删除</button>'
            + '</div></div>';
    });
    area.innerHTML = html;
    area.querySelectorAll('[data-act]').forEach(function (btn) {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const m = modList[idx];
        if (!m) return;
        btn.addEventListener('click', function () {
            if (btn.getAttribute('data-act') === 'edit') openEditMod(m);
            else deleteMod(m);
        });
    });
}

 
function fillModAuthorOptions(selected) {
    const sel = document.getElementById('mod-author');
    if (!userList.length) {
        ZIYIT_API.request('/admin/users').then(function (data) {
            userList = Array.isArray(data) ? data : (data.users || data.data || []);
            fillModAuthorOptions(selected);
        }).catch(function () {   });
        return;
    }
    let html = '<option value="">（未选择）</option>';
    let matched = false;
    userList.forEach(function (u) {
        const uid = u.userId != null ? u.userId : (u.id != null ? u.id : (u.user_id != null ? u.user_id : ''));
        const uname = u.username || ('用户' + uid);
        const isSel = selected !== '' && (String(selected) === String(uid) || String(uname) === String(selected));
        if (isSel) matched = true;
        html += '<option value="' + uid + '"' + (isSel ? ' selected' : '') + '>' + escAdmin(uname) + '（ID: ' + uid + '）</option>';
    });
     
    if (selected !== '' && !matched) {
        html += '<option value="' + escAdmin(selected) + '" selected>' + escAdmin(selected) + '（原作者，不在当前用户列表）</option>';
    }
    sel.innerHTML = html;
}

function openAddMod() {
    editingMod = null;
    document.getElementById('mod-modal-title').textContent = '添加 MOD';
    document.getElementById('mod-name').value = '';
    document.getElementById('mod-description').value = '';
    fillModAuthorOptions('');
    document.getElementById('mod-versions').value = '';
    document.getElementById('mod-file-url').value = '';
    document.getElementById('mod-is-dlc').value = 'false';
    document.getElementById('mod-modal').classList.add('active');
}

function openEditMod(m) {
    editingMod = m;
    const f = modFields(m);
    document.getElementById('mod-modal-title').textContent = '编辑 MOD ID:' + f.id;
    document.getElementById('mod-name').value = f.name;
    document.getElementById('mod-description').value = f.desc;
    fillModAuthorOptions(f.author);
    document.getElementById('mod-versions').value = f.versions.join(',');
    document.getElementById('mod-file-url').value = f.fileUrl;
    document.getElementById('mod-is-dlc').value = f.isDlc ? 'true' : 'false';
    document.getElementById('mod-modal').classList.add('active');
}

function saveMod() {
    const name = document.getElementById('mod-name').value.trim();
    if (!name) {
        alert('MOD 名称不能为空');
        return;
    }
    const versions = document.getElementById('mod-versions').value.split(',')
        .map(function (v) { return v.trim(); }).filter(function (v) { return v.length > 0; });
     
    const authorVal = document.getElementById('mod-author').value.trim();
    let modAuthor = null;
    if (authorVal !== '') {
        modAuthor = parseInt(authorVal, 10);
        if (isNaN(modAuthor)) modAuthor = authorVal;
    }
    const body = {
        modName: name,
        modDescription: document.getElementById('mod-description').value.trim(),
        modAuthor: modAuthor,
        modVersion: versions.length ? versions : ['1.0.0'],
        lastFileUrl: document.getElementById('mod-file-url').value.trim(),
        isDLC: document.getElementById('mod-is-dlc').value === 'true'
    };
    const isEdit = !!editingMod;
    const req = isEdit
        ? ZIYIT_API.request('/admin/mods/' + modFields(editingMod).id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        : ZIYIT_API.request('/admin/mods', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    req.then(function () {
        alert(isEdit ? 'MOD 已更新' : 'MOD 已添加');
        document.getElementById('mod-modal').classList.remove('active');
        loadMods();
    }).catch(function (err) {
        alert((isEdit ? '更新' : '添加') + '失败: ' + (err.message || err));
    });
}

function deleteMod(m) {
    const f = modFields(m);
    if (!confirm('确定删除 MOD「' + f.name + '」吗？将同时清理所有用户的持有记录。')) return;
    ZIYIT_API.request('/admin/mods/' + f.id, { method: 'DELETE' }).then(function () {
        alert('MOD 已删除');
        loadMods();
    }).catch(function (err) {
        alert('删除失败: ' + (err.message || err));
    });
}

 
let rcKeyList = [];
let keyTargetUser = null;

 
 
let rcBugList = [];
let rcBugStatuses = [];

 
let rcuUpdateList = [];
let rcuRevokedList = [];

function rcUserKeys(u) {
    return Array.isArray(u.keys) ? u.keys
        : (Array.isArray(u.rcKeys) ? u.rcKeys
            : (Array.isArray(u.softwareKeys) ? u.softwareKeys
                : (Array.isArray(u.keyList) ? u.keyList : [])));
}

 
 
function rcKeyFields(k) {
    if (!k) return {};
    return {
        productKey: k.productKey || k.product_key || '',
        permission: k.permission || k.software || '-',
        permissionName: k.permissionName || k.permission || '-',
        expire: k.expireAt || k.expire_at || '',
        permanent: !!k.permanent,
        expired: !!k.expired,
        source: k.source || ''
    };
}

function loadRcKeys() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可访问 RC 软件密钥'); return; }
    document.getElementById('rc-key-list').innerHTML = loadingHTML();;
    return ZIYIT_API.request('/admin/rc/keys').then(function (data) {
        rcKeyList = Array.isArray(data) ? data : ((data && (data.users || data.keys || data.data)) || []);
        renderRcKeys();
    }).catch(function (err) {
        document.getElementById('rc-key-list').innerHTML = '<p style="padding: 20px; color: var(--ziyit-danger);">加载失败: ' + escAdmin(err.message || err) + '</p>';
    });
}

function renderRcKeys() {
    const search = (document.getElementById('rc-key-search').value || '').trim().toLowerCase();
    const area = document.getElementById('rc-key-list');
    const list = rcKeyList.filter(function (u) {
        if (!search) return true;
        const userId = u.userId != null ? u.userId : (u.user_id != null ? u.user_id : '');
        const username = u.username || u.userName || '';
        const keyText = rcUserKeys(u).map(function (k) {
            return String(rcKeyFields(k).productKey || '');
        }).join(' ');
        return String(username).toLowerCase().indexOf(search) !== -1
            || String(userId).toLowerCase().indexOf(search) !== -1
            || keyText.toLowerCase().indexOf(search) !== -1;
    });
    if (!list.length) {
        area.innerHTML = '<p style="padding: 20px; color: var(--ziyit-text-secondary);">暂无用户密钥数据</p>';
        return;
    }
    let html = '';
    list.forEach(function (u) {
        const userId = u.userId != null ? u.userId : (u.user_id != null ? u.user_id : '-');
        const username = u.username || u.userName || ('用户ID:' + userId);
        const keys = rcUserKeys(u);
        const idx = rcKeyList.indexOf(u);
        html += '<div class="user-item wide-item"><div class="user-details">'
            + '<div class="user-name">' + escAdmin(username) + ' <span style="font-size:11px;color:var(--ziyit-text-secondary);">ID: ' + escAdmin(userId) + '</span></div>';
        if (!keys.length) {
            html += '<div class="user-email">暂无密钥</div>';
        } else {
            keys.forEach(function (k) {
                const kf = rcKeyFields(k);
                html += '<div class="user-email" style="font-family: monospace;">'
                    + escAdmin(kf.productKey || '（明文不可回显：历史记录）')
                    + ' ｜ 权限: ' + escAdmin(kf.permissionName)
                    + ' ｜ ' + (kf.permanent ? '永久' : '到期: ' + escAdmin(kf.expire || '—'))
                    + (kf.expired ? ' <span style="color:var(--ziyit-danger);">已过期</span>' : '')
                    + (kf.source ? ' ｜ 来源: ' + escAdmin(kf.source) : '')
                    + ' <button class="action-btn danger" data-ruid="' + escAdmin(userId) + '" data-rperm="' + escAdmin(kf.permission) + '" style="font-size:11px;padding:2px 8px;margin-left:4px;">移除</button>'
                    + '</div>';
            });
        }
        html += '</div><div class="user-actions">'
            + '<button class="action-btn edit" data-u="' + idx + '">添加密钥</button>'
            + '</div></div>';
    });
    area.innerHTML = html;
    area.querySelectorAll('[data-u]').forEach(function (btn) {
        const idx = parseInt(btn.getAttribute('data-u'), 10);
        const u = rcKeyList[idx];
        if (!u) return;
        btn.addEventListener('click', function () { openAddKey(u); });
    });
    area.querySelectorAll('[data-rperm]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            removeKey(btn.getAttribute('data-ruid'), btn.getAttribute('data-rperm'));
        });
    });
}

 

 
function adminRenderMarkdown(md) {
    if (!window.DOMPurify || !window.marked) {
        return '<p style="color:var(--ziyit-danger);">marked / DOMPurify 未加载，已阻止渲染报告</p>';
    }
    return DOMPurify.sanitize(marked.parse(md || ''));
}

function loadRcBugs() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可访问 RC BUG 管理'); return; }
    document.getElementById('rc-bug-list').innerHTML = loadingHTML();
     
    return Promise.all([
        ZIYIT_API.adminRcBugs(),
        ZIYIT_API.rcBugs().catch(function () { return null; })
    ]).then(function (res) {
        rcBugList = (res[0] && res[0].bugs) || [];
        rcBugStatuses = (res[1] && res[1].statuses) || [];
        renderRcBugFilter();
        renderRcBugs();
    }).catch(function (err) {
        document.getElementById('rc-bug-list').innerHTML =
            '<p style="padding: 20px; color: var(--ziyit-danger);">加载失败: ' + escAdmin(err.message || err) + '</p>';
    });
}

function renderRcBugFilter() {
    const sel = document.getElementById('rc-bug-filter');
    const keep = sel.value;
    let html = '<option value="">全部状态</option>';
    rcBugStatuses.forEach(function (s) {
        html += '<option value="' + escAdmin(s.key) + '">' + escAdmin(s.label) + '</option>';
    });
    sel.innerHTML = html;
    sel.value = keep || '';
}

function renderRcBugs() {
    const search = (document.getElementById('rc-bug-search').value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('rc-bug-filter').value;
    const area = document.getElementById('rc-bug-list');
    const list = rcBugList.filter(function (b) {
        if (statusFilter && b.status !== statusFilter) return false;
        if (!search) return true;
        return [b.code, b.title, b.submitUsername, b.submitUserId].some(function (v) {
            return String(v == null ? '' : v).toLowerCase().indexOf(search) !== -1;
        });
    });
    if (!list.length) {
        area.innerHTML = '<p style="padding: 20px; color: var(--ziyit-text-secondary);">暂无 BUG 反馈</p>';
        return;
    }
    const inputStyle = 'padding:4px 8px;border-radius:5px;border:1px solid var(--ziyit-border);font-size:12px;';
    let html = '';
    list.forEach(function (b) {
        const idx = rcBugList.indexOf(b);
        let options = '';
        rcBugStatuses.forEach(function (s) {
            options += '<option value="' + escAdmin(s.key) + '"'
                + (s.key === b.status ? ' selected' : '') + '>' + escAdmin(s.label) + '</option>';
        });
        html += '<div class="user-item wide-item">'
            + '<div class="user-details">'
            + '<div class="user-name">' + escAdmin(b.code) + ' ' + escAdmin(b.title)
            + ' <span style="font-size:11px;color:var(--ziyit-text-secondary);">' + escAdmin(b.statusText || b.status) + '</span></div>'
            + '<div class="user-email">提交者: ' + escAdmin(b.submitUsername || '-')
            + '（ID ' + escAdmin(b.submitUserId) + '）｜ 来源: ' + escAdmin(b.sourceText || '-')
            + '｜ 等级: ' + escAdmin(b.severityText || '-')
            + (b.version ? '｜ 版本: ' + escAdmin(b.version) : '')
            + (b.module ? '｜ 模块: ' + escAdmin(b.module) : '')
            + '</div>'
            + '<div class="user-email">提交: ' + escAdmin(b.submittedAtText || '-')
            + '｜ 最近变更: ' + escAdmin(b.updatedAtText || '-')
            + (b.lastStatusBy ? '（by ' + escAdmin(b.lastStatusBy) + '）' : '')
            + '｜ 联系方式: ' + escAdmin(b.contact || '未填写')
            + '</div>'
            + '</div>'
            + '<div class="user-actions" style="flex-wrap:wrap;">'
            + '<select data-bug-status="' + idx + '" style="' + inputStyle + '">' + options + '</select>'
            + '<input type="text" data-bug-appeared="' + idx + '" value="' + escAdmin(b.appearedVersion || '') + '" placeholder="出现版本（如 26.9）" style="' + inputStyle + 'width:140px;">'
            + '<input type="text" data-bug-fixed="' + idx + '" value="' + escAdmin(b.fixedVersion || '') + '" placeholder="解决版本（填了即编号）" style="' + inputStyle + 'width:150px;">'
            + '<input type="text" data-bug-note="' + idx + '" placeholder="变更说明（可选）" style="' + inputStyle + 'width:150px;">'
            + '<button class="action-btn edit" data-bug-save="' + idx + '">保存</button>'
            + '<button class="action-btn" data-bug-view="' + idx + '">查看报告</button>'
            + '</div>'
            + '<div data-bug-report="' + idx + '" style="display:none;flex:1 1 100%;background:var(--ziyit-bg-card);'
            + 'border:1px solid var(--ziyit-border);border-radius:8px;padding:12px;font-size:13px;overflow-x:auto;"></div>'
            + '</div>';
    });
    area.innerHTML = html;

    area.querySelectorAll('[data-bug-save]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const idx = parseInt(btn.getAttribute('data-bug-save'), 10);
            const b = rcBugList[idx];
            if (!b) return;
            const sel = area.querySelector('[data-bug-status="' + idx + '"]');
            const noteEl = area.querySelector('[data-bug-note="' + idx + '"]');
            const appearedEl = area.querySelector('[data-bug-appeared="' + idx + '"]');
            const fixedEl = area.querySelector('[data-bug-fixed="' + idx + '"]');
            saveRcBugStatus(b, {
                status: sel ? sel.value : '',
                note: noteEl ? noteEl.value.trim() : '',
                appearedVersion: appearedEl ? appearedEl.value.trim() : '',
                fixedVersion: fixedEl ? fixedEl.value.trim() : ''
            });
        });
    });
    area.querySelectorAll('[data-bug-view]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const idx = parseInt(btn.getAttribute('data-bug-view'), 10);
            const b = rcBugList[idx];
            const box = area.querySelector('[data-bug-report="' + idx + '"]');
            if (!b || !box) return;
            if (box.style.display === 'none') {
                box.innerHTML = adminRenderMarkdown(b.markdown);
                box.style.display = 'block';
                btn.textContent = '收起报告';
            } else {
                box.style.display = 'none';
                btn.textContent = '查看报告';
            }
        });
    });
}

function saveRcBugStatus(bug, opts) {
    const o = opts || {};
    if (!o.status && !o.appearedVersion && !o.fixedVersion) { alert('请先选择状态，或填写出现 / 解决版本'); return; }
    ZIYIT_API.adminRcBugStatus(bug.id, o).then(function (res) {
        alert((res && res.message) || '已更新');
        loadRcBugs();
    }).catch(function (err) {
        alert('更新失败: ' + (err.message || err));
    });
}

 
 

function rcuFmtSize(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function loadRcuPanel() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可访问 RCU 更新管理'); return Promise.resolve(); }
    document.getElementById('rcu-list').innerHTML = loadingHTML();
    document.getElementById('rcu-revoked-list').innerHTML = loadingHTML();
    return Promise.all([
        ZIYIT_API.rcuList(),
        ZIYIT_API.rcuRevokedList()
    ]).then(function (res) {
        rcuUpdateList = (res[0] && res[0].updates) || [];
        rcuRevokedList = (res[1] && res[1].revoked) || [];
        renderRcuUpdates();
        renderRcuRevoked();
    }).catch(function (err) {
        const msg = '<p style="padding: 20px; color: var(--ziyit-danger);">加载失败: ' + escAdmin(err.message || err) + '</p>';
        document.getElementById('rcu-list').innerHTML = msg;
        document.getElementById('rcu-revoked-list').innerHTML = msg;
    });
}

function renderRcuUpdates() {
    const search = (document.getElementById('rcu-search').value || '').trim().toLowerCase();
    const area = document.getElementById('rcu-list');
    const revokedSet = {};
    rcuRevokedList.forEach(function (r) { revokedSet[String(r.version)] = true; });
    const list = rcuUpdateList.filter(function (u) {
        if (!search) return true;
        return String(u.version || '').toLowerCase().indexOf(search) !== -1
            || String(u.channel || '').toLowerCase().indexOf(search) !== -1;
    });
    if (!list.length) {
        area.innerHTML = '<p style="padding: 20px; color: var(--ziyit-text-secondary);">暂无已发布更新包</p>';
        return;
    }
    let html = '';
    list.forEach(function (u) {
        const ver = String(u.version || '');
        const revoked = revokedSet[ver] ? ' <span style="color:var(--ziyit-danger);">已撤销</span>' : '';
        const tags = escAdmin(u.channel || 'stable')
            + (u.isLts ? ' · LTS' : '')
            + (u.isDelta ? ' · 增量(基线 ' + escAdmin(u.baseVersion || '?') + ')' : '');
        html += '<div class="user-item wide-item"><div class="user-details">'
            + '<div class="user-name">' + escAdmin(ver)
            + ' <span style="font-size:11px;color:var(--ziyit-text-secondary);">' + tags + '</span>' + revoked + '</div>'
            + '<div class="user-email">大小: ' + escAdmin(rcuFmtSize(u.size)) + ' ｜ 发布: ' + escAdmin(u.publishedAt || '-') + '</div>'
            + '<div class="user-email" style="font-family: monospace;">sha256: ' + escAdmin(u.sha256 || '-') + '</div>'
            + '</div><div class="user-actions">'
            + '<button class="action-btn edit" data-rcu-download="' + escAdmin(ver) + '">下载</button>'
            + '<button class="action-btn danger" data-rcu-revoke="' + escAdmin(ver) + '">撤销</button>'
            + '</div></div>';
    });
    area.innerHTML = html;
    area.querySelectorAll('[data-rcu-download]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const ver = btn.getAttribute('data-rcu-download');
            btn.disabled = true;
            ZIYIT_API.rcuDownload(ver).catch(function (err) {
                alert('下载失败: ' + (err.message || err));
            }).then(function () { btn.disabled = false; });
        });
    });
    area.querySelectorAll('[data-rcu-revoke]').forEach(function (btn) {
        btn.addEventListener('click', function () { revokeRcuVersion(btn.getAttribute('data-rcu-revoke')); });
    });
}

function renderRcuRevoked() {
    const area = document.getElementById('rcu-revoked-list');
    if (!rcuRevokedList.length) {
        area.innerHTML = '<p style="padding: 20px; color: var(--ziyit-text-secondary);">暂无撤销版本</p>';
        return;
    }
    let html = '';
    rcuRevokedList.forEach(function (r) {
        html += '<div class="user-item wide-item"><div class="user-details">'
            + '<div class="user-name">' + escAdmin(r.version)
            + ' <span style="font-size:11px;color:var(--ziyit-text-secondary);">' + escAdmin(r.reason || '-') + '</span></div>'
            + '<div class="user-email">' + escAdmin(r.message || '（无说明）')
            + (r.minSafeVersion ? ' ｜ 最低安全版本: ' + escAdmin(r.minSafeVersion) : '') + '</div>'
            + '<div class="user-email">撤销于: ' + escAdmin(r.revokedAt || '-')
            + (r.revokedBy ? '（by ' + escAdmin(r.revokedBy) + '）' : '') + '</div>'
            + '</div><div class="user-actions">'
            + '<button class="action-btn" data-rcu-unrevoke="' + escAdmin(String(r.version)) + '">解除撤销</button>'
            + '</div></div>';
    });
    area.innerHTML = html;
    area.querySelectorAll('[data-rcu-unrevoke]').forEach(function (btn) {
        btn.addEventListener('click', function () { removeRcuRevoked(btn.getAttribute('data-rcu-unrevoke')); });
    });
}

function rcuSha256Hex(file) {
    return file.arrayBuffer().then(function (buf) {
        return crypto.subtle.digest('SHA-256', buf);
    }).then(function (digest) {
        return Array.prototype.map.call(new Uint8Array(digest), function (b) {
            return ('00' + b.toString(16)).slice(-2);
        }).join('').toUpperCase();
    });
}

function publishRcuUpdate() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可发布 RCU'); return; }
    const statusEl = document.getElementById('rcu-publish-status');
    const fileEl = document.getElementById('rcu-file');
    const file = fileEl.files && fileEl.files[0];
    const version = (document.getElementById('rcu-version').value || '').trim();
    const channel = document.getElementById('rcu-channel').value || 'stable';
    const baseVersion = (document.getElementById('rcu-base-version').value || '').trim();
    const isLts = document.getElementById('rcu-is-lts').checked;
    const isDelta = document.getElementById('rcu-is-delta').checked;
    const allowDowngrade = document.getElementById('rcu-allow-downgrade').checked;
    const sha = (document.getElementById('rcu-sha256').value || '').trim().toUpperCase();
    if (!file) { alert('请先选择 .7z 更新包'); return; }
    if (!version) { alert('请填写版本号'); return; }
    if (isDelta && !baseVersion) { alert('增量包必须填写 baseVersion'); return; }
    statusEl.textContent = sha ? '正在上传...' : '正在计算 sha256 ...';
    const prep = sha ? Promise.resolve(sha) : rcuSha256Hex(file);
    prep.then(function (digest) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('version', version);
        fd.append('channel', channel);
        fd.append('sha256', digest);
        if (isLts) fd.append('isLts', 'true');
        if (isDelta) fd.append('isDelta', 'true');
        if (baseVersion) fd.append('baseVersion', baseVersion);
        if (allowDowngrade) fd.append('allowDowngrade', 'true');
        statusEl.textContent = '正在上传（' + rcuFmtSize(file.size) + '）...';
        return ZIYIT_API.rcuPublish(fd);
    }).then(function (res) {
        const warn = (res && res.result === 'warn_unsigned')
            ? '（注意：包内 manifest.json 未签名，已按告警放行）' : '';
        statusEl.textContent = ((res && res.message) || '已发布') + warn;
        document.getElementById('rcu-version').value = '';
        document.getElementById('rcu-base-version').value = '';
        document.getElementById('rcu-sha256').value = '';
        fileEl.value = '';
        loadRcuPanel();
    }).catch(function (err) {
        statusEl.textContent = '发布失败: ' + (err.message || err);
    });
}

function revokeRcuVersion(version) {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可撤销 RCU'); return; }
    const reason = prompt('撤销 ' + version + ' 的原因（可留空，默认 manual）：', 'manual');
    if (reason === null) return;
    const message = prompt('给客户端展示的提示信息（可留空）：', '');
    if (message === null) return;
    ZIYIT_API.rcuRevokeAdd({ version: version, reason: reason, message: message }).then(function (res) {
        alert((res && res.message) || '已撤销');
        loadRcuPanel();
    }).catch(function (err) {
        alert('撤销失败: ' + (err.message || err));
    });
}

function addRcuRevoked() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可维护撤销列表'); return; }
    const version = (document.getElementById('rcu-revoke-version').value || '').trim();
    const reason = (document.getElementById('rcu-revoke-reason').value || '').trim();
    const message = (document.getElementById('rcu-revoke-message').value || '').trim();
    const minSafeVersion = (document.getElementById('rcu-revoke-min').value || '').trim();
    if (!version) { alert('请填写要撤销的版本号'); return; }
    ZIYIT_API.rcuRevokeAdd({
        version: version, reason: reason, message: message, minSafeVersion: minSafeVersion
    }).then(function (res) {
        alert((res && res.message) || '已加入撤销列表');
        ['rcu-revoke-version', 'rcu-revoke-reason', 'rcu-revoke-message', 'rcu-revoke-min'].forEach(function (id) {
            document.getElementById(id).value = '';
        });
        loadRcuPanel();
    }).catch(function (err) {
        alert('操作失败: ' + (err.message || err));
    });
}

function removeRcuRevoked(version) {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可维护撤销列表'); return; }
    if (!confirm('确定解除对 ' + version + ' 的撤销？')) return;
    ZIYIT_API.rcuRevokeRemove(version).then(function (res) {
        alert((res && res.message) || '已解除撤销');
        loadRcuPanel();
    }).catch(function (err) {
        alert('操作失败: ' + (err.message || err));
    });
}

 
 
 
let afdianData = { orders: [], vipUsers: [], summary: {} };

const AFDIAN_KIND_TEXT = { vip: 'VIP 会员', rc: 'RC 密钥', dlc: 'DLC 扩展包' };
const AFDIAN_REASON_TEXT = {
    granted: '已发货',
    not_paid: '未付款',
    plan_not_allowed: '方案未登记',
    remark_format: '备注格式不合法',
    dlc_not_found: '扩展包未找到',
    user_not_found: '查不到该账号',
    already_granted: '已入账，跳过',
    no_out_trade_no: '订单号缺失'
};
const AFDIAN_SOURCE_TEXT = {
    webhook: 'Webhook 通知',
    self_check: '用户自助查单',
    admin_reconcile: '管理员查单'
};

function afdianKindText(k) { return AFDIAN_KIND_TEXT[k] || (k || '-'); }
function afdianReasonText(r) { return AFDIAN_REASON_TEXT[r] || (r || '-'); }
function afdianSourceText(s) { return AFDIAN_SOURCE_TEXT[s] || (s || '-'); }

function loadAfdian() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可访问爱发电订单'); return Promise.resolve(); }
    document.getElementById('afdian-order-list').innerHTML = loadingHTML();
    document.getElementById('afdian-vip-list').innerHTML = loadingHTML();
    return ZIYIT_API.adminAfdianPurchases().then(function (data) {
        afdianData.orders = (data && data.orders) || [];
        afdianData.vipUsers = (data && data.vipUsers) || [];
        afdianData.summary = (data && data.summary) || {};
        renderAfdianSummary();
        renderAfdianOrders();
        renderAfdianVip();
    }).catch(function (err) {
        document.getElementById('afdian-order-list').innerHTML =
            '<p style="padding: 20px; color: var(--ziyit-danger);">加载失败: ' + escAdmin(pentestErr(err, '请求失败')) + '</p>';
        document.getElementById('afdian-vip-list').innerHTML = '';
    });
}

function renderAfdianSummary() {
    const s = afdianData.summary || {};
    const total = Number(s.totalOrders || 0);
    const granted = Number(s.grantedOrders || 0);
    const ungranted = Math.max(0, total - granted);
    document.getElementById('afdian-total-orders').textContent = total;
    document.getElementById('afdian-granted-orders').textContent = granted;
    document.getElementById('afdian-ungranted-orders').textContent = ungranted;
    document.getElementById('afdian-active-vip').textContent = Number(s.activeVip || 0);
    document.getElementById('afdian-expired-vip').textContent = Number(s.expiredVip || 0);
    const badge = document.getElementById('afdian-ungranted-badge');
    if (ungranted > 0) {
        badge.textContent = '未发货 ' + ungranted;
        badge.style.display = '';
    } else {
        badge.style.display = 'none';
    }
}

function renderAfdianOrders() {
    const search = (document.getElementById('afdian-search').value || '').trim().toLowerCase();
    const filter = document.getElementById('afdian-filter').value;
    const area = document.getElementById('afdian-order-list');
    const list = afdianData.orders.filter(function (o) {
        if (filter === 'granted' && !o.granted) return false;
        if (filter === 'ungranted' && o.granted) return false;
        if (!search) return true;
        return [o.outTradeNo, o.username, o.userId, o.remark, o.planId, o.amount, o.afdianUserId]
            .some(function (v) { return String(v == null ? '' : v).toLowerCase().indexOf(search) !== -1; });
    });
    if (!list.length) {
        area.innerHTML = '<p style="padding: 20px; color: var(--ziyit-text-secondary);">暂无订单记录</p>';
        return;
    }
    let html = '';
    list.forEach(function (o) {
        const granted = !!o.granted;
        const badge = granted ? penBadge('ok', '已发货') : penBadge('bad', afdianReasonText(o.reason));
         
        const who = granted
            ? escAdmin(o.username || '-') + '（ID ' + escAdmin(o.userId) + '）'
            : '未识别到账号';
        const timeLabel = granted ? '发货时间' : '记录时间';
        const timeValue = granted ? (o.grantedAt || '-') : (o.seenAt || '-');
        html += '<div class="user-item wide-item">'
            + '<div class="user-details">'
            + '<div class="user-name">' + escAdmin(o.outTradeNo) + ' ' + badge
            + (granted ? ' <span style="font-size:11px;color:var(--ziyit-text-secondary);">' + escAdmin(afdianKindText(o.kind)) + '</span>' : '')
            + '</div>'
            + '<div class="user-email">购买人: ' + who
            + '｜ 金额: ' + escAdmin(o.amount || '-')
            + (o.planId ? '｜ 方案: ' + escAdmin(o.planId) : '')
            + (o.month ? '｜ 月数: ' + escAdmin(o.month) : '')
            + '</div>'
            + '<div class="user-email">' + timeLabel + ': ' + escAdmin(timeValue)
            + '｜ 来源: ' + escAdmin(afdianSourceText(o.source))
            + (granted && o.days ? '｜ 天数: ' + escAdmin(o.days) : '')
            + (granted && o.expireAt ? '｜ 到期: ' + escAdmin(o.expireAt) : '')
            + (granted && o.permission ? '｜ 权限: ' + escAdmin(o.permission) : '')
            + (granted && o.modIds && o.modIds.length ? '｜ 扩展包: ' + escAdmin(o.modIds.join(', ')) : '')
            + '</div>'
            + '<div class="user-email">备注: ' + escAdmin(o.remark || '（空）')
            + (o.remarkUsernameMismatch ? ' ' + penBadge('warn', '备注用户名与账号不一致') : '')
            + '</div>'
            + '</div>'
            + '<div class="user-actions">'
            + '<button class="action-btn" data-afdian-retry="' + escAdmin(o.outTradeNo) + '">重新查单</button>'
            + '</div>'
            + '</div>';
    });
    area.innerHTML = html;

     
    area.querySelectorAll('[data-afdian-retry]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.getElementById('afdian-order-no').value = btn.getAttribute('data-afdian-retry') || '';
            doAfdianReconcile(true);
        });
    });
}

function renderAfdianVip() {
    const area = document.getElementById('afdian-vip-list');
    const list = afdianData.vipUsers || [];
    document.getElementById('afdian-vip-count').textContent = list.length;
    if (!list.length) {
        area.innerHTML = '<p style="padding: 20px; color: var(--ziyit-text-secondary);">暂无 VIP 记录</p>';
        return;
    }
    let html = '';
    list.forEach(function (v) {
        const badge = v.vipActive ? penBadge('ok', '有效') : penBadge('bad', '已过期');
        const expire = v.vipPermanent ? '永久' : (v.vipExpireAt || '-');
        html += '<div class="user-item wide-item">'
            + '<div class="user-details">'
            + '<div class="user-name">' + escAdmin(v.username || '-') + ' ' + badge + '</div>'
            + '<div class="user-email">用户 ID: ' + escAdmin(v.userId)
            + '｜ 角色: ' + escAdmin(v.role || '-')
            + '｜ 到期: ' + escAdmin(expire)
            + '｜ 来源: ' + escAdmin(v.vipSource || '-')
            + '</div>'
            + '</div>'
            + '</div>';
    });
    area.innerHTML = html;
}

function doAfdianReconcile(exact) {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可执行补发'); return; }
    const resultEl = document.getElementById('afdian-reconcile-result');
    const orderNo = (document.getElementById('afdian-order-no').value || '').trim();
    const pages = document.getElementById('afdian-scan-pages').value;
    if (exact && !orderNo) {
        alert('请先填写要补发的爱发电订单号');
        return;
    }
    const opts = exact ? { outTradeNo: orderNo } : { pages: Number(pages) || 1 };
    resultEl.style.display = 'block';
    resultEl.innerHTML = '正在查单…';
    ZIYIT_API.adminAfdianReconcile(opts).then(function (res) {
        const data = res || {};
        const granted = data.granted || [];
        const skipped = data.skipped || [];
        const rejected = data.rejected || [];
        let html = '<div>' + escAdmin(data.message || '已完成查单') + '</div>';
        if (granted.length) {
            const rows = granted.map(function (o) {
                return escAdmin(o.outTradeNo) + ' → ' + escAdmin(o.username || '-')
                    + '（' + escAdmin(afdianKindText(o.kind)) + (o.expireAt ? '，到期 ' + escAdmin(o.expireAt) : '') + '）';
            }).join('<br>');
            html += '<div style="color: var(--ziyit-success);">已补发 ' + granted.length + ' 条：<br>' + rows + '</div>';
        }
        if (skipped.length) {
            html += '<div style="color: var(--ziyit-text-secondary);">跳过已入账 ' + skipped.length + ' 条：'
                + escAdmin(skipped.join(', ')) + '</div>';
        }
        if (rejected.length) {
            const rows = rejected.map(function (r) {
                return escAdmin(r.outTradeNo) + '（' + escAdmin(afdianReasonText(r.reason)) + '）';
            }).join('<br>');
            html += '<div style="color: var(--ziyit-warning);">未发货 ' + rejected.length + ' 条：<br>' + rows + '</div>';
        }
        resultEl.innerHTML = html;
        loadAfdian();
    }).catch(function (err) {
        resultEl.innerHTML = '<span style="color: var(--ziyit-danger);">查单失败: '
            + escAdmin(pentestErr(err, '请求失败')) + '</span>';
    });
}

 
 
 
 
let pentestData = { codes: [], applications: [], pendingApplications: 0 };
const PENTEST_TASK_LABELS = { open: '待执行', doing: '进行中', done: '已完成' };

function pentestIsSuper() {
    return !!(currentAdminInfo && Number(currentAdminInfo.userId) === 1);
}

 
function pentestErr(err, fallback) {
    if (err && err.data) {
        if (typeof err.data === 'string' && err.data) return err.data;
        if (err.data.detail) {
            return typeof err.data.detail === 'string' ? err.data.detail : JSON.stringify(err.data.detail);
        }
        if (err.data.message) return err.data.message;
    }
    if (err && err.message) return err.message;
    return fallback || '请求失败';
}

function pentestSourceText(s) {
    if (s === 'admin') return '站长操作';
    if (s === 'self') return '本人操作';
    return s || '-';
}

function penBadge(kind, text) {
    const map = {
        ok: ['rgba(39,174,96,.16)', 'var(--ziyit-success)'],
        warn: ['rgba(243,156,18,.16)', 'var(--ziyit-warning)'],
        bad: ['rgba(231,76,60,.16)', 'var(--ziyit-danger)']
    };
    const c = map[kind] || map.warn;
    return '<span style="font-size:11px;padding:2px 8px;border-radius:10px;white-space:nowrap;background:'
        + c[0] + ';color:' + c[1] + ';border:1px solid ' + c[1] + ';">' + escAdmin(text) + '</span>';
}

function penInputStyle() {
    return 'padding:4px 8px;border-radius:5px;border:1px solid var(--ziyit-border);font-size:12px;'
        + 'background:var(--ziyit-bg-card);color:var(--ziyit-text-primary);';
}

function loadPentest() {
    const codeList = document.getElementById('pentest-code-list');
    const appList = document.getElementById('pentest-app-list');
    if (!codeList || !appList) return Promise.resolve();
    if (!canAccess(1)) {
        codeList.innerHTML = '<p style="padding:20px;color:var(--ziyit-danger);">仅 Lv.1+ 管理员可查看渗透测试管理</p>';
        appList.innerHTML = '';
        return Promise.resolve();
    }
    codeList.innerHTML = loadingHTML();
    appList.innerHTML = loadingHTML();
     
    const assignBox = document.getElementById('pentest-assign-box');
    if (assignBox) assignBox.style.display = pentestIsSuper() ? '' : 'none';
    return ZIYIT_API.adminPentest().then(function (data) {
        pentestData = {
            codes: (data && data.codes) || [],
            applications: (data && data.applications) || [],
            pendingApplications: Number((data && data.pendingApplications) || 0)
        };
        renderPentestCodes();
        renderPentestApps();
    }).catch(function (err) {
        codeList.innerHTML = '<p style="padding:20px;color:var(--ziyit-danger);">加载失败: ' + escAdmin(pentestErr(err)) + '</p>';
        appList.innerHTML = '';
    });
}

function renderPentestCodes() {
    const area = document.getElementById('pentest-code-list');
    const countEl = document.getElementById('pentest-code-count');
    const all = pentestData.codes;
    if (countEl) countEl.textContent = all.length;
    const search = (document.getElementById('pentest-code-search').value || '').trim().toLowerCase();
    const list = all.filter(function (c) {
        if (!search) return true;
        return [c.code, c.username, c.applicantUsername, c.applicantUserId, c.userId, c.statusLabel]
            .some(function (v) { return String(v == null ? '' : v).toLowerCase().indexOf(search) !== -1; });
    });
    if (!list.length) {
        area.innerHTML = '<p style="padding:20px;color:var(--ziyit-text-secondary);">'
            + (all.length ? '没有匹配的编号' : '还没有分配过渗透测试编号') + '</p>';
        return;
    }
    const isSuper = pentestIsSuper();
    let html = '';
    list.forEach(function (c) {
        const idx = all.indexOf(c);
        const acc = c.account;
        const ts = c.taskSummary || { total: 0, done: 0, open: 0 };
        html += '<div class="user-item wide-item">'
            + '<div class="user-details">'
            + '<div class="user-name">' + escAdmin(c.code) + ' '
            + (c.status === 'active' ? penBadge('ok', '生效中') : penBadge('bad', '已吊销'))
            + '</div>'
            + '<div class="user-email">测试账号: '
            + (acc
                ? escAdmin(acc.username) + '（ID ' + escAdmin(acc.userId) + '）'
                    + (acc.banned ? '　' + penBadge('bad', '已封禁') : '')
                    + (acc.strict ? '　' + penBadge('warn', '严管期') : '')
                : '<b>账号不存在（编号悬空，可直接重置救活）</b>')
            + '</div>'
            + '<div class="user-email">申请这个账号的账号: '
            + escAdmin(c.applicantUsername || '-') + '（ID ' + escAdmin(c.applicantUserId) + '）'
            + '　｜ 来源: ' + escAdmin(pentestSourceText(c.source))
            + '　｜ 分配: ' + escAdmin(c.assignedAt || '-')
            + '</div>'
            + '<div class="user-email">任务进度: ' + escAdmin(ts.done) + '/' + escAdmin(ts.total)
            + '　｜ 重置次数: ' + escAdmin(c.resets || 0)
            + (c.note ? '　｜ 备注: ' + escAdmin(c.note) : '')
            + '</div>';
        if (c.status !== 'active') {
            html += '<div class="user-email">吊销: ' + escAdmin(c.revokedAt || '-')
                + '　｜ 来源: ' + escAdmin(pentestSourceText(c.revokeSource))
                + '　｜ 操作人 ID: ' + escAdmin(c.revokedBy)
                + (c.revokeReason ? '　｜ 原因: ' + escAdmin(c.revokeReason) : '')
                + '</div>';
        }
        html += '</div>'
            + '<div class="user-actions" style="flex-wrap:wrap;">'
            + '<button class="action-btn" data-pentest-tasks="' + idx + '">任务 (' + escAdmin(ts.total) + ')</button>'
            + (isSuper
                ? '<button class="action-btn edit" data-pentest-reset="' + idx + '">重置</button>'
                    + '<button class="action-btn delete" data-pentest-revoke="' + idx + '">吊销</button>'
                : '')
            + '</div>'
            + '<div data-pentest-panel="' + idx + '" style="display:none;flex:1 1 100%;background:var(--ziyit-bg-card);'
            + 'border:1px solid var(--ziyit-border);border-radius:8px;padding:12px;font-size:13px;"></div>'
            + '</div>';
    });
    area.innerHTML = html;
}

function pentestPanelHTML(idx) {
    const c = pentestData.codes[idx];
    if (!c) return '';
    const isSuper = pentestIsSuper();
    const inputStyle = penInputStyle();
    let html = '';
    const tasks = c.tasks || [];
    if (!tasks.length) html += '<p style="color:var(--ziyit-text-secondary);">还没有派过任务。</p>';
    tasks.forEach(function (t) {
        html += '<div style="border-top:1px solid var(--ziyit-border);padding:8px 0;">'
            + '<div>#' + escAdmin(t.id) + ' ' + escAdmin(t.title) + '　'
            + (t.status === 'done' ? penBadge('ok', t.statusLabel || '已完成')
                : (t.status === 'doing' ? penBadge('warn', t.statusLabel || '进行中')
                    : penBadge('bad', t.statusLabel || '待执行')))
            + '</div>';
        if (t.detail) html += '<div style="color:var(--ziyit-text-secondary);">说明: ' + escAdmin(t.detail) + '</div>';
        if (t.note) html += '<div style="color:var(--ziyit-text-secondary);">备注: ' + escAdmin(t.note) + '</div>';
        html += '<div style="color:var(--ziyit-text-secondary);font-size:12px;">更新: '
            + escAdmin(t.updatedAt || t.createdAt || '-') + '</div>';
        if (isSuper) {
            const key = idx + '|' + t.id;
            let options = '';
            Object.keys(PENTEST_TASK_LABELS).forEach(function (k) {
                options += '<option value="' + k + '"' + (t.status === k ? ' selected' : '') + '>'
                    + PENTEST_TASK_LABELS[k] + '</option>';
            });
            html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">'
                + '<select data-task-status="' + key + '" style="' + inputStyle + '">' + options + '</select>'
                + '<input type="text" data-task-note="' + key + '" placeholder="站长备注（可选）" style="' + inputStyle + 'width:200px;">'
                + '<button class="action-btn edit" data-task-save="' + key + '">保存</button>'
                + '<button class="action-btn delete" data-task-del="' + key + '">删除</button>'
                + '</div>';
        }
        html += '</div>';
    });
    if (isSuper) {
        html += '<div style="border-top:1px solid var(--ziyit-border);padding-top:10px;margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">'
            + '<input type="text" data-task-new-title="' + idx + '" placeholder="新任务标题（必填）" style="' + inputStyle + 'width:220px;">'
            + '<input type="text" data-task-new-detail="' + idx + '" placeholder="任务说明（可选）" style="' + inputStyle + 'width:260px;">'
            + '<button class="action-btn" data-task-add="' + idx + '">派任务</button>'
            + '</div>';
        if (c.status !== 'active') {
            html += '<p style="color:var(--ziyit-danger);margin-top:6px;">该编号已吊销，无法再派任务。</p>';
        }
    }
    return html;
}

 
function reloadPentestKeepPanel(idx) {
    return loadPentest().then(function () {
        if (idx == null) return;
        const btn = document.querySelector('[data-pentest-tasks="' + idx + '"]');
        const panel = document.querySelector('[data-pentest-panel="' + idx + '"]');
        if (btn && panel) {
            panel.innerHTML = pentestPanelHTML(idx);
            panel.style.display = 'block';
            btn.textContent = '收起任务';
        }
    });
}

function renderPentestApps() {
    const area = document.getElementById('pentest-app-list');
    const badge = document.getElementById('pentest-pending-badge');
    const pending = Number(pentestData.pendingApplications || 0);
    if (badge) {
        badge.style.display = pending ? '' : 'none';
        badge.textContent = '待审批 ' + pending;
    }
    const all = pentestData.applications;
    const search = (document.getElementById('pentest-app-search').value || '').trim().toLowerCase();
    const list = all.filter(function (a) {
        if (!search) return true;
        return [a.id, a.applicantUsername, a.applicantUserId, a.reason, a.code]
            .some(function (v) { return String(v == null ? '' : v).toLowerCase().indexOf(search) !== -1; });
    });
    if (!list.length) {
        area.innerHTML = '<p style="padding:20px;color:var(--ziyit-text-secondary);">'
            + (all.length ? '没有匹配的申请' : '还没有收到过申请') + '</p>';
        return;
    }
    const isSuper = pentestIsSuper();
    const inputStyle = penInputStyle();
    let html = '';
    list.forEach(function (a) {
        const idx = all.indexOf(a);
        const badgeHtml = a.status === 'pending' ? penBadge('warn', '待审批')
            : (a.status === 'approved' ? penBadge('ok', '已通过') : penBadge('bad', '已驳回'));
        html += '<div class="user-item wide-item">'
            + '<div class="user-details">'
            + '<div class="user-name">申请 #' + escAdmin(a.id) + ' ' + badgeHtml
            + (a.direct ? ' ' + penBadge('warn', '站长直接分配') : '')
            + '</div>'
            + '<div class="user-email">申请人: ' + escAdmin(a.applicantUsername || '-')
            + '（ID ' + escAdmin(a.applicantUserId) + '）</div>'
            + (a.reason ? '<div class="user-email">理由: ' + escAdmin(a.reason) + '</div>' : '')
            + '<div class="user-email">提交: ' + escAdmin(a.createdAt || '-')
            + (a.decidedAt ? '　｜ 审批: ' + escAdmin(a.decidedAt) + '（操作人 ID ' + escAdmin(a.decidedBy) + '）' : '')
            + (a.code ? '　｜ 编号: ' + escAdmin(a.code) : '')
            + '</div>'
            + (a.decisionNote ? '<div class="user-email">审批备注: ' + escAdmin(a.decisionNote) + '</div>' : '')
            + '</div>';
        if (isSuper && a.status === 'pending') {
            html += '<div class="user-actions" style="flex-wrap:wrap;">'
                + '<input type="text" data-app-note="' + idx + '" placeholder="审批备注（可选）" style="' + inputStyle + 'width:180px;">'
                + '<button class="action-btn edit" data-app-approve="' + idx + '">通过</button>'
                + '<button class="action-btn delete" data-app-reject="' + idx + '">驳回</button>'
                + '</div>';
        }
        html += '</div>';
    });
    area.innerHTML = html;
}

function onPentestCodeClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    function split(v) {
        const p = String(v || '').split('|');
        return { idx: Number(p[0]), taskId: Number(p[1]) };
    }
    if (btn.hasAttribute('data-pentest-tasks')) {
        const idx = Number(btn.getAttribute('data-pentest-tasks'));
        const panel = document.querySelector('[data-pentest-panel="' + idx + '"]');
        if (!panel) return;
        if (panel.style.display === 'none') {
            panel.innerHTML = pentestPanelHTML(idx);
            panel.style.display = 'block';
            btn.textContent = '收起任务';
        } else {
            panel.style.display = 'none';
            const c = pentestData.codes[idx];
            btn.textContent = '任务 (' + ((c && c.tasks ? c.tasks.length : 0)) + ')';
        }
        return;
    }
    if (btn.hasAttribute('data-pentest-reset')) { doPentestReset(Number(btn.getAttribute('data-pentest-reset'))); return; }
    if (btn.hasAttribute('data-pentest-revoke')) { doPentestRevoke(Number(btn.getAttribute('data-pentest-revoke'))); return; }
    if (btn.hasAttribute('data-task-save')) { doPentestTaskSave(split(btn.getAttribute('data-task-save')), btn); return; }
    if (btn.hasAttribute('data-task-del')) { doPentestTaskDelete(split(btn.getAttribute('data-task-del'))); return; }
    if (btn.hasAttribute('data-task-add')) { doPentestTaskAdd(Number(btn.getAttribute('data-task-add'))); return; }
}

function onPentestAppClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.hasAttribute('data-app-approve')) { doPentestApprove(Number(btn.getAttribute('data-app-approve'))); return; }
    if (btn.hasAttribute('data-app-reject')) { doPentestReject(Number(btn.getAttribute('data-app-reject'))); return; }
}

function doPentestReset(idx) {
    const c = pentestData.codes[idx];
    if (!c) return;
    const loose = !c.accountExists;
    if (!confirm('确定重置编号 ' + c.code + ' 吗？\n'
        + (loose ? '该编号当前悬空（绑定账号已不存在），重置会把编号重新绑到一个全新账号上。\n'
            : '旧测试账号会被立即销毁，编号不变，换发一个全新账号。\n')
        + '新密码只显示一次，请准备好转交给测试者。')) return;
    ZIYIT_API.adminPentestReset(c.code).then(function (data) {
        showPentestPassword(data);
        reloadPentestKeepPanel(null);
    }).catch(function (err) {
        alert('重置失败: ' + pentestErr(err));
    });
}

function doPentestRevoke(idx) {
    const c = pentestData.codes[idx];
    if (!c) return;
    const reason = prompt('吊销编号 ' + c.code + ' 的原因（可留空）：', '');
    if (reason === null) return;
    if (!confirm('确定吊销编号 ' + c.code + ' 吗？\n测试账号会被立即物理删除（编号记录保留为「已吊销」供审计）。')) return;
    ZIYIT_API.adminPentestRevoke(c.code, reason).then(function (res) {
        alert((res && res.message) || '编号已吊销');
        reloadPentestKeepPanel(idx);
    }).catch(function (err) {
        alert('吊销失败: ' + pentestErr(err));
    });
}

function doPentestTaskAdd(idx) {
    const c = pentestData.codes[idx];
    if (!c) return;
    const titleEl = document.querySelector('[data-task-new-title="' + idx + '"]');
    const detailEl = document.querySelector('[data-task-new-detail="' + idx + '"]');
    const title = titleEl ? titleEl.value.trim() : '';
    const detail = detailEl ? detailEl.value.trim() : '';
    if (!title) { alert('请填写任务标题'); return; }
    ZIYIT_API.adminPentestTaskAdd(c.code, title, detail).then(function () {
        reloadPentestKeepPanel(idx);
    }).catch(function (err) {
        alert('派任务失败: ' + pentestErr(err));
    });
}

function doPentestTaskSave(ref, btn) {
    const c = pentestData.codes[ref.idx];
    if (!c) return;
    const key = ref.idx + '|' + ref.taskId;
    const statusEl = document.querySelector('[data-task-status="' + key + '"]');
    const noteEl = document.querySelector('[data-task-note="' + key + '"]');
    if (btn) btn.disabled = true;
    ZIYIT_API.adminPentestTaskUpdate(c.code, ref.taskId, {
        status: statusEl ? statusEl.value : '',
        note: noteEl ? noteEl.value.trim() : ''
    }).then(function () {
        reloadPentestKeepPanel(ref.idx);
    }).catch(function (err) {
        alert('保存失败: ' + pentestErr(err));
        if (btn) btn.disabled = false;
    });
}

function doPentestTaskDelete(ref) {
    const c = pentestData.codes[ref.idx];
    if (!c) return;
    if (!confirm('确定删除编号 ' + c.code + ' 下的任务 #' + ref.taskId + ' 吗？')) return;
    ZIYIT_API.adminPentestTaskDelete(c.code, ref.taskId).then(function () {
        reloadPentestKeepPanel(ref.idx);
    }).catch(function (err) {
        alert('删除失败: ' + pentestErr(err));
    });
}

function doPentestApprove(idx) {
    const a = pentestData.applications[idx];
    if (!a) return;
    const noteEl = document.querySelector('[data-app-note="' + idx + '"]');
    const note = noteEl ? noteEl.value.trim() : '';
    if (!confirm('确定通过申请 #' + a.id + '（申请人 ' + (a.applicantUsername || a.applicantUserId)
        + '）吗？\n通过后会立即创建渗透测试账号，初始密码只显示一次。')) return;
    ZIYIT_API.adminPentestApprove(a.id, note).then(function (data) {
        showPentestPassword(data);
        loadPentest();
    }).catch(function (err) {
        alert('审批失败: ' + pentestErr(err));
    });
}

function doPentestReject(idx) {
    const a = pentestData.applications[idx];
    if (!a) return;
    const noteEl = document.querySelector('[data-app-note="' + idx + '"]');
    const note = noteEl ? noteEl.value.trim() : '';
    if (!confirm('确定驳回申请 #' + a.id + '（申请人 ' + (a.applicantUsername || a.applicantUserId) + '）吗？')) return;
    ZIYIT_API.adminPentestReject(a.id, note).then(function (res) {
        alert((res && res.message) || '申请已驳回');
        loadPentest();
    }).catch(function (err) {
        alert('驳回失败: ' + pentestErr(err));
    });
}

function doPentestAssign() {
    const uidEl = document.getElementById('pentest-assign-uid');
    const reasonEl = document.getElementById('pentest-assign-reason');
    const noteEl = document.getElementById('pentest-assign-note');
    const uid = Number(uidEl.value);
    if (!uid) { alert('请填写申请人的用户 ID'); return; }
    if (!confirm('确定为用户 ID ' + uid + ' 直接分配一个渗透测试账号吗？\n初始密码只显示一次。')) return;
    const btn = document.getElementById('pentest-assign-btn');
    btn.disabled = true;
    ZIYIT_API.adminPentestAssign(uid, reasonEl.value.trim(), noteEl.value.trim()).then(function (data) {
        showPentestPassword(data);
        uidEl.value = '';
        reasonEl.value = '';
        noteEl.value = '';
        loadPentest();
    }).catch(function (err) {
        alert('分配失败: ' + pentestErr(err));
    }).finally(function () {
        btn.disabled = false;
    });
}

 
 
function showPentestPassword(data) {
    document.getElementById('pentest-pw-code').value = (data && data.code) || '';
    document.getElementById('pentest-pw-username').value = (data && data.username) || '';
    document.getElementById('pentest-pw-password').value = (data && data.password) || '';
    document.getElementById('pentest-pw-notice').textContent = (data && data.passwordNotice) || '';
    document.getElementById('pentest-password-modal').classList.add('active');
}

function closePentestPasswordModal() {
    document.getElementById('pentest-pw-code').value = '';
    document.getElementById('pentest-pw-username').value = '';
    document.getElementById('pentest-pw-password').value = '';
    document.getElementById('pentest-pw-notice').textContent = '';
    document.getElementById('pentest-password-modal').classList.remove('active');
}

function copyPentestPassword() {
    const code = document.getElementById('pentest-pw-code').value;
    const username = document.getElementById('pentest-pw-username').value;
    const password = document.getElementById('pentest-pw-password').value;
    if (!password) { alert('没有可复制的密码'); return; }
    const text = '渗透测试账号（编号 ' + code + '）\n用户名: ' + username + '\n初始密码: ' + password
        + '\n该密码只显示一次，请立刻使用或转交。';
    const btn = document.getElementById('pentest-pw-copy');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
            const old = btn.textContent;
            btn.textContent = '已复制';
            setTimeout(function () { btn.textContent = old; }, 1500);
        }, function () {
            alert('复制失败，请手动选中后复制');
        });
    } else {
        alert('当前浏览器不支持自动复制，请手动选中后复制');
    }
}

function openAddKey(u) {
    keyTargetUser = u;
    const userId = u.userId != null ? u.userId : (u.user_id != null ? u.user_id : '-');
    document.getElementById('key-userinfo').value = (u.username || u.userName || '') + '（ID: ' + userId + '）';
    document.getElementById('key-plain').value = '';
    document.getElementById('key-permission').value = 'Pr';
    document.getElementById('key-valid-days').value = '365';
    document.getElementById('key-add-modal').classList.add('active');
}

function saveKeyAdd() {
    if (!keyTargetUser) return;
    const userId = keyTargetUser.userId != null ? keyTargetUser.userId : keyTargetUser.user_id;
     
    const productKey = document.getElementById('key-plain').value.trim();
    if (!productKey) {
        alert('请输入明文密钥');
        return;
    }
    const permission = document.getElementById('key-permission').value;
    const validDays = parseInt(document.getElementById('key-valid-days').value, 10) || 365;
    ZIYIT_API.request('/admin/users/' + userId + '/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productKey: productKey, permission: permission, validDays: validDays })
    }).then(function (data) {
        alert('密钥已添加：' + ((data && data.productKey) || productKey));
        document.getElementById('key-add-modal').classList.remove('active');
        loadRcKeys();
    }).catch(function (err) {
        alert('添加失败: ' + (err.message || err));
    });
}

 
function removeKey(userId, permission) {
    if (!confirm('确定移除该用户权限为 ' + permission + ' 的密钥吗？\n移除后该用户需重新获取密钥才能继续使用。')) return;
    ZIYIT_API.request('/admin/users/' + userId + '/keys/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: permission })
    }).then(function () {
        alert('密钥已移除');
        loadRcKeys();
    }).catch(function (err) {
        alert('移除失败: ' + (err.message || err));
    });
}

function confirmDeleteUser() {
    if (!deletingUser) return;
    const mode = document.querySelector('input[name="delMode"]:checked');
    const isGrace = mode && mode.value === 'grace';
    const btn = document.getElementById('confirm-delete-user');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-inline"></span>删除中...';
    ZIYIT_API.request('/admin/users/' + deletingUser.userId, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soft: isGrace })
    }).then(function (data) {
        alert(deletingUser.username + (isGrace ? ' 已进入 15 天注销宽限期' : ' 已被立即删除'));
        closeDeleteUserModal();
        loadUsers();
    }).catch(function (err) {
        alert('删除失败: ' + (err.message || err));
    }).finally(function () {
         
        btn.disabled = false;
        btn.innerHTML = '确认删除';
    });
}

function openAddUserModal() {
    document.getElementById('add-user-form').reset();
    document.getElementById('add-user-modal').classList.add('active');
}

function closeAddUserModal() {
    document.getElementById('add-user-modal').classList.remove('active');
}

function saveAddUser(e) {
    e.preventDefault();
    const username = document.getElementById('add-username').value.trim();
    const email = document.getElementById('add-email').value.trim();
    const password = document.getElementById('add-password').value;

    if (!username || !password) {
        alert('用户名和密码必填');
        return;
    }

    const md5pwd = (typeof CryptoJS !== 'undefined') ? CryptoJS.MD5(password).toString(CryptoJS.enc.Base64) : password;
    ZIYIT_API.register(username, email || 'noemail@example.com', md5pwd).then(function () {
        alert('用户 ' + username + ' 创建成功');
        closeAddUserModal();
        loadUsers();
    }).catch(function (err) {
        let msg = (err && err.message) || '创建失败';
        if (err && err.status === 409) msg = '用户名已存在';
        else if (err && err.data && err.data.detail) msg = '创建失败: ' + err.data.detail;
        alert(msg);
    });
}

 
document.addEventListener('DOMContentLoaded', function () {
     
    loadOnlineStats();
    setInterval(loadOnlineStats, 30000);

     
    document.getElementById('refresh-users').addEventListener('click', function () {
        loadUsers();
        updateSystemInfo('用户列表已刷新');
    });

     
    document.getElementById('admin-ban-ip-btn').addEventListener('click', function () {
        const ip = document.getElementById('ip-ban-input').value.trim();
        const reason = document.getElementById('ip-reason-input').value.trim();
        const durVal = document.getElementById('ip-ban-duration').value.trim();
        const durationMinutes = durVal ? Math.max(1, parseInt(durVal, 10) || 0) : 0;
        if (!ip) { alert('请输入要封禁的 IP'); return; }
        const durTip = durationMinutes > 0 ? ('时长：' + durationMinutes + ' 分钟') : '永久封禁';
        if (!confirm('确定封禁 IP ' + ip + ' 吗？' + (reason ? '（原因：' + reason + '）' : '') + '（' + durTip + '）')) return;
        ZIYIT_API.adminBanIp(ip, reason || undefined, durationMinutes || undefined).then(function () {
            alert('已封禁 ' + ip + '（' + durTip + '）');
            document.getElementById('ip-ban-input').value = '';
            document.getElementById('ip-reason-input').value = '';
            document.getElementById('ip-ban-duration').value = '';
            loadIpBans();
        }).catch(function (err) {
            alert((err && err.data && err.data.detail) || '封禁失败');
        });
    });
    document.getElementById('admin-unban-ip-btn').addEventListener('click', function () {
        const ip = document.getElementById('ip-ban-input').value.trim();
        if (!ip) { alert('请输入要解封的 IP'); return; }
        if (!confirm('确定解封 IP ' + ip + ' 吗？')) return;
        ZIYIT_API.adminUnbanIp(ip).then(function () {
            alert('已解封 ' + ip);
            document.getElementById('ip-ban-input').value = '';
            loadIpBans();
        }).catch(function (err) {
            alert((err && err.data && err.data.detail) || '解封失败');
        });
    });
    document.getElementById('refresh-ip-bans').addEventListener('click', function () {
        loadIpBans();
        updateSystemInfo('IP 封禁列表已刷新');
    });

     
    document.getElementById('user-search').addEventListener('input', searchUsers);

     
    document.getElementById('export-users').addEventListener('click', exportUsers);

     
    document.getElementById('user-form').addEventListener('submit', saveEditUser);
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    document.getElementById('user-modal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeEditModal();
        }
    });

     
    document.getElementById('add-user-btn').addEventListener('click', openAddUserModal);
    document.getElementById('add-user-form').addEventListener('submit', saveAddUser);
    document.getElementById('cancel-add-user').addEventListener('click', closeAddUserModal);
    document.getElementById('add-user-modal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeAddUserModal();
        }
    });

     
    document.getElementById('confirm-delete-user').addEventListener('click', confirmDeleteUser);
    document.getElementById('cancel-delete-user').addEventListener('click', closeDeleteUserModal);
    document.getElementById('cancel-login-history').addEventListener('click', closeLoginHistory);
    document.getElementById('delete-user-modal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeDeleteUserModal();
        }
    });
    document.getElementById('login-history-modal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeLoginHistory();
        }
    });

     
    document.getElementById('confirm-grant-dlc').addEventListener('click', grantDlc);
    document.getElementById('cancel-dlc').addEventListener('click', closeDlcManager);
    document.getElementById('dlc-modal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeDlcManager();
        }
    });

     
    document.getElementById('confirm-api-key').addEventListener('click', createApiKey);
    document.getElementById('cancel-api-key').addEventListener('click', function () {
        document.getElementById('api-key-modal').classList.remove('active');
    });
    document.getElementById('confirm-api-key-edit').addEventListener('click', saveApiKeyEdit);
    document.getElementById('cancel-api-key-edit').addEventListener('click', function () {
        document.getElementById('api-key-edit-modal').classList.remove('active');
    });
    document.getElementById('apikey-edit-daily-unlimited').addEventListener('change', setEditDailyDisabled);
    document.getElementById('apikey-edit-allow-phantom').addEventListener('change', syncHumanModeOptions);
    document.getElementById('apikey-edit-allow-pow').addEventListener('change', syncHumanModeOptions);
    document.getElementById('apikey-new-allow-phantom').addEventListener('change', syncNewHumanModeOptions);
    document.getElementById('apikey-new-allow-pow').addEventListener('change', syncNewHumanModeOptions);

     
    document.getElementById('confirm-mod').addEventListener('click', saveMod);
    document.getElementById('cancel-mod').addEventListener('click', function () {
        document.getElementById('mod-modal').classList.remove('active');
    });

     
    document.getElementById('confirm-key-add').addEventListener('click', saveKeyAdd);
    document.getElementById('cancel-key-add').addEventListener('click', function () {
        document.getElementById('key-add-modal').classList.remove('active');
    });

     
    ['api-key-modal', 'api-key-edit-modal', 'mod-modal', 'key-add-modal'].forEach(function (id) {
        document.getElementById(id).addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
});

 
function updateSystemInfo(message) {
    const lastUpdate = document.getElementById('last-update');
    const now = new Date();
    lastUpdate.textContent = now.toLocaleTimeString();

    console.log(`[系统] ${message}`);
}

 
function fmtBytes(bytes, digits) {
    digits = digits === undefined ? 1 : digits;
    if (bytes === null || bytes === undefined || isNaN(bytes)) return '-';
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(digits) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(digits) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(digits) + ' KB';
    return bytes + ' B';
}

 
function fmtServerTime(st) {
    if (st == null || st === '') return '';
    if (typeof st === 'number') {
        const ms = st < 1e12 ? st * 1000 : st;  
        const d = new Date(ms);
        return isNaN(d.getTime()) ? String(st) : d.toLocaleString();
    }
    if (typeof st === 'string') {
         
        const m = st.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
        if (m) {
            const p = function (n) { return n < 10 ? '0' + n : '' + n; };
            let txt = m[1] + '-' + p(+m[2]) + '-' + p(+m[3]) + ' ' + p(+m[4]) + ':' + p(+m[5]);
            if (m[6]) txt += ':' + p(+m[6]);
            return txt;
        }
        return st;
    }
    return String(st);
}

 
let serverStatsTimer = null;
function loadServerStats() {
    ZIYIT_API.request('/admin/server/stats', null, 0, false, true).then(function (res) {
        const data = res && res.data ? res.data : res;
        if (!data) return;

         
        const serverTimeEl = document.getElementById('server-time');
        if (serverTimeEl) {
            const st = data.server_time || data.serverTime || data.timestamp || data.time || data.current_time || data.datetime || data.date;
            if (st != null && st !== '') {
                serverTimeEl.textContent = fmtServerTime(st);
            } else if (res && res.date) {
                 
                const d = new Date(res.date);
                if (!isNaN(d.getTime())) serverTimeEl.textContent = d.toUTCString().replace('GMT', 'UTC');
            }
        }

        const mem = data.memory || {};
        const memoryUsage = document.getElementById('memory-usage');
        if (memoryUsage && mem.used !== undefined && mem.total !== undefined) {
            memoryUsage.textContent = fmtBytes(mem.used) + ' / ' + fmtBytes(mem.total) + ' (' + (mem.percent !== undefined ? mem.percent : '-') + '%)';
        }

        const cpu = data.cpu || {};
        const cpuLoad = document.getElementById('cpu-load');
        if (cpuLoad && cpu.percent !== undefined) {
            let txt = cpu.percent + '%';
            if (cpu.count !== undefined) txt += '（' + cpu.count + ' 核';
            if (cpu.frequency_mhz !== undefined) txt += ' ' + (cpu.frequency_mhz / 1000).toFixed(2) + ' GHz';
            if (cpu.count !== undefined) txt += '）';
            cpuLoad.textContent = txt;
        }

        const disk = data.disk || {};
        const diskUsage = document.getElementById('disk-usage');
        if (diskUsage && disk.used !== undefined && disk.total !== undefined) {
            diskUsage.textContent = fmtBytes(disk.used) + ' / ' + fmtBytes(disk.total) + ' (' + (disk.percent !== undefined ? disk.percent : '-') + '%)';
        }

        const net = data.network || {};
        const networkSpeed = document.getElementById('network-speed');
        if (networkSpeed && (net.recv_bytes_per_sec !== undefined || net.sent_bytes_per_sec !== undefined)) {
            networkSpeed.textContent = '↓ ' + fmtBytes(net.recv_bytes_per_sec || 0, 0) + '/s  ↑ ' + fmtBytes(net.sent_bytes_per_sec || 0, 0) + '/s';
        }
    }).catch(function () {
        const memoryUsage = document.getElementById('memory-usage');
        if (memoryUsage) memoryUsage.textContent = '获取失败';
        const cpuLoad = document.getElementById('cpu-load');
        if (cpuLoad) cpuLoad.textContent = '获取失败';
        const diskUsage = document.getElementById('disk-usage');
        if (diskUsage) diskUsage.textContent = '获取失败';
        const networkSpeed = document.getElementById('network-speed');
        if (networkSpeed) networkSpeed.textContent = '获取失败';
    });
}

 
let adminList = [];
let editingAdmin = null;

function openAddAdminModal() {
    if (!canAccess(4)) { alert('仅 4 级超级管理员可添加管理员'); return; }
    document.getElementById('admin-add-userId').value = '';
    document.getElementById('admin-add-level').value = '3';
    document.getElementById('admin-add-modal').classList.add('active');
}

function closeAdminAddModal() {
    document.getElementById('admin-add-modal').classList.remove('active');
}

function openAdminEditModal(admin) {
    if (!canAccess(4)) { alert('仅 4 级超级管理员可编辑管理员'); return; }
    editingAdmin = admin;
    const isSuper = admin.userId === 1 || admin.id === 1 || String(admin.type || '').toLowerCase() === 'adminstrator';
    document.getElementById('admin-edit-username').value = admin.username || admin.name || '-';
    const levelSel = document.getElementById('admin-edit-level');
    levelSel.value = String(admin.level || 1);
     
    levelSel.disabled = isSuper;
    document.getElementById('admin-edit-modal').classList.add('active');
}

function closeAdminEditModal() {
    document.getElementById('admin-edit-modal').classList.remove('active');
}

function adminFields(a) {
    if (!a) return {};
    const uid = a.userId != null ? a.userId : (a.user_id != null ? a.user_id : (a.id != null ? a.id : ''));
    const uname = a.username || a.userName || a.name || a.Username || a.UserName || a.USERNAME || a.Name || a.nickname || a.nickName;
    return {
        userId: uid !== '' && uid != null ? uid : '-',
         
        username: uname || (uid !== '' && uid != null ? 'ID ' + uid : '-'),
        level: a.level != null ? Number(a.level) : 1,
        type: a.type || a.role || a.permission || a.user_type || a.Permission || ''
    };
}

function loadAdmins() {
    const area = document.getElementById('admin-list');
    if (area) area.innerHTML = loadingHTML();
    return ZIYIT_API.adminListAdmins().then(function (data) {
        adminList = Array.isArray(data) ? data
            : (data && (data.admins || data.list || data.items || data.result || data.data || data.records)) || [];
        if (!Array.isArray(adminList)) adminList = [];
         
         
        const myLevel = currentAdminLevel || 4;
        const existLevels = {};
        adminList.forEach(function (a) {
            const lv = Number(adminFields(a).level);
            if (lv >= 1 && lv <= 4) existLevels[lv] = true;
        });
        let higherLevel = 0;
        for (let lv = myLevel + 1; lv <= 4; lv++) {
            if (existLevels[lv]) { higherLevel = lv; break; }
        }
        adminList = adminList.filter(function (a) {
            const lv = Number(adminFields(a).level);
            return lv <= myLevel || lv === higherLevel;
        });
        renderAdmins();
        // v1.31：补拉未知管理员头像（/admin/admins 不返回 avatarUrl），完成后自动重渲染
        hydrateAdminAvatars(adminList);
        const total = document.getElementById('admin-total');
        if (total) total.textContent = adminList.length;
        const superCount = document.getElementById('admin-super-count');
        if (superCount) superCount.textContent = adminList.filter(function (a) { return Number(adminFields(a).level) === 4; }).length;
    }).catch(function (err) {
        const area = document.getElementById('admin-list');
        if (area) area.innerHTML = '<p style="padding: 20px; color: var(--ziyit-danger);">加载失败: ' + escAdmin(err.message || err) + '</p>';
    });
}

function renderAdmins() {
    const search = (document.getElementById('admin-search').value || '').trim().toLowerCase();
    const area = document.getElementById('admin-list');
    const list = adminList.filter(function (a) {
        if (!search) return true;
        const f = adminFields(a);
        return String(f.username).toLowerCase().indexOf(search) !== -1 ||
            String(f.userId).toLowerCase().indexOf(search) !== -1 ||
            String(f.level).indexOf(search) !== -1;
    });
    if (!list.length) {
        area.innerHTML = '<p style="padding: 20px; color: var(--ziyit-text-secondary);">暂无管理员数据</p>';
        return;
    }
    let html = '';
    const meId = currentAdminInfo && (currentAdminInfo.userId != null ? currentAdminInfo.userId : currentAdminInfo.id);
    list.forEach(function (a) {
        const f = adminFields(a);
        const isSelf = meId != null && String(f.userId) === String(meId);
        const isSuper = f.userId === 1 || String(f.type).toLowerCase() === 'adminstrator';
        const levelCls = f.level === 4 ? 'normal' : (f.level === 3 ? 'edit' : 'banned');
        const avatarUrl = adminAvatarOf(f.userId) || DEFAULT_AVATAR;
        // v1.31：展示管理员头像；当前登录管理员加高亮边框 + 「当前登录」角标
        html += '<div class="user-item wide-item' + (isSelf ? ' self-admin' : '') + '">'
            + '<img class="user-avatar-small" data-avatar-uid="' + escAdmin(f.userId) + '" alt="' + escAdmin(f.username) + ' 的头像" src="' + escAdmin(avatarUrl) + '">'
            + '<div class="user-details">'
            + '<div class="user-name">' + escAdmin(f.username)
            + (isSelf ? '<span class="user-badge-self">当前登录</span>' : '') + '</div>'
            + '<div class="user-type ' + levelCls + '">' + adminLevelName(f.level) + '（Lv.' + f.level + '）</div>'
            + '<div class="user-del-date">ID: ' + escAdmin(f.userId)
            + (f.type ? ' ｜ 类型: ' + escAdmin(f.type) : '')
            + '</div>'
            + '</div><div class="user-actions">'
            + (String(f.userId) !== String(meId) ? '<button class="action-btn" data-act="chat" data-idx="' + adminList.indexOf(a) + '">私聊</button>' : '')
            + (canAccess(4) ? '<button class="action-btn edit" data-act="edit" data-idx="' + adminList.indexOf(a) + '">编辑</button>'
                + (isSuper ? '' : '<button class="action-btn delete" data-act="del" data-idx="' + adminList.indexOf(a) + '">撤销</button>') : '')
            + '</div></div>';
    });
    area.innerHTML = html;
    area.querySelectorAll('img.user-avatar-small[data-avatar-uid]').forEach(function (img) {
        const uid = img.getAttribute('data-avatar-uid');
        const url = adminAvatarOf(uid);
        if (url) ZIYIT_API.applyImage(img, url, DEFAULT_AVATAR).catch(function () { });
    });
    area.querySelectorAll('[data-act]').forEach(function (btn) {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const a = adminList[idx];
        if (!a) return;
        btn.addEventListener('click', function () {
            if (btn.getAttribute('data-act') === 'edit') openAdminEditModal(a);
            else if (btn.getAttribute('data-act') === 'chat') openChatWith(a);
            else removeAdmin(a);
        });
    });
}

function confirmAddAdmin() {
    const userId = document.getElementById('admin-add-userId').value.trim();
    const level = parseInt(document.getElementById('admin-add-level').value, 10);
    if (!userId) { alert('请输入用户ID'); return; }
    if (!canAccess(4)) { alert('仅 4 级超级管理员可添加管理员'); return; }
    const btn = document.getElementById('confirm-admin-add');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-inline"></span>提交中...';
    ZIYIT_API.adminAddAdmin(userId, level).then(function () {
        alert('管理员添加成功');
        closeAdminAddModal();
        loadAdmins();
    }).catch(function (err) {
        alert('添加失败: ' + ((err && err.data && err.data.detail) || (err && err.message) || err));
    }).finally(function () {
        btn.disabled = false;
        btn.innerHTML = '添加';
    });
}

function confirmEditAdmin() {
    if (!editingAdmin) return;
    const username = editingAdmin.username || editingAdmin.name || '';
    const level = parseInt(document.getElementById('admin-edit-level').value, 10);
    if (!canAccess(4)) { alert('仅 4 级超级管理员可编辑管理员'); return; }
    const f = adminFields(editingAdmin);
    if (f.userId === 1) { alert('超级管理员（ID=1）不可修改'); return; }
    const btn = document.getElementById('confirm-admin-edit');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-inline"></span>保存中...';
    ZIYIT_API.adminUpdateAdmin(f.userId, level).then(function () {
        alert(username + ' 等级已更新为 Lv.' + level);
        closeAdminEditModal();
        loadAdmins();
    }).catch(function (err) {
        alert('更新失败: ' + ((err && err.data && err.data.detail) || (err && err.message) || err));
    }).finally(function () {
        btn.disabled = false;
        btn.innerHTML = '保存';
    });
}

function removeAdmin(admin) {
    if (!canAccess(4)) { alert('仅 4 级超级管理员可撤销管理员'); return; }
    const f = adminFields(admin);
    const name = f.username;
    if (f.userId === 1) { alert('超级管理员（ID=1）不可撤销'); return; }
    if (!confirm('确定撤销 ' + name + ' 的管理员权限吗？')) return;
    ZIYIT_API.adminRemoveAdmin(f.userId).then(function () {
        alert(name + ' 已撤销管理员权限');
        loadAdmins();
    }).catch(function (err) {
        alert('撤销失败: ' + ((err && err.data && err.data.detail) || (err && err.message) || err));
    });
}

 
let backroomsMembers = [];

function loadBackroomsMembers() {
    const area = document.getElementById('backrooms-member-list');
    if (area) area.innerHTML = loadingHTML();
    return ZIYIT_API.adminListBackroomsMembers().then(function (data) {
         
        const norm = data || {};
        const ids = norm.ID || norm.id || norm.Id || norm.ids || norm.userIds || norm.UserIds || norm.usernames || norm.names || [];
        const perms = norm.Permission || norm.permission || norm.permissions || norm.Permissions || [];
        const emails = norm.Email || norm.email || norm.emails || norm.Emails || [];
        backroomsMembers = [];
        const max = Math.max(ids.length, perms.length, emails.length);
        for (let i = 0; i < max; i++) {
            backroomsMembers.push({
                id: ids[i] != null ? ids[i] : '',
                permission: perms[i] != null ? perms[i] : '',
                email: emails[i] != null ? emails[i] : ''
            });
        }
         
        if (!max && Array.isArray(data)) {
            backroomsMembers = data.map(function (m) {
                return {
                    id: m.ID || m.id || m.userId || m.user_id || m.Username || m.username || m.name || '',
                    permission: m.Permission || m.permission || m.type || m.role || '',
                    email: m.Email || m.email || ''
                };
            });
        }
        renderBackroomsMembers();
        const total = document.getElementById('member-total');
        if (total) total.textContent = backroomsMembers.length;
    }).catch(function (err) {
        const area = document.getElementById('backrooms-member-list');
        if (area) area.innerHTML = '<p style="padding: 20px; color: var(--ziyit-danger);">加载失败: ' + escAdmin(err.message || err) + '</p>';
    });
}

function renderBackroomsMembers() {
    const search = (document.getElementById('backrooms-member-search').value || '').trim().toLowerCase();
    const area = document.getElementById('backrooms-member-list');
    const list = backroomsMembers.filter(function (m) {
        if (!search) return true;
        return String(m.id).toLowerCase().indexOf(search) !== -1 ||
            String(m.permission).toLowerCase().indexOf(search) !== -1 ||
            String(m.email).toLowerCase().indexOf(search) !== -1;
    });
    if (!list.length) {
        area.innerHTML = '<p style="padding: 20px; color: var(--ziyit-text-secondary);">暂无后室成员数据</p>';
        return;
    }
    let html = '';
    list.forEach(function (m, idx) {
        const isLocked = String(m.permission).toLowerCase() === 'adminstrator';
        const permCls = isLocked ? 'banned' : 'normal';
        html += '<div class="user-item wide-item"><div class="user-details">'
            + '<div class="user-name">ID ' + escAdmin(m.id) + '</div>'
            + '<div class="user-type ' + permCls + '">' + escAdmin(m.permission || '未知') + '</div>'
            + (m.email ? '<div class="user-email">' + escAdmin(m.email) + '</div>' : '')
            + '</div><div class="user-actions">'
            + (canAccess(3) && !isLocked
                ? '<select class="form-select member-perm" data-idx="' + idx + '" style="width: auto; min-width: 110px; padding: 6px 8px;">'
                    + '<option value="Member"' + (m.permission === 'Member' ? ' selected' : '') + '>Member</option>'
                    + '<option value="Admin"' + (m.permission === 'Admin' ? ' selected' : '') + '>Admin</option>'
                    + '</select>'
                : '<span class="user-status ' + permCls + '" style="margin: 0;">' + (isLocked ? '不可编辑' : (canAccess(2) ? '只读' : '')) + '</span>')
            + '</div></div>';
    });
    area.innerHTML = html;
     
    if (canAccess(3)) {
        area.querySelectorAll('.member-perm').forEach(function (sel) {
            sel.addEventListener('change', function () {
                const m = list[parseInt(sel.getAttribute('data-idx'), 10)];
                if (!m) return;
                sel.disabled = true;
                ZIYIT_API.adminUpdateBackroomsMember(m.id, sel.value).then(function () {
                    m.permission = sel.value;
                    loadBackroomsMembers();
                }).catch(function (err) {
                    alert('修改失败: ' + ((err && err.data && err.data.detail) || (err && err.message) || err));
                    sel.disabled = false;
                });
            });
        });
    }
}

 
let promoteTarget = null;

function openPromoteModal(user) {
    if (!canAccess(4)) { alert('仅 4 级超级管理员可升级用户'); return; }
    promoteTarget = user;
    document.getElementById('promote-username').value = user.username || '-';
    document.getElementById('promote-type').value = 'vip';
    document.getElementById('promote-days').value = '0';
    syncPromoteFields();
    document.getElementById('promote-user-modal').classList.add('active');
}

// 「有效期（天）」只在升级为 VIP 时有意义（升级管理员走 level，不走天数）。
function syncPromoteFields() {
    var isVip = document.getElementById('promote-type').value === 'vip';
    document.getElementById('promote-days-group').style.display = isVip ? '' : 'none';
}

function closePromoteModal() {
    document.getElementById('promote-user-modal').classList.remove('active');
    promoteTarget = null;
}

function confirmPromoteUser() {
    if (!promoteTarget) return;
    const type = document.getElementById('promote-type').value;
    const userId = promoteTarget.userId;
    // 有效期天数：留空按 0（永久）处理；只接受 0-36500 的整数，越界/非数字当场拦下（与后端口径一致）。
    let days = null;
    if (type === 'vip') {
        const raw = document.getElementById('promote-days').value.trim();
        days = raw === '' ? 0 : Number(raw);
        if (!Number.isInteger(days) || days < 0 || days > 36500) {
            alert('有效期天数不合法：0 表示永久，或填 1-36500 的整数');
            return;
        }
    }
    const btn = document.getElementById('confirm-promote-user');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-inline"></span>提交中...';
    ZIYIT_API.adminPromoteUser(userId, type, days).then(function (res) {
        const done = type === 'admin'
            ? '管理员'
            : (days === 0 ? '永久 VIP' : days + ' 天 VIP');
        alert(promoteTarget.username + ' 已升级为' + done
            + (res && res.vipExpireAt ? '（到期 ' + res.vipExpireAt + '）' : ''));
        closePromoteModal();
        loadUsers();
    }).catch(function (err) {
        alert('升级失败: ' + ((err && err.data && err.data.detail) || (err && err.message) || err));
    }).finally(function () {
        btn.disabled = false;
        btn.innerHTML = '确认升级';
    });
}

 
 
 
 
const CHAT_COOKIE_MAX = 40;        
const CHAT_COOKIE_BYTES = 3500;    
let chatData = {};                 
let chatActivePeer = null;         
let chatPollTimer = null;

function chatGetCookie(name) {
    const value = '; ' + document.cookie;
    const parts = value.split('; ' + name + '=');
    if (parts.length === 2) {
        try { return JSON.parse(decodeURIComponent(parts.pop().split(';').shift())); } catch (e) { return []; }
    }
    return [];
}

function chatSetCookie(name, arr) {
    arr = arr.slice();
    while (arr.length > CHAT_COOKIE_MAX) arr.shift();
    let s = JSON.stringify(arr);
    while (s.length > CHAT_COOKIE_BYTES && arr.length) { arr.shift(); s = JSON.stringify(arr); }
    const exp = new Date(Date.now() + 30 * 24 * 3600 * 1000).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(s) + '; expires=' + exp + '; path=/';
}

 
function chatSortMsgs(arr) {
    if (!Array.isArray(arr)) return arr;
    arr.sort(function (a, b) {
        const ta = a && a.sentAt ? Date.parse(a.sentAt) : NaN;
        const tb = b && b.sentAt ? Date.parse(b.sentAt) : NaN;
        if (isNaN(ta) && isNaN(tb)) return 0;
        if (isNaN(ta)) return 1;
        if (isNaN(tb)) return -1;
        return ta - tb;
    });
    return arr;
}

 
function chatAddMsg(m, persist) {
    const peerId = m.broadcast ? 'broadcast' : (m.mine ? m.toUserId : m.fromUserId);
    const peerName = m.broadcast ? '系统广播'
        : (m.mine ? (m.toUsername || peerId) : (m.fromUsername || peerId));
    const key = 'peer:' + peerId;
    if (!chatData[key]) chatData[key] = { peerId: peerId, peerName: peerName, msgs: [], unread: 0 };
    if (chatData[key].peerName !== '系统广播') chatData[key].peerName = peerName;
    chatData[key].msgs.push(m);
     
    chatSortMsgs(chatData[key].msgs);
    if (persist) {
        const cookie = chatGetCookie(m.mine ? 'sent_msgs' : 'recv_msgs');
        cookie.push(m);
        chatSetCookie(m.mine ? 'sent_msgs' : 'recv_msgs', chatSortMsgs(cookie));
    }
}

 
function chatLoadHistory() {
    chatData = {};
    chatGetCookie('sent_msgs').forEach(function (m) { m.mine = true; chatAddMsg(m, false); });
    chatGetCookie('recv_msgs').forEach(function (m) { m.mine = false; chatAddMsg(m, false); });
}

 
function showToast(text, type) {
    let wrap = document.getElementById('ziyit-toast-wrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'ziyit-toast-wrap';
        wrap.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;';
        document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'padding:10px 18px;border-radius:8px;color:#fff;background:' + (type === 'error' ? '#e74c3c' : '#27ae60') + ';box-shadow:0 4px 16px rgba(0,0,0,.25);font-size:14px;max-width:80vw;';
    wrap.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; }, 2200);
    setTimeout(function () { el.remove(); }, 2600);
}

 
function chatErrText(err, fallback) {
    if (err && err.status === 401) return '登录已过期，请重新登录';
    if (err && err.status === 403) return '无权限操作';
    if (err && err.status === 404) return '接收者非管理员';
    if (err && err.status === 429) return '每分钟最多10条';
    return (err && err.data && err.data.detail) || (err && err.message) || fallback;
}

function chatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes());
}

 
function openChatWith(admin) {
    const f = adminFields(admin);
    if (!chatData['peer:' + f.userId]) {
        chatData['peer:' + f.userId] = { peerId: f.userId, peerName: f.username, msgs: [], unread: 0 };
    }
    chatActivePeer = f.userId;
    chatData['peer:' + f.userId].unread = 0;
    openChatModal();
}

function openChatModal() {
    renderChatSessions();
    renderChatMessages();
    document.getElementById('admin-chat-modal').classList.add('active');
    setTimeout(function () {
        const inp = document.getElementById('chat-input');
        if (inp) inp.focus();
    }, 60);
}

function closeChatModal() {
    document.getElementById('admin-chat-modal').classList.remove('active');
}

function chatModalOpen() {
    return document.getElementById('admin-chat-modal').classList.contains('active');
}

function renderChatSessions() {
    const box = document.getElementById('chat-sessions');
    if (!box) return;
    const keys = Object.keys(chatData);
    if (!keys.length) {
        box.innerHTML = '<div class="chat-empty">暂无会话</div>';
        return;
    }
     
    keys.sort(function (a, b) {
        const ma = chatData[a].msgs;
        const mb = chatData[b].msgs;
        const ta = ma.length ? ma[ma.length - 1].sentAt || '' : '';
        const tb = mb.length ? mb[mb.length - 1].sentAt || '' : '';
        return tb < ta ? -1 : (tb > ta ? 1 : 0);
    });
    let html = '';
    keys.forEach(function (k) {
        const s = chatData[k];
        const last = s.msgs.length ? s.msgs[s.msgs.length - 1] : null;
        const unread = s.unread > 0 ? '<span class="chat-unread">' + s.unread + '</span>' : '';
        const act = k === 'peer:' + chatActivePeer ? ' active' : '';
        html += '<div class="chat-session' + act + '" data-key="' + k + '">'
            + '<div class="chat-session-name">' + escAdmin(s.peerName) + unread + '</div>'
            + '<div class="chat-session-preview">' + (last ? escAdmin(last.content) : '暂无消息') + '</div>'
            + '</div>';
    });
    box.innerHTML = html;
    box.querySelectorAll('.chat-session').forEach(function (el) {
        el.addEventListener('click', function () {
            const key = el.getAttribute('data-key');
            chatActivePeer = chatData[key].peerId;
            chatData[key].unread = 0;
            renderChatSessions();
            renderChatMessages();
        });
    });
}

function renderChatMessages() {
    const box = document.getElementById('chat-messages');
    const title = document.getElementById('chat-title');
    if (!box) return;
    const s = chatActivePeer != null ? chatData['peer:' + chatActivePeer] : null;
    if (!s) {
        if (title) title.textContent = '选择一个会话开始聊天';
        box.innerHTML = '<div class="chat-empty">在左侧选择一个管理员，或点击列表中的"私聊"按钮</div>';
        return;
    }
    if (title) title.textContent = (s.peerId === 'broadcast' ? '系统广播' : escAdmin(s.peerName));
     
    chatSortMsgs(s.msgs);
    if (!s.msgs.length) {
        box.innerHTML = '<div class="chat-empty">暂无消息</div>';
        return;
    }
    let html = '';
    s.msgs.forEach(function (m) {
        const mine = m.mine;
        const bcast = !!m.broadcast;
        const who = mine ? '我' : (m.fromUsername || s.peerName);
        html += '<div class="chat-msg' + (bcast ? ' chat-broadcast' : (mine ? ' chat-mine' : ' chat-theirs')) + '">'
            + '<div class="chat-msg-meta">' + escAdmin(who)
            + '<span class="chat-msg-time">' + escAdmin(chatTime(m.sentAt)) + '</span></div>'
            + '<div class="chat-msg-bubble">' + escAdmin(m.content) + '</div>'
            + '</div>';
    });
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
}

function chatSend() {
    if (!chatModalOpen()) return;
    const input = document.getElementById('chat-input');
    const content = (input.value || '').trim();
    if (!content) return;
    if (chatActivePeer == null || chatActivePeer === 'broadcast') { showToast('请先选择一位管理员会话', 'error'); return; }
    const s = chatData['peer:' + chatActivePeer];
    const btn = document.getElementById('chat-send-btn');
    btn.disabled = true;
    ZIYIT_API.adminChatSend(chatActivePeer, content).then(function (data) {
        chatAddMsg({
            id: data && data.id,
            mine: true,
            toUserId: chatActivePeer,
            toUsername: s ? s.peerName : chatActivePeer,
            content: content,
            sentAt: new Date().toISOString(),
            broadcast: false
        }, true);
        input.value = '';
        renderChatSessions();
        renderChatMessages();
    }).catch(function (err) {
        showToast(chatErrText(err, '发送失败'), 'error');
    }).finally(function () {
        btn.disabled = false;
        input.focus();
    });
}

 
function pollChatInbox() {
    if (!currentAdminLevel) return Promise.resolve();
    return ZIYIT_API.adminChatInbox().then(function (data) {
        const msgs = (data && data.messages) || [];
        let changed = false;
        msgs.forEach(function (m) {
            m.mine = false;
            chatAddMsg(m, true);
            changed = true;
        });
        if (!changed) return;
        renderChatSessions();
        if (chatModalOpen()) renderChatMessages();
    }).catch(function (err) {
        if (err && err.status === 401) {   }
        if (err && err.status === 429) {   }
    });
}

 
function openBroadcastModal() {
    if (!canAccess(2)) { showToast('1级管理员无广播权限', 'error'); return; }
    document.getElementById('broadcast-content').value = '';
    const lv = currentAdminLevel || 2;
    let range = '';
    if (lv === 2) range = '将发送给全部 1 级管理员';
    else if (lv === 3) range = '将发送给全部 1、2 级管理员';
    else range = '将发送给全部 1、2、3 级管理员';
    document.getElementById('broadcast-range').textContent = range;
    document.getElementById('admin-broadcast-modal').classList.add('active');
}

function closeBroadcastModal() {
    document.getElementById('admin-broadcast-modal').classList.remove('active');
}

function confirmBroadcast() {
    const content = document.getElementById('broadcast-content').value.trim();
    if (!content) { showToast('请输入消息内容', 'error'); return; }
    const btn = document.getElementById('confirm-broadcast');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-inline"></span>发送中...';
    ZIYIT_API.adminChatBroadcast(content).then(function (data) {
        showToast((data && data.message) || '全局消息已发送');
        closeBroadcastModal();
    }).catch(function (err) {
        if (err && err.status === 403) showToast('1级管理员禁止发送广播', 'error');
        else showToast(chatErrText(err, '发送失败'), 'error');
    }).finally(function () {
        btn.disabled = false;
        btn.innerHTML = '发送';
    });
}

 
document.addEventListener('DOMContentLoaded', function () {
    const chatBtn = document.getElementById('admin-chat-btn');
    if (chatBtn) chatBtn.addEventListener('click', function () { openChatModal(); });

    const bcastBtn = document.getElementById('broadcast-btn');
    if (bcastBtn) bcastBtn.addEventListener('click', openBroadcastModal);

    const closeBtn = document.getElementById('chat-close');
    if (closeBtn) closeBtn.addEventListener('click', closeChatModal);

    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn) sendBtn.addEventListener('click', chatSend);

    const chatInput = document.getElementById('chat-input');
    if (chatInput) chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatSend(); }
    });

    const cancelB = document.getElementById('cancel-broadcast');
    if (cancelB) cancelB.addEventListener('click', closeBroadcastModal);

    const confirmB = document.getElementById('confirm-broadcast');
    if (confirmB) confirmB.addEventListener('click', confirmBroadcast);
});

 

var guideConsole = {
    polling: false,        
    sessions: {},          
    msgSeen: {},           
    activeSession: null,
    myUserId: null
};

 
 
function guideRestorePending() {
    var raw = null;
    try { raw = localStorage.getItem('ziyit_guide_pending'); } catch (e) {}
    if (!raw) return;
    var pend = null;
    try { pend = JSON.parse(raw); } catch (e) { pend = null; }
    try { localStorage.removeItem('ziyit_guide_pending'); } catch (e) {}
    if (!Array.isArray(pend) || !pend.length) return;
    var restored = 0;
    pend.forEach(function (it) {
        if (!it || !it.sid) return;
        if (guideConsole.sessions[it.sid]) return;
        guideConsole.sessions[it.sid] = {
            sessionId: it.sid,
            user: it.user || '用户',
            userId: it.userId,
            msgs: [],
            unread: 1,
            accepted: false
        };
        guideLoadHumanSession(it.sid);
        restored++;
    });
    if (restored) {
        guideRenderInbox();
        showToast('有 ' + restored + ' 个新的人工客服会话', 'success');
    }
}

function guideInit() {
     
     
    ZIYIT_API.adminMe().then(function (me) {
        guideConsole.myUserId = (me && (me.userId || me.user_id)) || null;
        guideRestorePending();
        if (guideConsole.activeSession) guideRenderSessionMessages(guideConsole.activeSession);
         
        if (me && Number(me.level) === 4) {
            const panel = document.getElementById('guide-agents-panel');
            if (panel) panel.style.display = '';
            guideLoadAgents();
        }
    }).catch(function () {
         
        guideRestorePending();
    });
}

 
function guideStartPolling() {
    if (guideConsole.polling) return;
     
     
    ZIYIT_API.guideAuthSync().then(function () {
        guideConsole.polling = true;
        guidePollInbox();
    }).catch(function (err) {
        guideConsole.polling = false;
        if (err && err.status === 401) {
            showToast('登录已过期，请重新登录', 'error');
        } else if (err) {
            showToast('连接客服系统失败：' + (err.message || '未知错误'), 'error');
        }
    });
}

function guidePollInbox() {
    if (!guideConsole.polling) return Promise.resolve();
    return ZIYIT_API.guideHumanInbox().then(function (data) {
         
        const sec = document.getElementById('guide-console');
        if (!sec || !sec.classList.contains('active')) { guideConsole.polling = false; return; }
        const list = (data && data.messages) || [];
        let changed = false;
        list.forEach(function (m) {
            if (!m || !m.sessionId) return;
            const k = m.id || (m.sessionId + '|' + (m.content || '') + '|' + (m.ts || ''));
            if (guideConsole.msgSeen[k]) return;
            guideConsole.msgSeen[k] = true;
            if (!guideConsole.sessions[m.sessionId]) {
                guideConsole.sessions[m.sessionId] = {
                    sessionId: m.sessionId,
                    user: m.fromUsername || ('用户#' + (m.fromUserId != null ? m.fromUserId : '?')),
                    userId: m.fromUserId,
                    msgs: [],
                    unread: 0,
                    accepted: false
                };
            }
            guideConsole.sessions[m.sessionId].msgs.push(m);
            if (!guideConsole.sessions[m.sessionId].accepted) guideConsole.sessions[m.sessionId].unread++;
            changed = true;
        });
        if (changed) {
            guideRenderInbox();
            if (guideConsole.activeSession) guideRenderSessionMessages(guideConsole.activeSession);
        }
        setTimeout(guidePollInbox, 3000);
    }).catch(function (err) {
        const sec = document.getElementById('guide-console');
        if (!sec || !sec.classList.contains('active')) { guideConsole.polling = false; return; }
        if (err && (err.status === 401 || err.status === 403)) {
             
            guideConsole.polling = false;
            const box = document.getElementById('guide-inbox-list');
            if (box) {
                box.innerHTML = '<div class="chat-empty">暂无权限获取待接入会话' +
                    (err.status === 403 ? '（仅限客服名单内管理员）' : '（登录状态已失效）') +
                    '</div>';
            }
            guideHandleErr(err);
            return;
        }
        guideHandleErr(err);
        setTimeout(guidePollInbox, 3000);
    });
}

function guideRenderInbox() {
    const box = document.getElementById('guide-inbox-list');
    if (!box) return;
    const ids = Object.keys(guideConsole.sessions);
    if (!ids.length) { box.innerHTML = '<div class="chat-empty">暂无待接入会话</div>'; return; }
     
    ids.sort(function (a, b) {
        const ma = guideConsole.sessions[a].msgs, mb = guideConsole.sessions[b].msgs;
        const ta = ma.length ? ma[ma.length - 1].ts || ma[ma.length - 1].sentAt || '' : '';
        const tb = mb.length ? mb[mb.length - 1].ts || mb[mb.length - 1].sentAt || '' : '';
        return tb < ta ? -1 : (tb > ta ? 1 : 0);
    });
    let html = '';
    ids.forEach(function (sid) {
        const s = guideConsole.sessions[sid];
        const last = s.msgs[s.msgs.length - 1];
        const badge = s.accepted
            ? '<span style="font-size:11px;color:#27ae60;margin-left:auto;">接待中</span>'
            : (s.unread > 0 ? '<span class="chat-unread">' + s.unread + '</span>' : '');
        const type = last && (last.type === 'handoff' || last.type === 'transfer')
            ? '转人工：' : '用户：';
        html += '<div class="chat-session' + (sid === guideConsole.activeSession ? ' active' : '') + '" data-guid-sid="' + escAdmin(sid) + '">'
            + '<div class="chat-session-name">' + escAdmin(s.user) + badge + '</div>'
            + '<div class="chat-session-preview">' + type + escAdmin((last && last.content) || '') + '</div>'
            + '<div class="chat-session-preview" style="color:#aaa;">' + fmtChatTime(last ? (last.ts || last.sentAt) : '') + '</div>'
            + '</div>';
    });
    box.innerHTML = html;
    box.querySelectorAll('.chat-session').forEach(function (el2) {
        el2.addEventListener('click', function () { guideSelectSession(el2.getAttribute('data-guid-sid')); });
    });
}

function guideSelectSession(sid) {
    guideConsole.activeSession = sid;
    const s = guideConsole.sessions[sid];
    if (!s) return;
    guideRenderInbox();
    const title = document.getElementById('guide-console-title');
    const input = document.getElementById('guide-console-input');
    const send = document.getElementById('guide-console-send');
    const endBtn = document.getElementById('guide-console-end');
    guideLoadHumanSession(sid);
    if (s.accepted) {
        title.textContent = '会话 ' + sid.slice(0, 8) + ' · 接待中（' + s.user + '）';
        input.disabled = false;
        send.disabled = false;
        if (endBtn) endBtn.disabled = false;
    } else {
        title.innerHTML = '会话 ' + escAdmin(sid.slice(0, 8)) + ' · ' + escAdmin(s.user)
            + ' <button class="user-btn success" id="guide-accept-btn" style="margin-left:8px;padding:4px 14px;">接受会话</button>';
        const ab = document.getElementById('guide-accept-btn');
        if (ab) ab.addEventListener('click', function () { guideAcceptSession(sid); });
        input.disabled = true;
        send.disabled = true;
        if (endBtn) endBtn.disabled = true;
    }
}

function guideAcceptSession(sid) {
    ZIYIT_API.guideHumanAccept(sid).then(function () {
        const s = guideConsole.sessions[sid];
        if (s) { s.accepted = true; s.unread = 0; }
        guideConsole.activeSession = sid;
        guideSelectSession(sid);
        showToast('已接受会话');
    }).catch(function (err) { guideHandleErr(err); });
}

 
function guideLoadHumanSession(sid) {
    ZIYIT_API.guideHumanSession(sid).then(function (d) {
        const msgs = (d && (d.messages || d.msgs)) || [];
        const s = guideConsole.sessions[sid] || { sessionId: sid, msgs: [], user: '用户', unread: 0, accepted: false };
        s.banInfo = (d && d.banInfo) || null;
        s.msgs = [];
        msgs.forEach(function (m) {
            const id = m.id || (m.ts || m.sentAt || '') + '|' + (m.content || '');
            guideConsole.msgSeen[id] = true;
            s.msgs.push(m);
        });
        guideConsole.sessions[sid] = s;
        guideRenderSessionMessages(sid);
         
        if (s.banInfo) {
            const endBtn = document.getElementById('guide-console-end');
            if (endBtn) endBtn.disabled = false;
        }
    }).catch(function (err) { guideHandleErr(err); });
}

 
function guideRenderSessionMessages(sid) {
    const box = document.getElementById('guide-console-messages');
    if (!box) return;
    const s = guideConsole.sessions[sid];
    if (!s || !s.msgs.length) { box.innerHTML = '<div class="chat-empty">暂无消息</div>'; return; }
    let html = '';
     
    if (s.banInfo) {
        const b = s.banInfo;
        const remain = String(b.remainingDays) === 'inf'
            ? '永久封禁'
            : '剩余 ' + (b.remainingDays != null ? escAdmin(b.remainingDays) : '?') + ' 天'
                + (b.unbanAt || b.unbanTime || b.bannedUntil ? ' / 解封时间 ' + escAdmin(b.unbanAt || b.unbanTime || b.bannedUntil) : '');
        html += '<div class="chat-broadcast chat-msg"><div class="chat-msg-bubble" style="border:1px solid rgba(231,76,60,.45); text-align:left;">'
            + '<div style="font-weight:600; color:#e74c3c;">封禁信息（申诉中）</div>'
            + '用户 ID：' + escAdmin(b.userId) + '<br>'
            + '封禁理由：' + escAdmin(b.banReason || '无') + '<br>'
            + '封禁状态：' + remain
            + '</div></div>';
    }
    s.msgs.forEach(function (m) {
        const content = m.content || '';
        const time = m.ts || m.sentAt || '';
        const isSystem = m.type === 'sys' || m.type === 'system' || m.type === 'handoff' || m.type === 'transfer' || m.senderName === '系统';
        if (isSystem && m.fromUserId == null) {
            html += '<div class="chat-broadcast chat-msg"><div class="chat-msg-bubble">' + escAdmin(content || '请求转接人工客服') + '</div></div>';
            return;
        }
         
         
        const msgId = m.fromUserId != null ? m.fromUserId : (m.sender != null ? m.sender : null);
        const mine = guideConsole.myUserId != null && msgId != null && String(msgId) === String(guideConsole.myUserId);
        const fromName = m.fromUsername || (mine ? '我' : s.user);
        html += '<div class="chat-msg ' + (mine ? 'chat-mine' : 'chat-theirs') + '">'
            + '<div class="chat-msg-meta">' + escAdmin(fromName) + '<span class="chat-msg-time">' + fmtChatTime(time) + '</span></div>'
            + '<div class="chat-msg-bubble">' + escAdmin(content) + '</div>'
            + '</div>';
    });
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
}

function guideSendReply() {
    const sid = guideConsole.activeSession;
    const s = sid && guideConsole.sessions[sid];
    if (!s || !s.accepted) return;
    const input = document.getElementById('guide-console-input');
    const content = (input.value || '').trim();
    if (!content) return;
    if (content.length > 500) { showToast('回复不能超过500字', 'error'); return; }
    const send = document.getElementById('guide-console-send');
    send.disabled = true;
    ZIYIT_API.guideHumanReply(sid, content).then(function () {
        input.value = '';
        send.disabled = false;
        s.msgs.push({
            fromUserId: guideConsole.myUserId,
            fromUsername: '我',
            content: content,
            ts: new Date().toISOString()
        });
        guideRenderSessionMessages(sid);
    }).catch(function (err) {
        send.disabled = false;
        guideHandleErr(err);
    });
}

 
function guideEndSession() {
    const sid = guideConsole.activeSession;
    const s = sid && guideConsole.sessions[sid];
    if (!s) { showToast('请先选择一个会话', 'error'); return; }
    if (!s.accepted && !s.banInfo) { showToast('请先接受会话，才能结束对话', 'error'); return; }
    if (!window.confirm('确定结束该会话吗？结束后将无法继续回复。')) return;
    const btn = document.getElementById('guide-console-end');
    if (btn) { btn.disabled = true; btn.textContent = '结束中…'; }
    ZIYIT_API.guideHumanClose(sid).then(function () {
        if (btn) { btn.disabled = false; btn.textContent = '结束对话'; }
        guideCloseLocalSession(sid, true);
    }).catch(function (err) {
        if (btn) { btn.disabled = false; btn.textContent = '结束对话'; }
        if (err && err.status === 400) {
             
            guideCloseLocalSession(sid, true);
            return;
        }
        if (err && err.status === 404) {
             
            guideRemoveSessionSilent(sid);
            return;
        }
        if (err && err.status === 403) { showToast('无权结束该会话（仅被分配客服/超管可操作）', 'error'); return; }
        guideHandleErr(err);
    });
}

 
function guideCloseLocalSession(sid, toast) {
    delete guideConsole.sessions[sid];
    guideConsole.activeSession = null;
    const box = document.getElementById('guide-console-messages');
    if (box) box.innerHTML = '<div class="chat-empty">会话已结束</div>';
    const title = document.getElementById('guide-console-title');
    if (title) title.textContent = '选择一个会话开始接待';
    const input = document.getElementById('guide-console-input');
    const send = document.getElementById('guide-console-send');
    const endBtn = document.getElementById('guide-console-end');
    if (input) input.disabled = true;
    if (send) send.disabled = true;
    if (endBtn) endBtn.disabled = true;
    guideRenderInbox();
    if (toast) showToast('会话已结束', 'success');
}

 
function guideRemoveSessionSilent(sid) {
    if (!sid) return;
    delete guideConsole.sessions[sid];
    if (guideConsole.activeSession === sid) {
        guideConsole.activeSession = null;
        const box = document.getElementById('guide-console-messages');
        if (box) box.innerHTML = '<div class="chat-empty">选择一个会话开始接待</div>';
        const title = document.getElementById('guide-console-title');
        if (title) title.textContent = '选择一个会话开始接待';
        const input = document.getElementById('guide-console-input');
        const send = document.getElementById('guide-console-send');
        const endBtn = document.getElementById('guide-console-end');
        if (input) input.disabled = true;
        if (send) send.disabled = true;
        if (endBtn) endBtn.disabled = true;
    }
    guideRenderInbox();
}

function guideHandleErr(err) {
    if (!err) return;
    if (err.status === 401) { showToast('登录已过期，请重新登录', 'error'); return; }
    if (err.status === 403) { showToast('无权限操作（仅限客服管理员/超级管理员）', 'error'); return; }
    if (err.status === 404) {
         
        if (guideConsole.activeSession) guideRemoveSessionSilent(guideConsole.activeSession);
        return;
    }
    if (err.status === 429) { showToast('发送过于频繁，请稍后再试', 'error'); return; }
    if (err.status === 400) { showToast(err.message || '请求参数错误', 'error'); return; }
    showToast('网络错误：' + ((err && err.message) || '未知错误'), 'error');
}

 
function guideLoadAgents() {
    ZIYIT_API.guideHumanAgents().then(function (d) {
        guideRenderAgents((d && d.agents) || []);
    }).catch(function (err) {
         
        const box = document.getElementById('guide-agents-list');
        if (box) {
            box.innerHTML = '<p style="padding:16px; color:var(--ziyit-text-secondary);">名单加载失败' +
                (err && err.status ? '（' + err.status + '）' : '') +
                '，请点击「刷新名单」重试</p>';
        }
        guideHandleErr(err);
    });
}

 
function guideRenderAgents(list) {
    const box = document.getElementById('guide-agents-list');
    if (!box) return;
    if (!list || !list.length) {
        box.innerHTML = '<p style="padding:16px; color:var(--ziyit-text-secondary);">暂无客服管理员，添加后即可接收转人工消息</p>';
        return;
    }
    box.innerHTML = '';
    list.forEach(function (a) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 12px; border-bottom:1px solid rgba(255,255,255,.06);';
        const left = document.createElement('div');
        left.style.cssText = 'display:flex; align-items:center; gap:8px; min-width:0;';
        const nm = document.createElement('span');
        nm.textContent = a.username || ('用户#' + a.userId);
        const st = document.createElement('span');
        st.style.cssText = 'font-size:12px; color:var(--ziyit-text-secondary);';
        st.textContent = a.online ? '在线' : '离线';
        left.appendChild(nm);
        left.appendChild(st);
        const del = document.createElement('button');
        del.className = 'action-btn delete';
        del.textContent = '移除';
        del.addEventListener('click', function () {
            if (!confirm('确定将「' + (a.username || ('用户#' + a.userId)) + '」移出客服名单？')) return;
            ZIYIT_API.guideHumanAgentRemove(a.userId).then(function (d) {
                showToast((d && d.message) || '已移除');
                guideLoadAgents();
            }).catch(function (err) { guideHandleErr(err); });
        });
        row.appendChild(left);
        row.appendChild(del);
        box.appendChild(row);
    });
}

function fmtChatTime(t) {
    if (!t) return '';
    const d = new Date(t);
    if (isNaN(d.getTime())) return '';
    const p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes());
}

 
 
 
function guideResolveCheck() {
    var params = new URLSearchParams(location.search);
    var token = params.get('guide_resolve');
    if (!token) return;

    // v1.31：直达客服控制台，锁定分段，避免异步权限校验回弹到其它分节
    adminSectionLocked = true;
    switchSection('guide-console');
    updateSystemInfo('切换到在线客服');
    guideStartPolling();

    function clearParam() {
        params.delete('guide_resolve');
        var qs = params.toString();
        var url = location.pathname + (qs ? ('?' + qs) : '') + location.hash;
        try { history.replaceState(null, '', url); } catch (e) {}
    }

    ZIYIT_API.guideHumanOfflineResolve(token).then(function (d) {
        showToast((d && d.message) || '离线已处理', 'success');
        clearParam();
    }).catch(function (err) {
        if (err && err.status === 400) {
             
            showToast((err.data && err.data.detail) || '令牌无效或已过期', 'error');
            clearParam();
        } else if (err && err.status === 401) {
             
        } else if (err && err.status === 403) {
            showToast('无权限处理该离线确认', 'error');
            clearParam();
        } else {
            showToast('离线处理失败，请稍后重试', 'error');
        }
    });
}

 
document.addEventListener('DOMContentLoaded', function () {
    guideResolveCheck();
    guideInit();
     
    if (location.hash === '#guide-console') {
        adminSectionLocked = true;
        switchSection('guide-console');
        updateSystemInfo('切换到在线客服');
        guideStartPolling();
    }
    const refreshBtn = document.getElementById('guide-console-refresh');
    if (refreshBtn) refreshBtn.addEventListener('click', function () {
        showToast('队列已刷新');
        guidePollInbox();
    });
    const sendBtn = document.getElementById('guide-console-send');
    if (sendBtn) sendBtn.addEventListener('click', guideSendReply);
    const endBtn = document.getElementById('guide-console-end');
    if (endBtn) endBtn.addEventListener('click', guideEndSession);
    const input = document.getElementById('guide-console-input');
    if (input) input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); guideSendReply(); }
    });
     
    const addId = document.getElementById('guide-agent-add-id');
    const addBtn = document.getElementById('guide-agent-add-btn');
    if (addId && addBtn) addBtn.addEventListener('click', function () {
        const v = String(addId.value || '').trim();
        if (!v || !/^\d+$/.test(v)) { showToast('请输入有效的用户ID', 'error'); return; }
        ZIYIT_API.guideHumanAgentAdd(Number(v)).then(function (d) {
            showToast((d && d.message) || '已添加客服');
            addId.value = '';
            guideLoadAgents();
        }).catch(function (err) { guideHandleErr(err); });
    });
    const agentsRefresh = document.getElementById('guide-agents-refresh');
    if (agentsRefresh) agentsRefresh.addEventListener('click', function () {
        showToast('客服名单已刷新');
        guideLoadAgents();
    });
});


/* =====================================================================
 * v1.32：知识库可见等级管理（仅 Lv.4 站长；后端 /admin/knowledge/*）
 * 所有改动落在后端覆盖层，不改原 markdown，改完即时生效、无需发布。
 * ===================================================================== */

var kbState = {
    loaded: false,
    loading: false,
    full: [],            // 全量条目（未筛选，供等级计数 / 目录树 / 下拉用）
    items: [],           // 当前用于表格渲染的条目（受 q 影响）
    counts: {},          // 全量等级计数 levelCounts
    updatedAt: '',
    total: 0,
    q: '',               // 条目总表搜索词
    level: 'all',        // 总表 / 目录树当前筛选档
    tab: 'entries',      // 当前子页
    pvLevel: 0,          // 档位预览当前等级
    compareKey: '',      // 对照当前条目
    editKey: '',         // 编辑当前条目
    editAdded: false,    // 编辑中的条目是否为「站长新增」
    editAdding: false    // 是否处于新建模式
};
var kbLoadSeq = 0;

// ---------- 通用小工具 ----------
function kbLevelLabel(n) {
    n = Number(n) || 0;
    if (n <= 0) return '公开';
    if (n >= 4) return 'Lv.4';
    return 'Lv.' + n + '+';
}
function kbLevelClass(n) {
    n = Number(n) || 0;
    if (n < 0) n = 0;
    if (n > 4) n = 4;
    return 'kb-badge kb-lv' + n;
}
function kbFmtTime(s) {
    if (!s) return '-';
    var d = new Date(s);
    if (isNaN(d.getTime())) return String(s);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function kbErrText(err, fallback) {
    if (!err) return fallback || '未知错误';
    var detail = err.data && err.data.detail;
    var reason = (detail && typeof detail === 'object') ? detail.reason : '';
    var msg = err.message || ((detail && typeof detail === 'string') ? detail : '') || '';
    if (err.status === 401) return '登录已过期，请重新登录';
    if (err.status === 403) {
        if (reason === 'super_admin_required') return '仅限站长（Lv.4）操作';
        if (reason === 'email_not_verified' || /邮箱|验证/.test(msg)) return '请先完成邮箱验证后再使用知识库管理';
        return msg || '无权限操作（仅限站长 Lv.4）';
    }
    if (reason === 'key_exists_in_doc') return '该标题与文档已有章节重名，请换一个标题';
    if (reason === 'not_added') return '只能删除站长新增条目，文档条目请使用「恢复公开/隐藏」功能';
    if (reason === 'entry_not_found') return '未找到该条目（可能已被删除，请刷新）';
    if (reason === 'invalid_value') return msg || '参数不合法';
    if (reason === 'missing_target') return msg || '请指定要重置的条目';
    if (reason === 'doc_not_found') return msg || '知识库文档读取失败';
    return msg || fallback || '请求失败';
}
// 关键词高亮（仅用于标题 / 片段，文本先转义）
function kbHighlight(text, kw) {
    text = String(text == null ? '' : text);
    if (!kw) return escAdmin(text);
    var lower = text.toLowerCase(), k = String(kw).toLowerCase();
    var idx = lower.indexOf(k);
    if (idx < 0) return escAdmin(text);
    var out = '', i = 0;
    while (idx >= 0) {
        out += escAdmin(text.slice(i, idx));
        out += '<mark class="kb-mark">' + escAdmin(text.slice(idx, idx + k.length)) + '</mark>';
        i = idx + k.length;
        idx = lower.indexOf(k, i);
    }
    out += escAdmin(text.slice(i));
    return out;
}
function kbPreLines(text) {
    text = String(text == null ? '' : text);
    if (!text) return '<div class="kb-line kb-muted">（空）</div>';
    return text.split('\n').map(function (l) {
        return '<div class="kb-line">' + (l ? escAdmin(l) : '&nbsp;') + '</div>';
    }).join('');
}
// 逐行差异高亮：某行在对方文本里找不到（去空白比较）即视为变化
function kbDiffLines(docText, effText) {
    var a = String(docText == null ? '' : docText).split('\n');
    var b = String(effText == null ? '' : effText).split('\n');
    var setA = {}, setB = {};
    a.forEach(function (l) { var t = l.trim(); if (t) setA[t] = true; });
    b.forEach(function (l) { var t = l.trim(); if (t) setB[t] = true; });
    function render(lines, other, cls) {
        return lines.map(function (l) {
            var t = l.trim();
            var chg = t && !other[t];
            return '<div class="kb-line' + (chg ? ' ' + cls : '') + '">' + (l ? escAdmin(l) : '&nbsp;') + '</div>';
        }).join('');
    }
    return { left: render(a, setB, 'kb-line-del'), right: render(b, setA, 'kb-line-add') };
}

// ---------- 分页 / 分节切换 ----------
function kbSetTab(tab) {
    kbState.tab = tab;
    document.querySelectorAll('#kb-subtabs .kb-subtab').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-kbtab') === tab);
    });
    document.querySelectorAll('#knowledge-management .kb-pane').forEach(function (p) {
        p.classList.remove('active');
    });
    var pane = document.getElementById('kb-pane-' + tab);
    if (pane) pane.classList.add('active');
}
function kbLazyLoadTab() {
    var t = kbState.tab;
    if (t === 'preview') kbLoadPreview(kbState.pvLevel);
    else if (t === 'compare') {
        var c = document.getElementById('kb-compare-key');
        if (c && c.value) kbLoadCompare();
    } else if (t === 'edit') {
        var e = document.getElementById('kb-edit-key');
        if (e && e.value && !kbState.editAdding) kbLoadEdit();
    }
}
function kbOnEnter() {
    if (!canAccess(4)) { showToast('知识库管理仅限站长（Lv.4）操作', 'error'); return; }
    switchSection('knowledge-management');
    updateSystemInfo('切换到知识库管理');
    kbSetTab(kbState.tab || 'entries');
    kbLoad(false).then(function () { kbLazyLoadTab(); });
}

// ---------- 数据加载与渲染 ----------
function kbLoad(refresh) {
    if (!canAccess(4)) return Promise.resolve();
    var seq = ++kbLoadSeq;
    var body = document.getElementById('kb-entries-body');
    if (body && !kbState.loaded) body.innerHTML = '<tr><td colspan="10" class="kb-empty">加载中...</td></tr>';
    var q = kbState.q || '';
    var opts = {};
    if (q) opts.q = q;
    kbState.loading = true;
    return ZIYIT_API.knowledgeEntries(opts).then(function (d) {
        if (seq !== kbLoadSeq) return;
        d = d || {};
        var items = d.items || [];
        kbState.items = items;
        if (!q) {
            kbState.full = items.slice();
            kbState.counts = d.levelCounts || {};
        }
        kbState.updatedAt = d.updatedAt || kbState.updatedAt;
        kbState.total = d.total || 0;
        kbState.loaded = true;
        kbState.loading = false;
        kbRenderMeta();
        kbRenderCounts();
        kbRenderEntries();
        kbRenderTree();
        kbFillPickers();
        kbRenderParentOptions();
    }).catch(function (err) {
        if (seq !== kbLoadSeq) return;
        kbState.loaded = false;
        kbState.loading = false;
        if (body) body.innerHTML = '<tr><td colspan="10" class="kb-empty">' + escAdmin(kbErrText(err, '加载失败')) + '</td></tr>';
        showToast(kbErrText(err, '知识库加载失败'), 'error');
    });
}
function kbRenderMeta() {
    var u = document.getElementById('kb-updated');
    if (u) u.textContent = kbFmtTime(kbState.updatedAt);
    var t = document.getElementById('kb-total');
    if (t) t.textContent = String(kbState.total || 0);
}
function kbRenderCounts() {
    var c = kbState.counts || {};
    var total = 0;
    for (var k in c) { if (Object.prototype.hasOwnProperty.call(c, k)) total += Number(c[k]) || 0; }
    var allEl = document.querySelector('#kb-level-tabs .kb-count[data-kbcount="all"]');
    if (allEl) allEl.textContent = String(total);
    [0, 1, 2, 3, 4].forEach(function (n) {
        var el = document.querySelector('#kb-level-tabs .kb-count[data-kbcount="' + n + '"]');
        if (el) el.textContent = String(c[String(n)] || 0);
    });
}
function kbFiltered() {
    var list = kbState.items || [];
    if (kbState.level === 'all') return list;
    var lv = String(kbState.level);
    return list.filter(function (x) { return String(x.level) === lv; });
}
function kbRenderEntries() {
    var body = document.getElementById('kb-entries-body');
    if (!body) return;
    var list = kbFiltered();
    if (!list.length) { body.innerHTML = '<tr><td colspan="10" class="kb-empty">没有符合条件的条目</td></tr>'; return; }
    var html = '';
    list.forEach(function (x) {
        html += '<tr>' +
            '<td>' + kbHighlight(x.title, kbState.q) +
            (x.title !== x.key ? '<div class="kb-sub">' + escAdmin(x.key) + '</div>' : '') + '</td>' +
            '<td>' + ((x.docTitle && x.docTitle !== x.title) ? escAdmin(x.docTitle) : '<span class="kb-muted">-</span>') + '</td>' +
            '<td>' + (x.parent ? escAdmin(x.parent) : '<span class="kb-muted">-</span>') + '</td>' +
            '<td>' + (x.isGroup ? '大节' : '子节') + '</td>' +
            '<td><span class="' + kbLevelClass(x.level) + '">' + kbLevelLabel(x.level) + '</span></td>' +
            '<td>' + (x.hidden ? '<span class="kb-badge kb-badge-hidden">隐藏</span>' : '<span class="kb-badge kb-badge-ok">可见</span>') + '</td>' +
            '<td>' + (x.overridden ? '<span class="kb-badge kb-badge-ovr">已改</span>' : '<span class="kb-muted">-</span>') + '</td>' +
            '<td>' + (x.added ? '<span class="kb-badge kb-badge-added">新增</span>' : '<span class="kb-muted">-</span>') + '</td>' +
            '<td>' + x.chars + (x.docChars !== x.chars ? ' <span class="kb-muted">/ ' + x.docChars + '</span>' : '') + '</td>' +
            '<td class="kb-ops">' +
            '<button class="user-btn" data-kbact="compare" data-kbkey="' + escAdmin(x.key) + '">对照</button>' +
            '<button class="user-btn" data-kbact="edit" data-kbkey="' + escAdmin(x.key) + '">编辑</button>' +
            '</td></tr>';
    });
    body.innerHTML = html;
}
function kbRenderTree() {
    var wrap = document.getElementById('kb-tree');
    if (!wrap) return;
    var list = kbFiltered();
    if (!list.length) { wrap.innerHTML = '<div class="kb-empty">没有符合条件的条目</div>'; return; }
    var byKey = {};
    list.forEach(function (x) { byKey[x.key] = x; });
    var roots = [], childrenMap = {};
    list.forEach(function (x) {
        var p = (x.parent && byKey[x.parent]) ? x.parent : '';
        if (p) { (childrenMap[p] = childrenMap[p] || []).push(x); }
        else roots.push(x);
    });
    function node(x, depth) {
        var kids = childrenMap[x.key] || [];
        var cls = x.isGroup ? 'kb-node-group' : 'kb-node-item';
        var html = '<div class="kb-node ' + cls + '" style="padding-left:' + (8 + depth * 18) + 'px" data-kbkey="' + escAdmin(x.key) + '">' +
            '<span class="kb-node-title">' + kbHighlight(x.title, kbState.q) + '</span>' +
            '<span class="' + kbLevelClass(x.level) + '">' + kbLevelLabel(x.level) + '</span>' +
            (x.hidden ? '<span class="kb-badge kb-badge-hidden">隐藏</span>' : '') +
            (x.added ? '<span class="kb-badge kb-badge-added">新增</span>' : '') +
            (x.overridden ? '<span class="kb-badge kb-badge-ovr">已改</span>' : '') +
            '<span class="kb-node-chars">' + x.chars + '字</span>' +
            '</div>';
        kids.forEach(function (k) { html += node(k, depth + 1); });
        return html;
    }
    var out = '';
    roots.forEach(function (r) { out += node(r, 0); });
    wrap.innerHTML = out;
}
function kbFillPickers() {
    var list = (kbState.full && kbState.full.length) ? kbState.full : (kbState.items || []);
    var opts = list.map(function (x) {
        var label = (x.isGroup ? '▸ ' : '　') + x.title + '（' + kbLevelLabel(x.level) + (x.added ? '·新增' : '') + '）';
        return '<option value="' + escAdmin(x.key) + '">' + escAdmin(label) + '</option>';
    }).join('');
    ['kb-compare-key', 'kb-edit-key'].forEach(function (id) {
        var sel = document.getElementById(id);
        if (!sel) return;
        var cur = sel.value;
        sel.innerHTML = opts;
        if (cur && list.some(function (x) { return x.key === cur; })) sel.value = cur;
    });
}
function kbRenderParentOptions() {
    var sel = document.getElementById('kb-edit-parent');
    if (!sel) return;
    var cur = sel.value;
    var groups = (kbState.full || []).filter(function (x) { return x.isGroup; });
    sel.innerHTML = '<option value="">（不指定）</option>' + groups.map(function (g) {
        return '<option value="' + escAdmin(g.key) + '">' + escAdmin(g.title) + '</option>';
    }).join('');
    if (cur) sel.value = cur;
}
function kbEnsureOption(selId, key) {
    var sel = document.getElementById(selId);
    if (!sel || !key) return;
    var found = false;
    for (var i = 0; i < sel.options.length; i++) { if (sel.options[i].value === key) { found = true; break; } }
    if (!found) {
        var o = document.createElement('option');
        o.value = key; o.textContent = key;
        sel.appendChild(o);
    }
    sel.value = key;
}
function kbOpenCompare(key) {
    if (!key) return;
    kbEnsureOption('kb-compare-key', key);
    kbSetTab('compare');
    kbLoadCompare();
}
function kbOpenEdit(key) {
    if (!key) return;
    kbEnsureOption('kb-edit-key', key);
    kbSetTab('edit');
    kbLoadEdit();
}

// ---------- ③ 关键词搜索 ----------
function kbDoSearch() {
    var qi = document.getElementById('kb-search-q');
    var q = qi ? qi.value.trim() : '';
    if (!q) { showToast('请输入搜索关键词', 'error'); return; }
    var lvSel = document.getElementById('kb-search-level');
    var lv = lvSel ? lvSel.value : '';
    var box = document.getElementById('kb-search-results');
    if (box) box.innerHTML = '<div class="kb-empty">搜索中...</div>';
    ZIYIT_API.knowledgeSearch(q, lv === '' ? null : lv).then(function (d) {
        kbRenderSearchResults(d, q);
    }).catch(function (err) {
        if (box) box.innerHTML = '<div class="kb-empty">' + escAdmin(kbErrText(err, '搜索失败')) + '</div>';
        showToast(kbErrText(err, '搜索失败'), 'error');
    });
}
function kbRenderSearchResults(d, q) {
    var box = document.getElementById('kb-search-results');
    if (!box) return;
    var items = (d && d.items) || [];
    if (!items.length) { box.innerHTML = '<div class="kb-empty">没有命中「' + escAdmin(q) + '」的条目</div>'; return; }
    var html = '<div class="kb-search-summary">共命中 ' + items.length + ' 条</div>';
    items.forEach(function (x) {
        var where = (x.matchedIn || []).map(function (w) {
            return '<span class="kb-badge kb-badge-ok">' + (w === 'title' ? '标题' : '正文') + '</span>';
        }).join(' ');
        html += '<div class="kb-result">' +
            '<div class="kb-result-head">' +
            '<span class="kb-result-title">' + kbHighlight(x.title, q) + '</span> ' + where +
            ' <span class="' + kbLevelClass(x.level) + '">' + kbLevelLabel(x.level) + '</span>' +
            (x.hidden ? ' <span class="kb-badge kb-badge-hidden">隐藏</span>' : '') +
            '</div>' +
            (x.snippet ? '<pre class="kb-snippet">' + kbHighlight(x.snippet, q) + '</pre>' : '') +
            '<div class="kb-result-ops">' +
            '<button class="user-btn" data-kbact="compare" data-kbsearchkey="' + escAdmin(x.key) + '">对照</button>' +
            '<button class="user-btn" data-kbact="edit" data-kbsearchkey="' + escAdmin(x.key) + '">编辑</button>' +
            '</div></div>';
    });
    box.innerHTML = html;
}

// ---------- ④ 原文 / 生效文对照 ----------
function kbLoadCompare() {
    var sel = document.getElementById('kb-compare-key');
    var key = sel ? sel.value : '';
    if (!key) return;
    var wrap = document.getElementById('kb-compare');
    if (wrap) wrap.innerHTML = '<div class="kb-empty">加载中...</div>';
    ZIYIT_API.knowledgeEntry(key).then(function (d) {
        kbState.compareKey = key;
        kbRenderCompare(d);
    }).catch(function (err) {
        if (wrap) wrap.innerHTML = '<div class="kb-empty">' + escAdmin(kbErrText(err, '加载失败')) + '</div>';
        var s = document.getElementById('kb-compare-state');
        if (s) s.textContent = '-';
        showToast(kbErrText(err, '加载失败'), 'error');
    });
}
function kbRenderCompare(d) {
    d = d || {};
    var stateEl = document.getElementById('kb-compare-state');
    if (stateEl) {
        stateEl.innerHTML = '等级 <b>' + kbLevelLabel(d.level) + '</b> · ' +
            (d.hidden ? '已隐藏' : '可见') + ' · ' +
            (d.added ? '站长新增' : '文档条目') + ' · ' +
            (d.overridden ? '已修改' : '未修改') + ' · 原 ' + (d.docChars || 0) + ' 字 / 生效 ' + (d.chars || 0) + ' 字';
    }
    var wrap = document.getElementById('kb-compare');
    if (!wrap) return;
    var cb = document.getElementById('kb-compare-diff');
    var highlight = !cb || cb.checked;
    var docText = d.docText || '';
    var effText = d.text || '';
    var leftHtml, rightHtml;
    if (highlight) {
        var diff = kbDiffLines(docText, effText);
        leftHtml = diff.left; rightHtml = diff.right;
    } else {
        leftHtml = kbPreLines(docText); rightHtml = kbPreLines(effText);
    }
    wrap.innerHTML =
        '<div class="kb-compare-col">' +
        '<div class="kb-compare-colhead">原文 · ' + escAdmin(d.docTitle || '(无)') + '</div>' +
        '<div class="kb-lines">' + leftHtml + '</div></div>' +
        '<div class="kb-compare-col">' +
        '<div class="kb-compare-colhead">生效文 · ' + escAdmin(d.title || '(无)') + '</div>' +
        '<div class="kb-lines">' + rightHtml + '</div></div>';
}

// ---------- ⑤ 档位预览 ----------
function kbLoadPreview(level) {
    level = Number(level) || 0;
    kbState.pvLevel = level;
    document.querySelectorAll('#kb-preview-tabs .kb-tab').forEach(function (b) {
        b.classList.toggle('active', (Number(b.getAttribute('data-pvlevel')) || 0) === level);
    });
    var txt = document.getElementById('kb-pv-text');
    var titles = document.getElementById('kb-pv-titles');
    if (txt) txt.textContent = '加载中...';
    ZIYIT_API.knowledgePreview(level).then(function (d) {
        d = d || {};
        var c = document.getElementById('kb-pv-count');
        if (c) c.textContent = String(d.entryCount || 0);
        var ch = document.getElementById('kb-pv-chars');
        if (ch) ch.textContent = String(d.chars || 0);
        if (titles) {
            titles.innerHTML = (d.titles || []).map(function (t) {
                return '<span class="kb-chip">' + escAdmin(t) + '</span>';
            }).join('') || '<span class="kb-muted">（该档位看不到任何条目）</span>';
        }
        if (txt) txt.textContent = d.text || '（该档位看不到任何内容）';
    }).catch(function (err) {
        if (txt) txt.textContent = kbErrText(err, '预览失败');
        showToast(kbErrText(err, '预览失败'), 'error');
    });
}

// ---------- ⑥ 模拟提问 ----------
function kbDoAsk() {
    var qi = document.getElementById('kb-ask-q');
    var q = qi ? qi.value.trim() : '';
    if (!q) { showToast('请输入要模拟的提问', 'error'); return; }
    var ls = document.getElementById('kb-ask-level');
    var level = ls ? (Number(ls.value) || 0) : 0;
    var meta = document.getElementById('kb-ask-meta');
    var out = document.getElementById('kb-ask-matched');
    if (out) out.textContent = '模拟中...';
    ZIYIT_API.knowledgePreview(level, q).then(function (d) {
        d = d || {};
        if (meta) meta.innerHTML = '以 <b>' + kbLevelLabel(level) + '</b> 提问 · 该档位可见 ' +
            (d.entryCount || 0) + ' 条 / ' + (d.chars || 0) + ' 字';
        if (out) out.textContent = (d.matched && String(d.matched).trim())
            ? d.matched
            : '（这句话没有匹配到任何段落，AI 不会拿到知识库内容）';
    }).catch(function (err) {
        if (out) out.textContent = kbErrText(err, '模拟失败');
        showToast(kbErrText(err, '模拟失败'), 'error');
    });
}

// ---------- ⑦ 编辑与恢复 ----------
function kbEditHint(msg, type) {
    var el = document.getElementById('kb-edit-hint');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'kb-hint' + (type ? ' kb-hint-' + type : '');
}
function kbSetVal(id, v) { var el = document.getElementById(id); if (el) el.value = v; }
function kbSetChk(id, v) { var el = document.getElementById(id); if (el) el.checked = !!v; }
function kbLoadEdit() {
    var sel = document.getElementById('kb-edit-key');
    var key = sel ? sel.value : '';
    if (!key) { kbEditHint('请先选择或新建一个条目', 'warn'); return; }
    kbState.editAdding = false;
    return ZIYIT_API.knowledgeEntry(key).then(function (d) {
        d = d || {};
        kbState.editKey = d.key || key;
        kbState.editAdded = !!d.added;
        kbFillEditForm(d);
        kbEditHint('已载入「' + (d.title || d.key || key) + '」。改动即时生效，可切到「档位预览 / 模拟提问」核对。', 'ok');
    }).catch(function (err) {
        var m = kbErrText(err, '载入失败');
        kbEditHint(m, 'error');
        showToast(m, 'error');
    });
}
function kbFillEditForm(d) {
    var isAdded = !!d.added;
    kbSetVal('kb-edit-keyname', d.key || '');
    kbSetVal('kb-edit-level', String(d.level == null ? 0 : d.level));
    // 新增条目的「原标题 / 原正文」就是它自身，需要按 key 差异判断是否被改过
    kbSetVal('kb-edit-title', isAdded
        ? ((d.title && d.title !== d.key) ? d.title : '')
        : ((d.title && d.title !== d.docTitle) ? d.title : ''));
    kbSetVal('kb-edit-body', isAdded
        ? (d.text || '')
        : ((d.text && d.text !== d.docText) ? d.text : ''));
    kbSetChk('kb-edit-hidden', d.hidden);
    kbSetChk('kb-edit-added', d.added);
    var keyEl = document.getElementById('kb-edit-keyname');
    if (keyEl) keyEl.disabled = true;                 // 已有条目不允许改 key
    var addedEl = document.getElementById('kb-edit-added');
    if (addedEl) addedEl.disabled = true;             // added 标记不可后改
    var parentSel = document.getElementById('kb-edit-parent');
    if (parentSel) {
        parentSel.value = d.parent || '';
        if (d.parent && parentSel.value !== d.parent) {
            var o = document.createElement('option');
            o.value = d.parent; o.textContent = d.parent;
            parentSel.appendChild(o);
            parentSel.value = d.parent;
        }
        parentSel.disabled = true;                    // parent 只对新增条目生效
    }
}
function kbNewEntry() {
    kbState.editAdding = true;
    kbState.editKey = '';
    kbState.editAdded = true;
    kbSetVal('kb-edit-keyname', '');
    kbSetVal('kb-edit-level', '0');
    kbSetVal('kb-edit-title', '');
    kbSetVal('kb-edit-body', '');
    kbSetChk('kb-edit-hidden', false);
    kbSetChk('kb-edit-added', true);
    var keyEl = document.getElementById('kb-edit-keyname'); if (keyEl) keyEl.disabled = false;
    var addedEl = document.getElementById('kb-edit-added'); if (addedEl) addedEl.disabled = false;
    var parentSel = document.getElementById('kb-edit-parent'); if (parentSel) { parentSel.disabled = false; parentSel.value = ''; }
    var sel = document.getElementById('kb-edit-key'); if (sel) sel.value = '';
    kbEditHint('新建模式：条目 Key 使用新标题（不能与文档已有章节重名）；下方「正文覆盖」即该条目的内容。', 'warn');
}
function kbSaveEdit() {
    var keyEl = document.getElementById('kb-edit-keyname');
    var key = keyEl ? keyEl.value.trim() : '';
    if (!key) { kbEditHint('请填写条目 Key（新增时即新标题）', 'error'); showToast('请填写条目 Key', 'error'); return; }
    var lvEl = document.getElementById('kb-edit-level');
    var level = lvEl ? (Number(lvEl.value) || 0) : 0;
    var hiddenEl = document.getElementById('kb-edit-hidden');
    var hidden = !!(hiddenEl && hiddenEl.checked);
    var titleEl = document.getElementById('kb-edit-title');
    var titleVal = titleEl ? titleEl.value : '';
    var bodyEl = document.getElementById('kb-edit-body');
    var bodyVal = bodyEl ? bodyEl.value : '';
    var parentEl = document.getElementById('kb-edit-parent');
    var parentVal = parentEl ? parentEl.value : '';
    var payload = { key: key, level: level, hidden: hidden };
    if (kbState.editAdding) {
        if (!bodyVal.trim()) { kbEditHint('站长新增条目必须填写正文内容', 'error'); showToast('请填写正文内容', 'error'); return; }
        payload.added = true;
        payload.body = bodyVal;
        if (parentVal) payload.parent = parentVal;
    } else {
        payload.title = titleVal;    // 空串 = 还原文档原标题
        payload.body = bodyVal;      // 空串 = 还原文档原文
        if (kbState.editAdded) payload.added = true;
    }
    var btn = document.getElementById('kb-edit-save');
    if (btn) btn.disabled = true;
    ZIYIT_API.knowledgeUpsert(payload).then(function () {
        showToast(kbState.editAdding ? '新增成功（已即时生效）' : '保存成功（已即时生效）');
        kbEditHint('保存成功，改动已即时生效（无需发布）。', 'ok');
        kbState.editAdding = false;
        return kbLoad(true).then(function () {
            kbEnsureOption('kb-edit-key', key);
            return kbLoadEdit();
        });
    }).catch(function (err) {
        var m = kbErrText(err, '保存失败');
        kbEditHint(m, 'error');
        showToast(m, 'error');
    }).then(function () { if (btn) btn.disabled = false; });
}
function kbRestoreTitle() { kbRestoreField('title'); }
function kbRestoreBody() { kbRestoreField('body'); }
function kbRestoreField(field) {
    if (kbState.editAdding) { kbEditHint('新建模式下无需还原', 'warn'); return; }
    if (field === 'body' && kbState.editAdded) { kbEditHint('站长新增条目没有原始正文可还原', 'warn'); return; }
    var key = kbState.editKey || ((document.getElementById('kb-edit-key') || {}).value);
    if (!key) { kbEditHint('请先载入一个条目', 'warn'); return; }
    kbSetVal(field === 'title' ? 'kb-edit-title' : 'kb-edit-body', '');
    kbSaveEdit();   // 空串即还原
}
function kbSetPublic() {
    var key = kbState.editKey || ((document.getElementById('kb-edit-key') || {}).value);
    if (!key) { kbEditHint('请先载入一个条目', 'warn'); return; }
    ZIYIT_API.knowledgeReset({ keys: [key] }).then(function (d) {
        showToast('已恢复公开' + (d && d.changed ? '（改动 ' + d.changed + ' 条）' : ''));
        return kbLoad(true).then(function () {
            kbEnsureOption('kb-edit-key', key);
            return kbLoadEdit();
        });
    }).catch(function (err) {
        var m = kbErrText(err, '恢复失败');
        kbEditHint(m, 'error'); showToast(m, 'error');
    });
}
function kbDeleteEntry() {
    var key = kbState.editKey || ((document.getElementById('kb-edit-key') || {}).value);
    if (!key) { kbEditHint('请先载入一个条目', 'warn'); return; }
    if (kbState.editAdding || !kbState.editAdded) {
        var m = '只能删除站长新增条目，文档条目请使用「恢复公开/隐藏」功能';
        kbEditHint(m, 'error'); showToast(m, 'error'); return;
    }
    if (!confirm('确定删除站长新增条目「' + key + '」？该操作不可撤销。')) return;
    ZIYIT_API.knowledgeDelete(key).then(function () {
        showToast('已删除该新增条目');
        kbState.editAdding = false; kbState.editKey = ''; kbState.editAdded = false;
        kbSetVal('kb-edit-keyname', '');
        kbSetVal('kb-edit-body', '');
        kbEditHint('条目已删除。', 'ok');
        return kbLoad(true);
    }).catch(function (err) {
        var m = kbErrText(err, '删除失败');
        kbEditHint(m, 'error'); showToast(m, 'error');
    });
}
function kbResetAll() {
    if (!confirm('确定把所有条目恢复为「公开」？这只重置等级，不会删除站长修改的正文，也不会取消隐藏。')) return;
    ZIYIT_API.knowledgeReset({ all: true }).then(function (d) {
        showToast('已全部恢复公开' + (d && d.changed ? '（改动 ' + d.changed + ' 条）' : ''));
        return kbLoad(true);
    }).catch(function (err) {
        var m = kbErrText(err, '操作失败');
        showToast(m, 'error');
    });
}

// ---------- 事件绑定 ----------
document.addEventListener('DOMContentLoaded', function () {
    var menu = document.querySelector('.menu-item[data-section="knowledge-management"]');
    if (menu) menu.addEventListener('click', kbOnEnter);

    var refresh = document.getElementById('kb-refresh');
    if (refresh) refresh.addEventListener('click', function () {
        kbState.q = '';
        kbSetVal('kb-entries-q', '');
        kbLoad(true).then(function () { showToast('知识库已刷新'); });
    });

    var subtabs = document.getElementById('kb-subtabs');
    if (subtabs) subtabs.addEventListener('click', function (e) {
        var b = (e.target && e.target.closest) ? e.target.closest('.kb-subtab') : null;
        if (!b) return;
        if (!canAccess(4)) { showToast('知识库管理仅限站长（Lv.4）操作', 'error'); return; }
        kbSetTab(b.getAttribute('data-kbtab'));
        kbLazyLoadTab();
    });

    var lt = document.getElementById('kb-level-tabs');
    if (lt) lt.addEventListener('click', function (e) {
        var b = (e.target && e.target.closest) ? e.target.closest('.kb-tab[data-kblevel]') : null;
        if (!b) return;
        kbState.level = b.getAttribute('data-kblevel') || 'all';
        lt.querySelectorAll('.kb-tab').forEach(function (x) { x.classList.toggle('active', x === b); });
        kbRenderEntries();
        kbRenderTree();
    });

    var pt = document.getElementById('kb-preview-tabs');
    if (pt) pt.addEventListener('click', function (e) {
        var b = (e.target && e.target.closest) ? e.target.closest('.kb-tab[data-pvlevel]') : null;
        if (!b) return;
        kbLoadPreview(Number(b.getAttribute('data-pvlevel')) || 0);
    });

    var eb = document.getElementById('kb-entries-body');
    if (eb) eb.addEventListener('click', function (e) {
        var btn = (e.target && e.target.closest) ? e.target.closest('[data-kbact]') : null;
        if (!btn) return;
        var key = btn.getAttribute('data-kbkey');
        if (btn.getAttribute('data-kbact') === 'compare') kbOpenCompare(key); else kbOpenEdit(key);
    });
    var es = document.getElementById('kb-entries-search');
    if (es) es.addEventListener('click', function () {
        var qi = document.getElementById('kb-entries-q');
        kbState.q = qi ? qi.value.trim() : '';
        kbLoad(true);
    });
    var ec = document.getElementById('kb-entries-clear');
    if (ec) ec.addEventListener('click', function () {
        kbSetVal('kb-entries-q', '');
        kbState.q = '';
        kbLoad(true);
    });
    var eq = document.getElementById('kb-entries-q');
    if (eq) eq.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); if (es) es.click(); }
    });

    var tree = document.getElementById('kb-tree');
    if (tree) tree.addEventListener('click', function (e) {
        var node = (e.target && e.target.closest) ? e.target.closest('[data-kbkey]') : null;
        if (!node) return;
        kbOpenEdit(node.getAttribute('data-kbkey'));
    });

    var sb = document.getElementById('kb-search-btn');
    if (sb) sb.addEventListener('click', kbDoSearch);
    var sq = document.getElementById('kb-search-q');
    if (sq) sq.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); kbDoSearch(); }
    });
    var sr = document.getElementById('kb-search-results');
    if (sr) sr.addEventListener('click', function (e) {
        var btn = (e.target && e.target.closest) ? e.target.closest('[data-kbact]') : null;
        if (!btn) return;
        var key = btn.getAttribute('data-kbsearchkey');
        if (btn.getAttribute('data-kbact') === 'compare') kbOpenCompare(key); else kbOpenEdit(key);
    });

    var cl = document.getElementById('kb-compare-load');
    if (cl) cl.addEventListener('click', kbLoadCompare);
    var ck = document.getElementById('kb-compare-key');
    if (ck) ck.addEventListener('change', kbLoadCompare);
    var cd = document.getElementById('kb-compare-diff');
    if (cd) cd.addEventListener('change', function () { if (kbState.compareKey) kbLoadCompare(); });

    var ab = document.getElementById('kb-ask-btn');
    if (ab) ab.addEventListener('click', kbDoAsk);
    var aq = document.getElementById('kb-ask-q');
    if (aq) aq.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); kbDoAsk(); }
    });

    var el = document.getElementById('kb-edit-load');
    if (el) el.addEventListener('click', kbLoadEdit);
    var ek = document.getElementById('kb-edit-key');
    if (ek) ek.addEventListener('change', kbLoadEdit);
    var en = document.getElementById('kb-edit-new');
    if (en) en.addEventListener('click', kbNewEntry);
    var esv = document.getElementById('kb-edit-save');
    if (esv) esv.addEventListener('click', kbSaveEdit);
    var ert = document.getElementById('kb-edit-restore-title');
    if (ert) ert.addEventListener('click', kbRestoreTitle);
    var erb = document.getElementById('kb-edit-restore-body');
    if (erb) erb.addEventListener('click', kbRestoreBody);
    var ep = document.getElementById('kb-edit-public');
    if (ep) ep.addEventListener('click', kbSetPublic);
    var ed = document.getElementById('kb-edit-delete');
    if (ed) ed.addEventListener('click', kbDeleteEntry);
    var ra = document.getElementById('kb-reset-all');
    if (ra) ra.addEventListener('click', kbResetAll);

    // 直链 #knowledge-management（仅站长）
    if (location.hash === '#knowledge-management' && canAccess(4)) {
        adminSectionLocked = true;
        switchSection('knowledge-management');
        kbLoad(false);
    }
});