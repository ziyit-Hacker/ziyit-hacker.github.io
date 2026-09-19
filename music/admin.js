 






 
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
    });

     
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

function checkUserPermission() {
    const authToken = ZIYIT_API.getToken();

    if (!authToken) {
        alert('请先登录以访问管理员页面');
        window.location.href = '../user/';
        return;
    }

     
    window.ZIYIT_ON_UNAUTHORIZED = function () {
        if (window.location.href.indexOf('music/admin') === -1) return;
        alert('登录已过期，请重新登录');
        window.location.href = '../user/';
    };

    ZIYIT_API.adminMe().then(function (me) {
        if (!me) {
            alert('您没有权限访问管理员页面');
            window.location.href = '../user/';
            return;
        }
        const level = Number(me.level != null ? me.level : 0);
        if (!level) {
            alert('您没有权限访问管理员页面');
            window.location.href = '../user/';
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

        applyMenuByLevel();
         
        chatLoadHistory();
        const bcastBtn = document.getElementById('broadcast-btn');
        if (bcastBtn) bcastBtn.style.display = canAccess(2) ? '' : 'none';
        if (!chatPollTimer) {
            chatPollTimer = setInterval(pollChatInbox, 5000);
            setTimeout(pollChatInbox, 300);
        }
         
        const firstVisible = document.querySelector('.sidebar-menu .menu-item[data-level]:not([style*="display: none"])');
        if (firstVisible && firstVisible.getAttribute('data-section')) {
            switchSection(firstVisible.getAttribute('data-section'));
        }
    }).catch(function (err) {
        console.error('权限校验失败:', err);
        if (err && err.status === 403) {
            alert('您没有权限访问管理员页面');
        } else if (err && err.status === 401) {
            alert('登录已过期，请重新登录');
        } else {
            alert('您没有权限访问管理员页面');
        }
        window.location.href = '../user/';
    });
}






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

        const avatar = document.createElement('div');
        avatar.className = 'user-avatar-small';
        avatar.textContent = username.charAt(0).toUpperCase();

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

 
let apiKeyList = [];
let editingApiKey = null;

function apiKeyFields(k) {
    if (!k) return {};
    return {
        key: k.api_key || k.apiKey || k.key || k.keyHash || k.apiKeyHash || '-',
        userId: k.userId != null ? k.userId : (k.user_id != null ? k.user_id : '-'),
        username: k.username || k.userName || '',
        status: k.status || 'active',
        limit: k.monthly_limit != null ? k.monthly_limit : (k.monthlyLimit != null ? k.monthlyLimit : -1),
        used: k.used_count != null ? k.used_count : (k.usedCount != null ? k.usedCount : 0),
        daily: k.daily_limit != null ? k.daily_limit : (k.dailyLimit != null ? k.dailyLimit : -1),
        dailyUsed: k.daily_count != null ? k.daily_count : (k.dailyCount != null ? k.dailyCount : 0),
        warn: k.warn_limit != null ? k.warn_limit : (k.warnLimit != null ? k.warnLimit : -1),
        origins: Array.isArray(k.allowed_origins) ? k.allowed_origins.slice() : (Array.isArray(k.allowedOrigins) ? k.allowedOrigins.slice() : []),
        resetMonth: k.reset_month || k.resetMonth || '',
        created: k.created_at || k.createdAt || k.createTime || k.created || ''
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
            + '<div class="user-del-date">每月限制: ' + (f.limit === -1 || f.limit === '-1' ? '无限' : escAdmin(f.limit) + ' 次')
            + ' ｜ 已用: ' + escAdmin(f.used) + ' 次'
            + (f.resetMonth ? ' ｜ 重置月: ' + escAdmin(f.resetMonth) : '')
            + (f.created ? ' ｜ 创建: ' + escAdmin(String(f.created).slice(0, 10)) : '')
            + '<br>每日限制: ' + (f.daily === -1 || f.daily === '-1' ? '不限' : escAdmin(f.daily) + ' 次')
            + ' ｜ 今日已用: ' + escAdmin(f.dailyUsed) + ' 次'
            + ' ｜ 预警: ' + (f.warn === -1 || f.warn === '-1' ? '关闭' : escAdmin(f.warn))
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
    const btn = document.getElementById('confirm-api-key');
    btn.disabled = true;
     
    ZIYIT_API.request('/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId })
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
    document.getElementById('apikey-edit-limit').value = cur ? cur.limit : -1;
     
    const limitInput = document.getElementById('apikey-edit-limit');
    limitInput.title = canAccess(4) ? '每月限制（-1 = 无限）' : '仅 4 级超级管理员可设置无限额度（-1）';
    limitInput.disabled = !canAccess(4);

     
    const dailyUnlimited = !cur || cur.daily === -1 || cur.daily === '-1' || cur.daily == null;
    document.getElementById('apikey-edit-daily-unlimited').checked = dailyUnlimited;
    document.getElementById('apikey-edit-daily').value = dailyUnlimited ? '' : cur.daily;
    setEditDailyDisabled();

     
    const warnOff = !cur || cur.warn === -1 || cur.warn === '-1' || cur.warn == null;
    document.getElementById('apikey-edit-warn-off').checked = warnOff;
    document.getElementById('apikey-edit-warn').value = warnOff ? '' : cur.warn;
    setEditWarnDisabled();

     
    document.getElementById('apikey-edit-origins').value = cur ? cur.origins.join('\n') : '';

    document.getElementById('api-key-edit-modal').classList.add('active');
}

function setEditDailyDisabled() {
    const un = document.getElementById('apikey-edit-daily-unlimited').checked;
    const input = document.getElementById('apikey-edit-daily');
    input.disabled = un;
    if (un) input.value = '';
}

function setEditWarnDisabled() {
    const off = document.getElementById('apikey-edit-warn-off').checked;
    const input = document.getElementById('apikey-edit-warn');
    input.disabled = off;
    if (off) input.value = '';
}

function saveApiKeyEdit() {
    if (!editingApiKey) return;
    const status = document.getElementById('apikey-edit-status').value;
    const limitRaw = document.getElementById('apikey-edit-limit').value;
    const limit = parseInt(limitRaw, 10);
     
    const maxQuota = currentAdminLevel === 4 ? Infinity : (currentAdminLevel === 3 ? 10 : 5);
    if (isNaN(limit) || limit === -1) {
        if (!canAccess(4)) {
            alert('仅 4 级超级管理员可设置无限额度（-1）');
            return;
        }
    } else if (limit > maxQuota) {
        alert('当前等级额度上限为 ' + (maxQuota === Infinity ? '无限' : maxQuota) + '，不能设置更高额度');
        return;
    }
     
    let daily = -1;
    if (!document.getElementById('apikey-edit-daily-unlimited').checked) {
        daily = parseInt(document.getElementById('apikey-edit-daily').value, 10);
        if (isNaN(daily) || daily < 0) {
            alert('请输入有效的每日额度（≥0），或勾选「今日不限」');
            return;
        }
    }
     
    let warn = -1;
    if (!document.getElementById('apikey-edit-warn-off').checked) {
        warn = parseInt(document.getElementById('apikey-edit-warn').value, 10);
        if (isNaN(warn) || warn < 0) {
            alert('请输入有效的预警额度（≥0），或勾选「关闭预警」');
            return;
        }
    }
     
    const origins = document.getElementById('apikey-edit-origins').value
        .split('\n')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s; });
    ZIYIT_API.request('/admin/api-keys/' + encodeURIComponent(editingApiKey), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: status,
            monthly_limit: isNaN(limit) ? -1 : limit,
            daily_limit: daily,
            warn_limit: warn,
            allowed_origins: origins
        })
    }).then(function () {
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

function rcUserKeys(u) {
    return Array.isArray(u.keys) ? u.keys
        : (Array.isArray(u.rcKeys) ? u.rcKeys
            : (Array.isArray(u.softwareKeys) ? u.softwareKeys
                : (Array.isArray(u.keyList) ? u.keyList : [])));
}

function rcKeyFields(k) {
    if (!k) return {};
    return {
        hash: k.keyHash || k.key_hash || k.hash || k.key || '-',
        permission: k.permission || '-',
        validDays: k.validDays != null ? k.validDays : (k.valid_days != null ? k.valid_days : '-'),
        expire: k.expireAt || k.expire_at || k.expiresAt || k.expireTime || k.expiry || ''
    };
}

function loadRcKeys() {
    if (!canAccess(3)) { alert('仅 Lv.3+ 管理员可访问 RC 软件密钥'); return; }
    document.getElementById('rc-key-list').innerHTML = loadingHTML();;
    return ZIYIT_API.request('/admin/keys').then(function (data) {
        rcKeyList = Array.isArray(data) ? data : (data.keys || data.users || data.data || []);
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
            return String(rcKeyFields(k).hash || '');
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
                html += '<div class="user-email" style="font-family: monospace;">🔑 ' + escAdmin(kf.hash)
                    + ' ｜ 权限: ' + escAdmin(kf.permission)
                    + ' ｜ 有效: ' + escAdmin(kf.validDays) + ' 天'
                    + (kf.expire ? ' ｜ 到期: ' + escAdmin(kf.expire) : '')
                    + ' <button class="action-btn danger" data-ruid="' + escAdmin(userId) + '" data-rhash="' + escAdmin(kf.hash) + '" style="font-size:11px;padding:2px 8px;margin-left:4px;">移除</button>'
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
    area.querySelectorAll('[data-rhash]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            removeKey(btn.getAttribute('data-ruid'), btn.getAttribute('data-rhash'));
        });
    });
}

function openAddKey(u) {
    keyTargetUser = u;
    const userId = u.userId != null ? u.userId : (u.user_id != null ? u.user_id : '-');
    document.getElementById('key-userinfo').value = (u.username || u.userName || '') + '（ID: ' + userId + '）';
    document.getElementById('key-hash').value = '';
    document.getElementById('key-permission').value = 'Pr';
    document.getElementById('key-valid-days').value = '365';
    document.getElementById('key-add-modal').classList.add('active');
}

function saveKeyAdd() {
    if (!keyTargetUser) return;
    const userId = keyTargetUser.userId != null ? keyTargetUser.userId : keyTargetUser.user_id;
    const hash = document.getElementById('key-hash').value.trim();
    if (!hash) {
        alert('请输入密钥哈希');
        return;
    }
    const permission = document.getElementById('key-permission').value;
    const validDays = parseInt(document.getElementById('key-valid-days').value, 10) || 365;
    ZIYIT_API.request('/admin/users/' + userId + '/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyHash: hash, permission: permission, validDays: validDays })
    }).then(function () {
        alert('密钥已添加');
        document.getElementById('key-add-modal').classList.remove('active');
        loadRcKeys();
    }).catch(function (err) {
        alert('添加失败: ' + (err.message || err));
    });
}

function removeKey(userId, keyHash) {
    if (!confirm('确定移除密钥 ' + keyHash + ' 吗？')) return;
    ZIYIT_API.request('/admin/users/' + userId + '/keys/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyHash: keyHash })
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

     
    document.querySelector('[data-section="user-management"]').addEventListener('click', function () {
         
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById('user-management').classList.add('active');

         
        loadUsers();
        loadIpBans();
    });

     
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
    document.getElementById('apikey-edit-warn-off').addEventListener('change', setEditWarnDisabled);

     
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
        type: a.type || a.role || a.permission || a.user_type || a.Permission || '',
        quota: a.quota != null ? a.quota : (a.verify_quota != null ? a.verify_quota : (a.monthly_limit != null ? a.monthly_limit : ''))
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
        const isSuper = f.userId === 1 || String(f.type).toLowerCase() === 'adminstrator';
        const levelCls = f.level === 4 ? 'normal' : (f.level === 3 ? 'edit' : 'banned');
        html += '<div class="user-item wide-item"><div class="user-details">'
            + '<div class="user-name">' + escAdmin(f.username) + (isSuper ? ' <span style="color: var(--ziyit-danger);">🔒</span>' : '') + '</div>'
            + '<div class="user-type ' + levelCls + '">' + adminLevelName(f.level) + '（Lv.' + f.level + '）</div>'
            + '<div class="user-del-date">ID: ' + escAdmin(f.userId)
            + (f.quota !== '' ? ' ｜ 人机验证额度: ' + (f.quota === -1 ? '无限' : escAdmin(f.quota)) : '')
            + (f.type ? ' ｜ 类型: ' + escAdmin(f.type) : '')
            + '</div>'
            + '</div><div class="user-actions">'
            + (String(f.userId) !== String(meId) ? '<button class="action-btn" data-act="chat" data-idx="' + adminList.indexOf(a) + '">私聊</button>' : '')
            + (canAccess(4) ? '<button class="action-btn edit" data-act="edit" data-idx="' + adminList.indexOf(a) + '">编辑</button>'
                + (isSuper ? '' : '<button class="action-btn delete" data-act="del" data-idx="' + adminList.indexOf(a) + '">撤销</button>') : '')
            + '</div></div>';
    });
    area.innerHTML = html;
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
            + '<div class="user-name">ID ' + escAdmin(m.id) + (isLocked ? ' <span style="color: var(--ziyit-danger);">🔒</span>' : '') + '</div>'
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
    document.getElementById('promote-user-modal').classList.add('active');
}

function closePromoteModal() {
    document.getElementById('promote-user-modal').classList.remove('active');
    promoteTarget = null;
}

function confirmPromoteUser() {
    if (!promoteTarget) return;
    const type = document.getElementById('promote-type').value;
    const userId = promoteTarget.userId;
    const btn = document.getElementById('confirm-promote-user');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-inline"></span>提交中...';
    ZIYIT_API.adminPromoteUser(userId, type).then(function () {
        alert(promoteTarget.username + ' 已升级为' + (type === 'admin' ? '管理员' : 'VIP用户'));
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
            + '<div class="chat-session-name">' + (s.peerId === 'broadcast' ? '📢 ' : '') + escAdmin(s.peerName) + unread + '</div>'
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
    if (title) title.textContent = (s.peerId === 'broadcast' ? '📢 系统广播' : escAdmin(s.peerName));
     
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
            + '<div class="chat-msg-meta">' + (bcast ? '📢 ' : '') + escAdmin(who)
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
            ? '🔄 转人工：' : '💬 用户：';
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
            + '<div style="font-weight:600; color:#e74c3c;">🔒 封禁信息（申诉中）</div>'
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
            html += '<div class="chat-broadcast chat-msg"><div class="chat-msg-bubble">🔄 ' + escAdmin(content || '请求转接人工客服') + '</div></div>';
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
        st.textContent = a.online ? '🟢 在线' : '⚪ 离线';
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