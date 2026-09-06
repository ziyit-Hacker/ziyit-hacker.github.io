 
let downloadQueue = [];
let currentDownload = null;
let downloadHistory = new Map();  

 
let cachedUser = null;
let cachedUserLoaded = false;
ZIYIT_API.currentUser().then(function (u) {
    cachedUser = u;
    cachedUserLoaded = true;
    window.dispatchEvent(new Event('ziyit-user-ready'));
}).catch(function () {
    cachedUserLoaded = true;
    window.dispatchEvent(new Event('ziyit-user-ready'));
});

 
function waitForUserReady() {
    if (cachedUserLoaded) return Promise.resolve(cachedUser);
    return new Promise(function (resolve) {
        window.addEventListener('ziyit-user-ready', function () {
            resolve(cachedUser);
        }, { once: true });
    });
}

window.addEventListener('ziyit-user-ready', function () {
    if (musicList.length > 0) {
        renderMusicList();
        populateExportSelect();
    }
});

 
document.addEventListener('DOMContentLoaded', checkUserPermission);

 
let currentMusicIndex = -1;
let musicList = [];
let isPlaying = false;
let lyricsData = [];
let currentLyricIndex = -1;
let isVideoMode = false;  
let currentVideoPath = '';  

const audioPlayer = document.getElementById('audio-player');
const videoPlayer = document.getElementById('video-player');
const videoContainer = document.getElementById('video-container');
const videoBtn = document.getElementById('video');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const currentSong = document.querySelector('.current-song');
const playerStatus = document.querySelector('.player-status');
const progress = document.getElementById('progress');
const musicListElement = document.getElementById('music-list');
const currentTimeElement = document.getElementById('current-time');
const totalTimeElement = document.getElementById('total-time');
const lyricsContent = document.getElementById('lyrics-content');

 
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) {
        return '**:**';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

 
function updateTimeDisplay() {
    const currentTime = isVideoMode ? videoPlayer.currentTime : audioPlayer.currentTime;
    
     
    let duration;
    if (isVipTrialMode && !isVideoMode) {
        duration = 15;  
    } else {
        duration = isVideoMode ? videoPlayer.duration : audioPlayer.duration;
    }

    currentTimeElement.textContent = formatTime(currentTime);
    totalTimeElement.textContent = formatTime(duration);
}

 
function updateProgressBar() {
    const currentTime = isVideoMode ? videoPlayer.currentTime : audioPlayer.currentTime;
    
     
    let duration;
    if (isVipTrialMode && !isVideoMode) {
        duration = 15;  
    } else {
        duration = isVideoMode ? videoPlayer.duration : audioPlayer.duration;
    }

    if (duration > 0) {
        const progressPercent = (currentTime / duration) * 100;
        progress.style.width = `${progressPercent}%`;
    }
}

 
function parseLyricTime(timeStr) {
    const match = timeStr.match(/\[(\d+):(\d+)\.(\d+)\]/);
    if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const milliseconds = parseInt(match[3]);
        return minutes * 60 + seconds + milliseconds / 100;
    }
    return 0;
}

 
function parseLyrics(lyricsText) {
    const lines = lyricsText.split('\n');
    const lyrics = [];

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;  

         
        const match = line.match(/^\[(\d+):(\d+)\.(\d+)\](.*)$/);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = parseInt(match[3]);
            const text = match[4].trim();

            if (text) {  
                const timeInSeconds = minutes * 60 + seconds + milliseconds / 100;
                lyrics.push({
                    time: timeInSeconds,
                    text: text,
                    original: line
                });
            }
        } else {
             
            console.log('无法解析的歌词行:', line);
        }
    });

     
    lyrics.sort((a, b) => a.time - b.time);
    console.log('解析后的歌词数据:', lyrics);
    return lyrics;
}

 
function updateLyrics(currentTime) {
     
     

     
    let newIndex = -1;
    for (let i = lyricsData.length - 1; i >= 0; i--) {
        if (currentTime >= lyricsData[i].time) {
            newIndex = i;
            break;
        }
    }

     
    if (newIndex === currentLyricIndex) return;

    currentLyricIndex = newIndex;

     
    const lyricsHTML = lyricsData.map((lyric, index) => {
        const isCurrent = index === currentLyricIndex;
        const className = isCurrent ? 'lyric-current' : 'lyric-normal';
        return `<div class="${className}" data-time="${lyric.time}" onclick="seekToLyricTime(${lyric.time})">${lyric.text}</div>`;
    }).join('');

    lyricsContent.innerHTML = lyricsHTML;

     
    if (currentLyricIndex >= 0) {
         
        setTimeout(() => {
            const currentLyricElement = lyricsContent.children[currentLyricIndex];
            if (currentLyricElement) {
                 
                if (!isVideoMode) {
                     
                    currentLyricElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });
                }
                 
            }
        }, 50);
    }
}

 
 
function seekToLyricTime(time) {
    if (isVideoMode) {
        if (videoPlayer.duration) {
            videoPlayer.currentTime = time;
            if (videoPlayer.paused) {
                videoPlayer.play();
                isPlaying = true;
                playBtn.textContent = '||';
                playerStatus.textContent = '播放中';
            }
        }
    } else {
        if (audioPlayer.duration) {
            audioPlayer.currentTime = time;
             
            if (audioPlayer.paused) {
                audioPlayer.play();
                isPlaying = true;
                playBtn.textContent = '||';
                playerStatus.textContent = '播放中';
            }
        }
    }
}

 
async function loadLyrics(lyricsPath) {
    if (lyricsPath === '[NO DATA]') {
        lyricsContent.innerHTML = '<div class="lyric-normal">暂无歌词</div>';
        lyricsData = [];
        currentLyricIndex = -1;
        return;
    }

    try {
         
        const normalizedPath = lyricsPath.replace(/\\/g, '/');
        console.log('加载歌词文件:', normalizedPath);
        const response = await fetch(normalizedPath);
        if (!response.ok) {
            throw new Error('歌词文件不存在');
        }
        const lyricsText = await response.text();
        console.log('歌词文件内容:', lyricsText);
        lyricsData = parseLyrics(lyricsText);
        currentLyricIndex = -1;

        if (lyricsData.length === 0) {
            lyricsContent.innerHTML = '<div class="lyric-normal">暂无歌词</div>';
        } else {
             
            const lyricsHTML = lyricsData.map(lyric =>
                `<div class="lyric-normal" data-time="${lyric.time}" onclick="seekToLyricTime(${lyric.time})">${lyric.text}</div>`
            ).join('');
            lyricsContent.innerHTML = lyricsHTML;
        }
    } catch (error) {
        console.error('加载歌词失败:', error);
        lyricsContent.innerHTML = '<div class="lyric-normal">暂无歌词</div>';
        lyricsData = [];
        currentLyricIndex = -1;
    }
}

 
function renderMusicList() {
    musicListElement.innerHTML = '';
    const isVIP = isVIPUser();

    musicList.forEach((music, index) => {
        const parts = music.split(' \\ ');
        const name = parts[0];
        const location = parts[1];
        const lyricsPath = parts[2];
        const vipStatus = parts[3] || 'UR';  
        const videoPath = parts[4] || '[NO DATA]';  
        const imgPath = parts[5] || '[NO DATA]';  

         
        let imageContent;
        if (imgPath === '[NO DATA]') {
            imageContent = `<img src="../assets/ziyit.png" alt="${name}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;">`;
        } else {
             
            const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];
            const isImagePath = imageExtensions.some(ext => imgPath.toLowerCase().endsWith(ext));
            
            if (isImagePath) {
                imageContent = `<img src="${imgPath}" alt="${name}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;">`;
            } else {
                 
                imageContent = generateTextDisplay(imgPath, name);
            }
        }

        const li = document.createElement('li');
        li.className = 'music-item';

         
        if (vipStatus === 'VIP') {
            li.style.backgroundColor = '#fff3cd';  
            li.style.borderLeft = '4px solid #ffc107';  
             
            const vipActionHtml = isVIP
                ? downloadButtonHtml(index, 'vip')
                : '<span style="background-color: #ffc107; color: #856404; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">VIP专属</span>';
            li.innerHTML = `
                        <div style="display: flex; align-items: center; width: 100%; gap: 12px;">
                            ${imageContent}
                            <div style="flex: 1; display: flex; justify-content: space-between; align-items: center;">
                                <span>${name}</span>
                                ${vipActionHtml}
                            </div>
                        </div>
                    ` + (isVIP ? downloadProgressHtml(index) : '');
        } else {
             
            if (isVIP) {
                li.innerHTML = `
                            <div style="display: flex; align-items: center; width: 100%; gap: 12px;">
                                ${imageContent}
                                <div style="flex: 1; display: flex; justify-content: space-between; align-items: center;">
                                    <span>${name}</span>
                                    ${downloadButtonHtml(index, 'vip')}
                                </div>
                            </div>
                        ` + downloadProgressHtml(index);
            } else if (vipStatus === 'DL') {
                 
                li.innerHTML = `
                            <div style="display: flex; align-items: center; width: 100%; gap: 12px;">
                                ${imageContent}
                                <div style="flex: 1; display: flex; justify-content: space-between; align-items: center;">
                                    <span>${name}</span>
                                    ${downloadButtonHtml(index, 'dl')}
                                </div>
                            </div>
                        ` + downloadProgressHtml(index);
            } else {
                li.innerHTML = `
                            <div style="display: flex; align-items: center; width: 100%; gap: 12px;">
                                ${imageContent}
                                <span>${name}</span>
                            </div>
                        `;
            }
        }

        li.addEventListener('click', () => playMusic(index));
        musicListElement.appendChild(li);
    });
}

 
function downloadButtonHtml(index, kind) {
    var btnStyle = kind === 'dl'
        ? 'background-color: #17a2b8; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;'
        : 'background-color: #28a745; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;';
    var btnLabel = kind === 'dl' ? '下载（普通用户）' : '下载';
    var onclick = kind === 'dl'
        ? `downloadMusicForNormalUser(${index}, event)`
        : `downloadMusic(${index}, event)`;
    return `<button class="download-btn" onclick="${onclick}" style="${btnStyle}">${btnLabel}</button>`;
}

 
function downloadProgressHtml(index) {
    return `
                        <div class="download-progress-container" id="download-progress-${index}" style="display: none;">
                            <div class="download-progress-bar">
                                <div class="download-progress" id="download-progress-bar-${index}"></div>
                            </div>
                            <div class="download-progress-text" id="download-progress-text-${index}">0%</div>
                        </div>
                        <div class="connection-nodes" id="connection-nodes-${index}" style="display: none;">
                            <div class="connection-node"></div>
                            <div class="connection-node"></div>
                            <div class="connection-node"></div>
                            <div class="connection-node"></div>
                            <div class="connection-node"></div>
                        </div>
                        <div class="download-info-container" id="download-info-${index}" style="display: none;">
                            <div class="download-info-item">
                                <span class="download-info-label">速度:</span>
                                <span class="download-info-value" id="download-speed-${index}">0 KB/s</span>
                            </div>
                            <div class="download-info-item">
                                <span class="download-info-label">剩余:</span>
                                <span class="download-info-value" id="download-eta-${index}">--:--</span>
                            </div>
                            <div class="download-info-item">
                                <span class="download-info-label">已下载:</span>
                                <span class="download-info-value" id="download-received-${index}">0 B</span>
                            </div>
                        </div>
                        <div class="download-status" id="download-status-${index}" style="display: none;"></div>
                    `;
}

 
function generateTextDisplay(text, altText) {
     
    try {
         
        if (text.trim().startsWith('[') && text.trim().endsWith(']')) {
            const jsonArray = JSON.parse(text);
            if (Array.isArray(jsonArray)) {
                let html = '<div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border-radius: 4px; font-size: 10px; line-height: 1; text-align: center; overflow: hidden; padding: 2px;">';
                jsonArray.forEach(item => {
                    if (item && typeof item === 'object' && item.text) {
                        const color = item.color || '#000000';
                        const font = item.font || 'Arial, sans-serif';
                        html += `<span style="color: ${color}; font-family: ${font}; display: block;">${item.text}</span>`;
                    }
                });
                html += '</div>';
                return html;
            }
        }
        
         
        if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
            const jsonObj = JSON.parse(text);
            if (jsonObj && typeof jsonObj === 'object' && jsonObj.text) {
                const color = jsonObj.color || '#000000';
                const font = jsonObj.font || 'Arial, sans-serif';
                return `<div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border-radius: 4px; font-size: 10px; line-height: 1; text-align: center; overflow: hidden; padding: 2px; color: ${color}; font-family: ${font};">${jsonObj.text}</div>`;
            }
        }
    } catch (e) {
         
    }
    
     
    const maxLength = 6;  
    let displayText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    
     
    let fontSize = 12;
    if (text.length <= 2) fontSize = 14;
    else if (text.length <= 4) fontSize = 12;
    else if (text.length <= 6) fontSize = 10;
    else fontSize = 8;
    
    return `<div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border-radius: 4px; font-size: ${fontSize}px; font-weight: bold; color: #333; font-family: Arial, sans-serif; line-height: 1; text-align: center; overflow: hidden; padding: 2px;" title="${text}">${displayText}</div>`;
}

 
async function loadMusicList() {
    try {
        console.log('开始加载音乐列表数据...');
        const response = await fetch('./music.txt');
        if (!response.ok) {
            throw new Error('音乐列表文件不存在');
        }
        const musicText = await response.text();
        console.log('音乐列表文件内容:', musicText);

         
        musicList = musicText.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => line.trim());

        console.log('解析后的音乐列表:', musicList);

         
        renderMusicList();
        console.log('音乐列表渲染完成，共加载', musicList.length, '首歌曲');
    } catch (error) {
        console.error('加载音乐列表失败:', error);
        musicListElement.innerHTML = '<li style="color: red; text-align: center;">加载音乐列表失败，请刷新页面重试</li>';
    }
}

 
function isVIPUser() {
    if (cachedUser) {
        return ZIYIT_API.isVip(cachedUser) || cachedUser.username === 'Minecraft_zy227';
    }
    return false;
}

 
function isSuperAdmin() {
    if (cachedUser) {
        return cachedUser.username === 'Minecraft_zy227';
    }
    return false;
}

 
let vipTrialTimer = null;
let isVipTrialMode = false;  
let vipTrialMusicIndex = -1;  

 
async function loadAudioSecurely(location, isVIPMusic, isVIPUser) {
    try {
         
        showLoadingProgress('音频缓冲中...', 0);

         
        if (isVIPMusic && !isVIPUser) {
             
            const response = await fetch(location);

            if (!response.ok) {
                hideLoadingProgress();
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const contentLength = parseInt(response.headers.get('content-length') || '285000');
            const audioData = await response.arrayBuffer();

             
            updateLoadingProgress(100, '音频数据处理中...');

            const blob = new Blob([audioData], { type: 'audio/mpeg' });
            hideLoadingProgress();
            return URL.createObjectURL(blob);
        } else if (isVIPUser) {
             
            hideLoadingProgress();
            return location;  
        } else {
             
            const response = await fetch(location);

            if (!response.ok) {
                hideLoadingProgress();
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const contentLength = parseInt(response.headers.get('content-length') || '1000000');
            let loaded = 0;
             
            const startTime = Date.now();
             
            const reader = response.body.getReader();
            const chunks = [];
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                loaded += value.length;

                 
                const progress = Math.min(Math.round((loaded / contentLength) * 100), 100);

                 
                const elapsedTime = Date.now() - startTime;
                const speed = loaded / (elapsedTime / 1000);  
                const remainingBytes = contentLength - loaded;
                const remainingTime = speed > 0 ? Math.round(remainingBytes / speed) : 0;
                 
                updateLoadingProgress(progress, `缓冲中... 预估剩余时间: ${formatTime(remainingTime)}`);
            }
             
            const audioData = new Uint8Array(loaded);
            let position = 0;
            for (const chunk of chunks) {
                audioData.set(chunk, position);
                position += chunk.length;
            }

             
            updateLoadingProgress(100, '音频数据处理中...');

            const blob = new Blob([audioData], { type: 'audio/mpeg' });
            hideLoadingProgress();
            return URL.createObjectURL(blob);
        }
    } catch (error) {
        hideLoadingProgress();
        console.error('加载音频文件失败:', error);
        throw error;
    }
}

 
function showLoadingProgress(message, progress) {
    let progressContainer = document.getElementById('loading-progress-container');
    if (!progressContainer) {
        progressContainer = document.createElement('div');
        progressContainer.id = 'loading-progress-container';
        progressContainer.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 30px;
                    border-radius: 15px;
                    z-index: 10000;
                    font-size: 16px;
                    font-weight: bold;
                    min-width: 300px;
                    text-align: center;
                `;

        const messageElement = document.createElement('div');
        messageElement.id = 'loading-progress-message';
        messageElement.style.marginBottom = '15px';
        messageElement.textContent = message;

        const progressBarContainer = document.createElement('div');
        progressBarContainer.style.cssText = `
                    width: 100%;
                    height: 20px;
                    background: #333;
                    border-radius: 10px;
                    overflow: hidden;
                    margin-bottom: 10px;
                `;

        const progressBar = document.createElement('div');
        progressBar.id = 'loading-progress-bar';
        progressBar.style.cssText = `
                    height: 100%;
                    background: linear-gradient(90deg, #4CAF50, #45a049);
                    border-radius: 10px;
                    width: ${progress}%;
                    transition: width 0.3s ease;
                `;

        const progressText = document.createElement('div');
        progressText.id = 'loading-progress-text';
        progressText.style.cssText = `
                    font-size: 14px;
                    color: #ccc;
                `;
        progressText.textContent = `${progress}%`;

        const timeText = document.createElement('div');
        timeText.id = 'loading-time-text';
        timeText.style.cssText = `
                    font-size: 12px;
                    color: #999;
                    margin-top: 5px;
                `;

        progressBarContainer.appendChild(progressBar);
        progressContainer.appendChild(messageElement);
        progressContainer.appendChild(progressBarContainer);
        progressContainer.appendChild(progressText);
        progressContainer.appendChild(timeText);
        document.body.appendChild(progressContainer);
    }

    document.getElementById('loading-progress-message').textContent = message;
    document.getElementById('loading-progress-bar').style.width = `${progress}%`;
    document.getElementById('loading-progress-text').textContent = `${progress}%`;
    progressContainer.style.display = 'block';

     
    window.loadingStartTime = Date.now();
}

 
function updateLoadingProgress(progress, message) {
    const progressContainer = document.getElementById('loading-progress-container');
    if (!progressContainer) return;

    if (message) {
        document.getElementById('loading-progress-message').textContent = message;
    }

    document.getElementById('loading-progress-bar').style.width = `${progress}%`;
    document.getElementById('loading-progress-text').textContent = `${progress}%`;

     
    if (progress > 0) {
        const elapsedTime = Date.now() - window.loadingStartTime;
        const totalEstimatedTime = (elapsedTime / progress) * 100;
        const remainingTime = totalEstimatedTime - elapsedTime;

        const timeText = document.getElementById('loading-time-text');
        if (timeText) {
            timeText.textContent = `预估剩余时间: ${formatTime(Math.max(0, Math.round(remainingTime / 1000)))}`;
        }
    }
}

 
function hideLoadingProgress() {
    const progressContainer = document.getElementById('loading-progress-container');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
}

 
function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds}秒`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}分${remainingSeconds}秒`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}时${minutes}分`;
    }
}

 
function showLoadingMessage(message) {
    showLoadingProgress(message, 0);
}

 
function hideLoadingMessage() {
    hideLoadingProgress();
}

 
async function playMusic(index) {
    if (index < 0 || index >= musicList.length) return;

    const parts = musicList[index].split(' \\ ');
    const name = parts[0];
    const location = parts[1];
    const lyricsPath = parts[2];
    const vipStatus = parts[3] || 'UR';
    const videoPath = parts[4] || '[NO DATA]';  

     
    if (videoPath !== '[NO DATA]' && videoPath.trim() !== '') {
         
        videoBtn.classList.remove('hidden');
        currentVideoPath = videoPath;
    } else {
         
        videoBtn.classList.add('hidden');
        currentVideoPath = '';
    }

     
    await waitForUserReady();

     
    if (vipStatus === 'VIP' && !isVIPUser()) {
         
        if (vipTrialTimer) {
            clearTimeout(vipTrialTimer);
            vipTrialTimer = null;
        }

         
        isVipTrialMode = true;
        vipTrialMusicIndex = index;

        try {
             
            const secureUrl = await loadAudioSecurely(location, true, false);
            audioPlayer.src = secureUrl;

            currentMusicIndex = index;
            currentSong.textContent = name + ' (试听中...)';

             
            document.querySelectorAll('.music-item').forEach((item, i) => {
                item.classList.toggle('playing', i === index);
            });

             
            currentTimeElement.textContent = '00:00';
            totalTimeElement.textContent = '00:15';

             
            loadLyrics(lyricsPath);

             
            const playPromise = audioPlayer.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                     
                    isPlaying = true;
                    playBtn.textContent = '||';
                    playerStatus.textContent = '试听中';
                }).catch(error => {
                     
                    console.log('自动播放被阻止，需要用户点击播放按钮');
                     
                    isPlaying = false;
                    playBtn.textContent = '▶';
                    playerStatus.textContent = '点击播放开始试听';
                });
            } else {
                 
                isPlaying = true;
                playBtn.textContent = '||';
                playerStatus.textContent = '试听中';
            }

             
            vipTrialTimer = setTimeout(() => {
                 
                audioPlayer.pause();
                isPlaying = false;
                playBtn.textContent = '▶';
                playerStatus.textContent = '试听结束';
                isVipTrialMode = false;

                 
                const confirmVIP = confirm('试听结束！这是VIP专属音乐，需要VIP才能完整收听。\n\n点击"确定"将自动播放下一首免费音乐。');

                if (confirmVIP) {
                     
                    playNextFreeMusic(index);
                     
                    currentSong.textContent = '请选择一首歌曲';
                    playerStatus.textContent = '暂停中';
                    audioPlayer.src = '';
                    currentMusicIndex = -1;
                    vipTrialMusicIndex = -1;
                    document.querySelectorAll('.music-item').forEach(item => {
                        item.classList.remove('playing');
                    });
                }
            }, 15000);

            return;
        } catch (error) {
            alert('加载音乐失败，请重试');
            return;
        }
    }

     
    isVipTrialMode = false;
    vipTrialMusicIndex = -1;

    try {
         
        const secureUrl = await loadAudioSecurely(location, false, isVIPUser());
        audioPlayer.src = secureUrl;

        currentMusicIndex = index;
        currentSong.textContent = name;

         
        document.querySelectorAll('.music-item').forEach((item, i) => {
            item.classList.toggle('playing', i === index);
        });

        currentTimeElement.textContent = '00:00';
        totalTimeElement.textContent = '**:**';

         
        loadLyrics(lyricsPath);

         
        const playPromise = audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                 
                isPlaying = true;
                playBtn.textContent = '||';
                playerStatus.textContent = '播放中';
            }).catch(error => {
                 
                console.log('自动播放被阻止，需要用户点击播放按钮');
                 
                isPlaying = false;
                playBtn.textContent = '▶';
                playerStatus.textContent = '点击播放开始收听';
            });
        } else {
             
            isPlaying = true;
            playBtn.textContent = '||';
            playerStatus.textContent = '播放中';
        }
    } catch (error) {
        alert('加载音乐失败，请重试');
    }
}

 
function playNextFreeMusic(currentIndex) {
    let nextIndex = currentIndex + 1;
    let foundFreeMusic = false;

     
    for (let i = nextIndex; i < musicList.length; i++) {
        const parts = musicList[i].split(' \\ ');
        const vipStatus = parts[3] || 'UR';
        if (vipStatus !== 'VIP') {
            playMusic(i);
            foundFreeMusic = true;
            break;
        }
    }

     
    if (!foundFreeMusic) {
        for (let i = 0; i < currentIndex; i++) {
            const parts = musicList[i].split(' \\ ');
            const vipStatus = parts[3] || 'UR';
            if (vipStatus !== 'VIP') {
                playMusic(i);
                foundFreeMusic = true;
                break;
            }
        }
    }

     
    if (!foundFreeMusic) {
        alert('很抱歉，当前没有可播放的免费音乐。');
        audioPlayer.pause();
        isPlaying = false;
        playBtn.textContent = '▶';
        playerStatus.textContent = '暂停中';
        currentSong.textContent = '请选择一首歌曲';
        document.querySelectorAll('.music-item').forEach(item => {
            item.classList.remove('playing');
        });
    }
}

 
function getNextPlayableIndex(currentIndex, direction) {
    let newIndex = currentIndex;
    const totalSongs = musicList.length;
    let attempts = 0;

    do {
        if (direction === 'next') {
            newIndex = (newIndex + 1) % totalSongs;
        } else {
            newIndex = (newIndex - 1 + totalSongs) % totalSongs;
        }

         
        if (newIndex === currentIndex) {
            return -1;  
        }

        const parts = musicList[newIndex].split(' \\ ');
        const vipStatus = parts[3] || 'UR';
         
        if (isVIPUser() || vipStatus !== 'VIP') {
            return newIndex;
        }

        attempts++;
         
        if (attempts > totalSongs) {
            return -1;
        }
    } while (true);
}

 
let isProcessingPlay = false  
let isProcessingPause = false  

 
function playAudio() {
    if (isProcessingPlay) {
        console.log('正在处理播放操作，跳过重复请求')
        return
    }
    
    isProcessingPlay = true
    console.log('开始播放音频')
    
    audioPlayer.play().then(() => {
        console.log('音频播放成功')
        isPlaying = true
        isProcessingPlay = false
        updatePlayButtonUI()
    }).catch(error => {
        console.error('音频播放失败:', error)
        isPlaying = false
        isProcessingPlay = false
        updatePlayButtonUI()
        playerStatus.textContent = '播放失败'
    })
}

 
function pauseAudio() {
    if (isProcessingPause) {
        console.log('正在处理暂停操作，跳过重复请求')
        return
    }
    
    isProcessingPause = true
    console.log('开始暂停音频')
    
    audioPlayer.pause()
    isPlaying = false
    isProcessingPause = false
    updatePlayButtonUI()
    
     
    setTimeout(() => {
        if (!audioPlayer.paused) {
            console.warn('音频播放器仍在播放，强制暂停')
            audioPlayer.pause()
            isPlaying = false
            updatePlayButtonUI()
        }
    }, 50)
}

 
function updatePlayButtonUI() {
    if (isPlaying) {
        playBtn.textContent = '||'
        playerStatus.textContent = '播放中'
    } else {
        playBtn.textContent = '▶'
        playerStatus.textContent = '暂停中'
    }
}

 
function handleAudioPlay() {
    console.log('音频播放事件触发')
    isPlaying = true
    updatePlayButtonUI()
}

function handleAudioPause() {
    console.log('音频暂停事件触发')
    isPlaying = false
    updatePlayButtonUI()
}

 
document.addEventListener('DOMContentLoaded', () => {
    loadMusicList()

     
    audioPlayer.addEventListener('play', handleAudioPlay)
    audioPlayer.addEventListener('pause', handleAudioPause)
})

 
prevBtn.addEventListener('click', async () => {
    if (musicList.length === 0) return;
     
    if (isVideoMode) {
        toggleVideoMode();
    }

    const nextIndex = getNextPlayableIndex(currentMusicIndex, 'prev');
    if (nextIndex !== -1) {
        await playMusic(nextIndex);
    } else {
        alert('没有可播放的免费音乐');
    }
});

 
nextBtn.addEventListener('click', async () => {
    if (musicList.length === 0) return;

     
    if (isVideoMode) {
        toggleVideoMode();
    }

    const nextIndex = getNextPlayableIndex(currentMusicIndex, 'next');
    if (nextIndex !== -1) {
        await playMusic(nextIndex);
    } else {
        alert('没有可播放的免费音乐');
    }
});

audioPlayer.addEventListener('timeupdate', () => {
    if (isVipTrialMode && vipTrialMusicIndex !== -1) {
         
        const maxTrialTime = 15;  
        const currentTime = Math.min(audioPlayer.currentTime, maxTrialTime);

         
        if (audioPlayer.currentTime >= maxTrialTime) {
            audioPlayer.pause();
             
            audioPlayer.currentTime = maxTrialTime;
            isPlaying = false;
            playBtn.textContent = '▶';
            playerStatus.textContent = '试听结束';

             
            const confirmVIP = confirm('试听结束！这是VIP专属音乐，需要VIP才能完整收听。\n\n点击"确定"将自动播放下一首免费音乐。');

            if (confirmVIP) {
                playNextFreeMusic(vipTrialMusicIndex);
            } else {
                currentSong.textContent = '请选择一首歌曲';
                playerStatus.textContent = '暂停中';
                audioPlayer.src = '';
                currentMusicIndex = -1;
                vipTrialMusicIndex = -1;
                isVipTrialMode = false;
                document.querySelectorAll('.music-item').forEach(item => {
                    item.classList.remove('playing');
                });
            }
            return;
        }

         
        updateProgressBar();
        updateTimeDisplay();
    } else {
         
        updateProgressBar();
        updateTimeDisplay();
    }

     
    updateLyrics(audioPlayer.currentTime);
});

 
document.querySelector('.progress-bar').addEventListener('click', (e) => {
    if (isVipTrialMode && vipTrialMusicIndex !== -1) {
         
        const rect = e.target.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const maxTrialTime = 15;  

         
        const newTime = Math.min((clickX / width) * maxTrialTime, maxTrialTime);
        audioPlayer.currentTime = newTime;
    } else {
         
        const rect = e.target.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;

        if (isVideoMode) {
             
            const duration = videoPlayer.duration;
            if (duration) {
                videoPlayer.currentTime = (clickX / width) * duration;
            }
        } else {
             
            const duration = audioPlayer.duration;
            if (duration) {
                audioPlayer.currentTime = (clickX / width) * duration;
            }
        }
    }
});

 
audioPlayer.addEventListener('ended', () => {
    if (musicList.length === 0) return;

     
    if (isVideoMode) {
        toggleVideoMode();
    }

    const nextIndex = getNextPlayableIndex(currentMusicIndex, 'next');
    if (nextIndex !== -1) {
        playMusic(nextIndex);
    }
});

 
videoPlayer.addEventListener('ended', () => {
    if (musicList.length === 0) return;

     
    if (isVideoMode) {
        toggleVideoMode();
    }

    const nextIndex = getNextPlayableIndex(currentMusicIndex, 'next');
    if (nextIndex !== -1) {
        playMusic(nextIndex);
    } else {
        alert('没有可播放的免费音乐');
    }
});

 
audioPlayer.addEventListener('loadedmetadata', () => {
    updateTimeDisplay();
});

 
document.addEventListener('DOMContentLoaded', () => {
    loadMusicList();

     
    audioPlayer.addEventListener('play', handleAudioPlay);
    audioPlayer.addEventListener('pause', handleAudioPause);

     
    window.isProcessingPlayPause = false;
});

 
document.getElementById('search').addEventListener('submit', function (e) {
    e.preventDefault();
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();

    if (!searchTerm) {
         
        renderMusicList();
        return;
    }

     
    const filteredList = musicList.filter(music => {
        const name = music.split(' \\ ')[0].toLowerCase();
        return name.includes(searchTerm);
    });

     
    musicListElement.innerHTML = '';
    const isVIP = isVIPUser();
    const isSuperAdminUser = isSuperAdmin();

    filteredList.forEach((music, index) => {
        const parts = music.split(' \\ ');
        const name = parts[0];
        const location = parts[1];
        const lyricsPath = parts[2];
        const vipStatus = parts[3] || 'UR';

        const li = document.createElement('li');
        li.className = 'music-item';

         
        li.addEventListener('click', (e) => {
             
            if (e.target.tagName === 'BUTTON' || e.target.classList.contains('download-btn')) {
                return;
            }
            console.log('点击搜索结果的音乐项:', name, '索引:', index);
            playMusic(index);
        });

         
        if (vipStatus === 'VIP') {
            li.style.backgroundColor = '#fff3cd';
            li.style.borderLeft = '4px solid #ffc107';
             
            if (isSuperAdminUser) {
                li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${name}</span>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="background-color: #ffc107; color: #856404; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">VIP专属</span>
                                    <button class="download-btn" onclick="downloadMusic(${index}, event)" 
                                            style="background-color: #dc3545; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                        管理员下载
                                    </button>
                                </div>
                            </div>
                            <div class="download-progress-container" id="download-progress-${index}" style="display: none;">
                                <div class="download-progress-bar">
                                    <div class="download-progress" id="download-progress-bar-${index}"></div>
                                </div>
                                <div class="download-progress-text" id="download-progress-text-${index}">0%</div>
                            </div>
                            <div class="connection-nodes" id="connection-nodes-${index}" style="display: none;">
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                            </div>
                            <div class="download-info-container" id="download-info-${index}" style="display: none;">
                                <div class="download-info-item">
                                    <span class="download-info-label">速度:</span>
                                    <span class="download-info-value" id="download-speed-${index}">0 KB/s</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">剩余:</span>
                                    <span class="download-info-value" id="download-eta-${index}">--:--</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">已下载:</span>
                                    <span class="download-info-value" id="download-received-${index}">0 B</span>
                                </div>
                            </div>
                            <div class="download-status" id="download-status-${index}" style="display: none;"></div>
                        `;
            } else {
                li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${name}</span>
                                <span style="background-color: #ffc107; color: #856404; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">VIP专属</span>
                            </div>
                        `;
            }
        } else if (vipStatus === 'DL') {
             
            if (isSuperAdminUser) {
                 
                li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${name}</span>
                                <button class="download-btn" onclick="downloadMusic(${index}, event)" 
                                        style="background-color: #28a745; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                    下载
                                </button>
                            </div>
                            <div class="download-progress-container" id="download-progress-${index}" style="display: none;">
                                <div class="download-progress-bar">
                                    <div class="download-progress" id="download-progress-bar-${index}"></div>
                                </div>
                                <div class="download-progress-text" id="download-progress-text-${index}">0%</div>
                            </div>
                            <div class="connection-nodes" id="connection-nodes-${index}" style="display: none;">
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                            </div>
                            <div class="download-info-container" id="download-info-${index}" style="display: none;">
                                <div class="download-info-item">
                                    <span class="download-info-label">速度:</span>
                                    <span class="download-info-value" id="download-speed-${index}">0 KB/s</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">剩余:</span>
                                    <span class="download-info-value" id="download-eta-${index}">--:--</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">已下载:</span>
                                    <span class="download-info-value" id="download-received-${index}">0 B</span>
                                </div>
                            </div>
                            <div class="download-status" id="download-status-${index}" style="display: none;"></div>
                        `;
            } else {
                 
                li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${name}</span>
                                <button class="download-btn" onclick="downloadMusicForNormalUser(${index}, event)" 
                                        style="background-color: #17a2b8; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                    下载（普通用户）
                                </button>
                            </div>
                            <div class="download-progress-container" id="download-progress-${index}" style="display: none;">
                                <div class="download-progress-bar">
                                    <div class="download-progress" id="download-progress-bar-${index}"></div>
                                </div>
                                <div class="download-progress-text" id="download-progress-text-${index}">0%</div>
                            </div>
                            <div class="connection-nodes" id="connection-nodes-${index}" style="display: none;">
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                            </div>
                            <div class="download-info-container" id="download-info-${index}" style="display: none;">
                                <div class="download-info-item">
                                    <span class="download-info-label">速度:</span>
                                    <span class="download-info-value" id="download-speed-${index}">0 KB/s</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">剩余:</span>
                                    <span class="download-info-value" id="download-eta-${index}">--:--</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">已下载:</span>
                                    <span class="download-info-value" id="download-received-${index}">0 B</span>
                                </div>
                            </div>
                            <div class="download-status" id="download-status-${index}" style="display: none;"></div>
                        `;
            }
        } else if (isVIP || isSuperAdminUser) {
             
            li.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <span>${name}</span>
                            <button class="download-btn" onclick="downloadMusic(${index}, event)" 
                                    style="background-color: #28a745; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                下载
                            </button>
                        </div>
                        <div class="download-progress-container" id="download-progress-${index}" style="display: none;">
                            <div class="download-progress-bar">
                                <div class="download-progress" id="download-progress-bar-${index}"></div>
                            </div>
                            <div class="download-progress-text" id="download-progress-text-${index}">0%</div>
                        </div>
                        <div class="connection-nodes" id="connection-nodes-${index}" style="display: none;">
                            <div class="connection-node"></div>
                            <div class="connection-node"></div>
                            <div class="connection-node"></div>
                            <div class="connection-node"></div>
                            <div class="connection-node"></div>
                        </div>
                        <div class="download-info-container" id="download-info-${index}" style="display: none;">
                            <div class="download-info-item">
                                <span class="download-info-label">速度:</span>
                                <span class="download-info-value" id="download-speed-${index}">0 KB/s</span>
                            </div>
                            <div class="download-info-item">
                                <span class="download-info-label">剩余:</span>
                                <span class="download-info-value" id="download-eta-${index}">--:--</span>
                            </div>
                            <div class="download-info-item">
                                <span class="download-info-label">已下载:</span>
                                <span class="download-info-value" id="download-received-${index}">0 B</span>
                            </div>
                        </div>
                        <div class="download-status" id="download-status-${index}" style="display: none;"></div>
                    `;
        } else {
             
            li.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <span>${name}</span>
                        </div>
                    `;
        }

        musicListElement.appendChild(li);
    });
});

 
function generateMathCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];

    let answer;
    switch (operator) {
        case '+': answer = num1 + num2; break;
        case '-': answer = num1 - num2; break;
        case '*': answer = num1 * num2; break;
    };

    return { question: `请输入验证码：${num1} ${operator} ${num2} = ?`, answer: answer };
};

 
async function downloadMusic(index, event) {
    event.stopPropagation();

     
    const captcha = generateMathCaptcha();
    const userInput = prompt(captcha.question);

    if (parseInt(userInput) !== captcha.answer) {
        alert('验证失败，请重试下载');
        return;
    }

     
    const parts = musicList[index].split(' \\ ');
    const name = parts[0];
    const location = parts[1];
    const vipStatus = parts[3] || 'UR';
    const button = event.target;
    const progressContainer = document.getElementById(`download-progress-${index}`);
    const progressBar = document.getElementById(`download-progress-bar-${index}`);
    const progressText = document.getElementById(`download-progress-text-${index}`);
    const statusText = document.getElementById(`download-status-${index}`);
    const connectionNodes = document.getElementById(`connection-nodes-${index}`);
    const downloadInfo = document.getElementById(`download-info-${index}`);
    const downloadSpeed = document.getElementById(`download-speed-${index}`);
    const downloadEta = document.getElementById(`download-eta-${index}`);
    const downloadReceived = document.getElementById(`download-received-${index}`);

     
    if (!isVIPUser() && !isSuperAdmin()) {
        alert('只有VIP用户或超级管理员才能下载音乐！');
        return;
    }

     
    if (vipStatus === 'VIP' && !isVIPUser() && !isSuperAdmin()) {
        alert('这是VIP专属音乐，只有VIP用户或超级管理员才能下载！');
        return;
    }

     
    addToDownloadQueue(index, name, location);
}

 
async function downloadMusicForNormalUser(index, event) {
    event.stopPropagation();

     
    const captcha = generateMathCaptcha();
    const userInput = prompt(captcha.question);

    if (parseInt(userInput) !== captcha.answer) {
        alert('验证失败，请重试下载');
        return;
    }

     
    const parts = musicList[index].split(' \\ ');
    const name = parts[0];
    const location = parts[1];
    const vipStatus = parts[3] || 'UR';
    const button = event.target;
    const progressContainer = document.getElementById(`download-progress-${index}`);
    const progressBar = document.getElementById(`download-progress-bar-${index}`);
    const progressText = document.getElementById(`download-progress-text-${index}`);
    const statusText = document.getElementById(`download-status-${index}`);
    const connectionNodes = document.getElementById(`connection-nodes-${index}`);
    const downloadInfo = document.getElementById(`download-info-${index}`);
    const downloadSpeed = document.getElementById(`download-speed-${index}`);
    const downloadEta = document.getElementById(`download-eta-${index}`);
    const downloadReceived = document.getElementById(`download-received-${index}`);

     
    if (vipStatus !== 'DL') {
        alert('只有标记为DL的歌曲才允许普通用户下载！');
        return;
    }

     
    if (isVIPUser()) {
        alert('VIP用户请使用VIP下载功能！');
        return;
    }

     
    button.disabled = true;
    button.textContent = '准备下载...';
    progressContainer.style.display = 'flex';
    connectionNodes.style.display = 'flex';
    downloadInfo.style.display = 'flex';
    statusText.style.display = 'block';
    statusText.textContent = '正在连接服务器...';

    try {
         
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10000 + 10000));

         
        if (Math.random() < 0.15) {
            throw new Error('服务器连接失败，请重试');
        }

         
        const response = await fetch(location, { method: 'HEAD' });
        if (!response.ok) throw new Error('无法获取文件信息');

        const contentLength = response.headers.get('content-length');
        const totalSize = contentLength ? parseInt(contentLength) : 0;

        statusText.textContent = `文件大小: ${formatFileSize(totalSize)}`;

         
        const downloadResponse = await fetch(location);
        if (!downloadResponse.ok) throw new Error(`下载失败: ${downloadResponse.status}`);

        const reader = downloadResponse.body.getReader();
        const chunks = [];
        let receivedLength = 0;
        let lastUpdateTime = Date.now();
        let lastReceivedLength = 0;

         
        let nodeIndex = 0;
        const nodeInterval = setInterval(() => {
            const nodes = connectionNodes.querySelectorAll('.connection-node');
            nodes[nodeIndex].classList.add('inactive');
            nodeIndex = (nodeIndex + 1) % nodes.length;
            nodes[nodeIndex].classList.remove('inactive');
        }, 3000);  

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedLength += value.length;

             
            await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 3000));

             
            if (Math.random() < 0.4) {
                statusText.textContent = '网络连接不稳定，重新连接中...';
                await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 5000));
                statusText.textContent = '连接恢复，继续下载...';
            }

             
            if (Math.random() < 0.3) {
                statusText.textContent = '服务器繁忙，请稍候...';
                await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 3000));
                statusText.textContent = '继续下载...';
            }
             
            if (Math.random() < 0.1) {
                statusText.textContent = '下载服务受限，请等待...';
                await new Promise(resolve => setTimeout(resolve, Math.random() * 10000 + 10000));
                statusText.textContent = '服务恢复，继续下载...';
            }

             
            if (Math.random() < 0.2) {
                throw new Error('网络连接中断，下载失败');
            }

             
            if (Math.random() < 0.1) {
                throw new Error('服务器内部错误，请稍后重试');
            }

             
            if (Math.random() < 0.05) {
                throw new Error('文件下载损坏，请重新下载');
            }

             
            const currentTime = Date.now();
            const timeDiff = (currentTime - lastUpdateTime) / 1000;  

            if (timeDiff >= 5) {  
                const bytesDiff = receivedLength - lastReceivedLength;
                const speed = bytesDiff / timeDiff; // 字节/秒

                 
                const limitedSpeed = Math.max(0, Math.min(108, speed));

                 
                downloadSpeed.textContent = `${formatSpeed(limitedSpeed)}`;
                downloadReceived.textContent = formatFileSize(receivedLength);

                 
                if (limitedSpeed > 0 && totalSize > 0) {
                    const remainingBytes = totalSize - receivedLength;
                    const remainingSeconds = remainingBytes / limitedSpeed;
                    downloadEta.textContent = formatTime(remainingSeconds);
                }

                lastUpdateTime = currentTime;
                lastReceivedLength = receivedLength;
            }

             
            if (totalSize > 0) {
                const progress = Math.round((receivedLength / totalSize) * 100);
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${progress}%`;

                 
                statusText.textContent = `下载中... 速度极慢，请耐心等待 (${formatSpeed(Math.random() * 108)})`;
            }
        }

        clearInterval(nodeInterval);

         
        statusText.textContent = '下载完成，正在处理文件...';
        await new Promise(resolve => setTimeout(resolve, 10000));

         
        const blob = new Blob(chunks);
        const url = URL.createObjectURL(blob);

         
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

         
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        statusText.textContent = '下载完成！';
        statusText.style.color = '#28a745';

        const nodes = connectionNodes.querySelectorAll('.connection-node');
        nodes.forEach(node => node.classList.add('inactive'));

         
        setTimeout(() => {
            progressContainer.style.display = 'none';
            connectionNodes.style.display = 'none';
            downloadInfo.style.display = 'none';
            statusText.style.display = 'none';
            button.disabled = false;
            button.textContent = '下载（普通用户）';
        }, 15000);

    } catch (error) {
        console.error('下载失败:', error);

        progressBar.style.background = '#dc3545';
        statusText.textContent = `下载失败: ${error.message}`;
        statusText.style.color = '#dc3545';

        setTimeout(() => {
            progressContainer.style.display = 'none';
            connectionNodes.style.display = 'none';
            downloadInfo.style.display = 'none';
            statusText.style.display = 'none';
            button.disabled = false;
            button.textContent = '下载（普通用户）';
        }, 4000);
    }
}

 
function addToDownloadQueue(index, name, location) {
    const downloadItem = {
        index: index,
        name: name,
        location: location,
        status: 'waiting',
        progress: 0,
        startTime: null,
        receivedLength: 0,
        totalSize: 0,
        speed: 0,
        eta: '--:--'
    };

    downloadQueue.push(downloadItem);
    updateDownloadQueueDisplay();

     
    if (!currentDownload) {
        processDownloadQueue();
    }
}

 
async function processDownloadQueue() {
    if (downloadQueue.length === 0) {
        currentDownload = null;
        return;
    }

     
    const waitingItem = downloadQueue.find(item => item.status === 'waiting');
    if (!waitingItem) {
        currentDownload = null;
        return;
    }

    currentDownload = waitingItem;
    waitingItem.status = 'downloading';
    waitingItem.startTime = Date.now();
    updateDownloadQueueDisplay();

    await startDownload(waitingItem);

     
    processDownloadQueue();
}

 
async function startDownload(downloadItem) {
    const { index, name, location } = downloadItem;

     
    const button = document.querySelector(`#download-progress-${index}`).previousElementSibling.querySelector('.download-btn');
    const progressContainer = document.getElementById(`download-progress-${index}`);
    const progressBar = document.getElementById(`download-progress-bar-${index}`);
    const progressText = document.getElementById(`download-progress-text-${index}`);
    const statusText = document.getElementById(`download-status-${index}`);
    const connectionNodes = document.getElementById(`connection-nodes-${index}`);
    const downloadInfo = document.getElementById(`download-info-${index}`);
    const downloadSpeed = document.getElementById(`download-speed-${index}`);
    const downloadEta = document.getElementById(`download-eta-${index}`);
    const downloadReceived = document.getElementById(`download-received-${index}`);

     
    button.disabled = true;
    button.textContent = '队列中...';
    progressContainer.style.display = 'flex';
    connectionNodes.style.display = 'flex';
    downloadInfo.style.display = 'flex';
    statusText.style.display = 'block';
    statusText.textContent = '准备下载...';

     
    const nodes = connectionNodes.querySelectorAll('.connection-node');
    nodes.forEach(node => node.classList.remove('inactive'));

    try {
         
        const resumeInfo = downloadHistory.get(location);
        let startByte = 0;
        let receivedLength = resumeInfo ? resumeInfo.receivedLength : 0;

        if (resumeInfo && resumeInfo.receivedLength > 0) {
            statusText.textContent = '检测到未完成下载，继续下载...';
            startByte = resumeInfo.receivedLength;
            receivedLength = resumeInfo.receivedLength;
        }

         
        const response = await fetch(location, { method: 'HEAD' });
        if (!response.ok) throw new Error('无法获取文件信息');

        const contentLength = response.headers.get('content-length');
        const totalSize = contentLength ? parseInt(contentLength) : 0;
        downloadItem.totalSize = totalSize;

        statusText.textContent = `文件大小: ${formatFileSize(totalSize)}`;

         
        const downloadResponse = await fetch(location, {
            headers: startByte > 0 ? { 'Range': `bytes=${startByte}-` } : {}
        });
        if (!downloadResponse.ok) throw new Error(`下载失败: ${downloadResponse.status}`);

        const reader = downloadResponse.body.getReader();
        const chunks = [];
        let lastUpdateTime = Date.now();
        let lastReceivedLength = receivedLength;

         
        let nodeIndex = 0;
        const nodeInterval = setInterval(() => {
            nodes[nodeIndex].classList.add('inactive');
            nodeIndex = (nodeIndex + 1) % nodes.length;
            nodes[nodeIndex].classList.remove('inactive');
        }, 500);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            receivedLength += value.length;
            downloadItem.receivedLength = receivedLength;

             
            const currentTime = Date.now();
            const timeDiff = (currentTime - lastUpdateTime) / 1000;  

            if (timeDiff >= 1) {  
                const bytesDiff = receivedLength - lastReceivedLength;
                const speed = bytesDiff / timeDiff; // 字节/秒
                downloadItem.speed = speed;

                 
                downloadSpeed.textContent = `${formatSpeed(speed)}`;
                downloadReceived.textContent = formatFileSize(receivedLength);

                 
                if (speed > 0 && totalSize > 0) {
                    const remainingBytes = totalSize - receivedLength;
                    const remainingSeconds = remainingBytes / speed;
                    downloadItem.eta = formatTime(remainingSeconds);
                    downloadEta.textContent = downloadItem.eta;
                }

                lastUpdateTime = currentTime;
                lastReceivedLength = receivedLength;
            }

             
            if (totalSize > 0) {
                const progress = Math.round((receivedLength / totalSize) * 100);
                downloadItem.progress = progress;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${progress}%`;

                 
                statusText.textContent = `下载中... ${formatSpeed(downloadItem.speed)} - 剩余 ${downloadItem.eta}`;
            }

             
            downloadHistory.set(location, {
                receivedLength: receivedLength,
                totalSize: totalSize,
                timestamp: Date.now()
            });

             
            await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100));
        }

        clearInterval(nodeInterval);

         
        const blob = new Blob(chunks);
        const url = URL.createObjectURL(blob);

         
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

         
        downloadHistory.delete(location);

         
        downloadItem.status = 'completed';
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        statusText.textContent = '下载完成！';
        statusText.style.color = '#28a745';
        nodes.forEach(node => node.classList.add('inactive'));

         
        setTimeout(() => {
            progressContainer.style.display = 'none';
            connectionNodes.style.display = 'none';
            downloadInfo.style.display = 'none';
            statusText.style.display = 'none';
            button.disabled = false;
            button.textContent = '下载';
        }, 3000);

    } catch (error) {
        console.error('下载失败:', error);
        downloadItem.status = 'error';

        progressBar.style.background = '#dc3545';
        statusText.textContent = `下载失败: ${error.message}`;
        statusText.style.color = '#dc3545';

        setTimeout(() => {
            progressContainer.style.display = 'none';
            connectionNodes.style.display = 'none';
            downloadInfo.style.display = 'none';
            statusText.style.display = 'none';
            button.disabled = false;
            button.textContent = '下载';
        }, 4000);
    }

    updateDownloadQueueDisplay();
}

 
function updateDownloadQueueDisplay() {
    const queueElement = document.getElementById('download-queue');
    const queueHeader = document.querySelector('.queue-header');
    const queueItems = document.getElementById('queue-items');

    if (downloadQueue.length > 0) {
        queueElement.style.display = 'block';
        const activeCount = downloadQueue.filter(item => item.status === 'downloading').length;
        const totalCount = downloadQueue.length;
        queueHeader.textContent = `下载队列 (${activeCount}/${totalCount})`;

        queueItems.innerHTML = '';
        downloadQueue.forEach((item, i) => {
            const queueItem = document.createElement('div');
            queueItem.className = `queue-item ${item.status === 'downloading' ? 'active' : ''}`;
            queueItem.innerHTML = `
                        <div class="queue-item-name">${item.name}</div>
                        <div class="queue-item-progress">${item.progress}%</div>
                    `;
            queueItems.appendChild(queueItem);
        });
    } else {
        queueElement.style.display = 'none';
    }
}

 
function formatSpeed(bytesPerSecond) {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

 
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

 
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}







 
const exportMusicSelect = document.getElementById('export-music-select');
const exportLinkBtn = document.getElementById('export-link-btn');
const exportResult = document.getElementById('export-result');
const exportedLink = document.getElementById('exported-link');
const copyLinkBtn = document.getElementById('copy-link-btn');

 
function generateMusicLink(musicIndex, isVIPMusic) {
     
    const captcha = generateMathCaptcha();
    const userInput = prompt(captcha.question);

    if (parseInt(userInput) !== captcha.answer) {
        alert('验证失败，请重新获取');
        return;
    }

    const baseUrl = window.location.href.split('?')[0];  
    const musicData = musicList[musicIndex];
    const parts = musicData.split(' \\ ');
    const name = parts[0];
    const vipStatus = parts[3] || 'UR';

     
    const isSuperAdminUser = isSuperAdmin();
    const timeParam = isSuperAdminUser ? 'YJKW' : Math.floor(Date.now() / 1000).toString();

     
    const params = {
        music: musicIndex,
        name: name,
        vip: vipStatus,
        timestamp: timeParam
    };

     
    const jsonString = JSON.stringify(params);
    const md5Hash = CryptoJS.MD5(jsonString).toString();

     
    const encodedMusic = btoa(encodeURIComponent(md5Hash));

    return `【${name}】${baseUrl}?music=${encodedMusic}&time=${timeParam}`;
}

 
function parseMusicLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const musicParam = urlParams.get('music');
    const timeParam = urlParams.get('time');

    if (musicParam && timeParam) {
        try {
             
            const decodedHash = decodeURIComponent(atob(musicParam));

             
            if (timeParam !== 'YJKW') {
                const linkTimestamp = parseInt(timeParam);
                const currentTimestamp = Math.floor(Date.now() / 1000);
                const sevenDaysInSeconds = 7 * 24 * 60 * 60;

                if (currentTimestamp - linkTimestamp > sevenDaysInSeconds) {
                    alert('链接已过期，有效期为7天');
                    return null;
                }
            }

             
            for (let i = 0; i < musicList.length; i++) {
                const musicData = musicList[i];
                const parts = musicData.split(' \\ ');
                const name = parts[0];
                const vipStatus = parts[3] || 'UR';

                 
                const params = {
                    music: i,
                    name: name,
                    vip: vipStatus,
                    timestamp: timeParam
                };
                const jsonString = JSON.stringify(params);
                const expectedHash = CryptoJS.MD5(jsonString).toString();

                if (decodedHash === expectedHash) {
                    return params;
                }
            }

            console.error('链接验证失败：未找到匹配的音乐');
            return null;
        } catch (error) {
            console.error('解析音乐链接参数失败:', error);
            return null;
        }
    }
    return null;
}

 
function playMusicFromLink(linkParams) {
    const musicIndex = linkParams.music;
    const vipStatus = linkParams.vip;
    const isVIPUserFlag = isVIPUser();

     
    if (vipStatus === 'VIP' && !isVIPUserFlag) {
         
        alert('这是VIP专属音乐，您需要VIP权限才能完整收听。将为您提供15秒试听。');
         
        setTimeout(() => {
            playMusic(musicIndex);
        }, 1000);
    } else {
         
        playMusic(musicIndex);
    }
}

 
document.addEventListener('DOMContentLoaded', () => {
     
    setTimeout(() => {
        const linkParams = parseMusicLink();
        if (linkParams) {
             
            if (linkParams.music >= 0 && linkParams.music < musicList.length) {
                 
                setTimeout(() => {
                     
                    const playButton = document.getElementById('play-btn');
                    if (playButton) {
                         
                        playButton.click();
                         
                        setTimeout(() => {
                            playMusicFromLink(linkParams);
                        }, 100);
                    } else {
                         
                        playMusicFromLink(linkParams);
                    }
                }, 500);
            } else {
                alert('音乐链接无效或音乐不存在');
            }
        }

         
        populateExportSelect();
    }, 1000);
});

 
function populateExportSelect() {
    exportMusicSelect.innerHTML = '<option value="">请选择要导出的音乐</option>';

    musicList.forEach((music, index) => {
        const parts = music.split(' \\ ');
        const name = parts[0];
        const vipStatus = parts[3] || 'UR';

        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${name} ${vipStatus === 'VIP' ? '(VIP专属)' : ''}`;
        exportMusicSelect.appendChild(option);
    });
}

 
exportLinkBtn.addEventListener('click', () => {
    const selectedIndex = parseInt(exportMusicSelect.value);

    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= musicList.length) {
        alert('请选择要导出的音乐');
        return;
    }

    const musicData = musicList[selectedIndex];
    const parts = musicData.split(' \\ ');
    const vipStatus = parts[3] || 'UR';
    const isVIPUserFlag = isVIPUser();

     
    if (vipStatus === 'VIP' && !isVIPUserFlag) {
        alert('您没有权限导出VIP专属音乐');
        return;
    }

     
    const musicLink = generateMusicLink(selectedIndex, vipStatus === 'VIP');
    if (musicLink) {
        exportedLink.value = musicLink;
        exportResult.style.display = 'block';
    }
});

 
copyLinkBtn.addEventListener('click', () => {
    exportedLink.select();
    exportedLink.setSelectionRange(0, 99999);  

    try {
        const successful = document.execCommand('copy');
        if (successful) {
             
            const originalText = copyLinkBtn.textContent;
            copyLinkBtn.textContent = '已复制';
            copyLinkBtn.style.backgroundColor = '#218838';

            setTimeout(() => {
                copyLinkBtn.textContent = originalText;
                copyLinkBtn.style.backgroundColor = '#28a745';
            }, 2000);
        }
    } catch (err) {
         
        navigator.clipboard.writeText(exportedLink.value).then(() => {
            const originalText = copyLinkBtn.textContent;
            copyLinkBtn.textContent = '已复制';
            copyLinkBtn.style.backgroundColor = '#218838';

            setTimeout(() => {
                copyLinkBtn.textContent = originalText;
                copyLinkBtn.style.backgroundColor = '#28a745';
            }, 2000);
        }).catch(() => {
            alert('复制失败，请手动复制链接');
        });
    }
});

 
 
async function loadMusicList() {
    try {
        console.log('开始加载音乐列表数据...');
        const response = await fetch('./music.txt');
        if (!response.ok) {
            throw new Error('音乐列表文件不存在');
        }
        const musicText = await response.text();
        console.log('音乐列表文件内容:', musicText);

         
        musicList = musicText.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => line.trim());

        console.log('解析后的音乐列表:', musicList);

         
        renderMusicList();
        console.log('音乐列表渲染完成，共加载', musicList.length, '首歌曲');

         
        populateExportSelect();

    } catch (error) {
        console.error('加载音乐列表失败:', error);
        musicListElement.innerHTML = '<li style="color: red; text-align: center;">加载音乐列表失败，请刷新页面重试</li>';
    }
}







 
document.addEventListener('DOMContentLoaded', function () {
     
    const shareBtn = document.getElementById('share-link-btn');
    const wechatBtn = document.getElementById('share-wechat-btn');
    const qqBtn = document.getElementById('share-qq-btn');

    if (!shareBtn || !wechatBtn || !qqBtn) {
        console.error('分享按钮未找到，请检查HTML结构');
        return;
    }

     
    function getCurrentMusicInfo() {
        const currentSongElement = document.querySelector('.current-song');
        if (!currentSongElement) return null;

        const currentSongName = currentSongElement.textContent;
        if (!currentSongName || currentSongName === '请选择一首歌曲') {
            alert('请先选择一首歌曲进行播放');
            return null;
        }

         
        for (let i = 0; i < musicList.length; i++) {
            const musicData = musicList[i];
            const parts = musicData.split(' \\ ');
            const name = parts[0];

            if (name === currentSongName) {
                return {
                    index: i,
                    name: name,
                    vipStatus: parts[3] || 'UR'
                };
            }
        }

        return null;
    }

     
    function generateShareLink(musicInfo) {
        if (!musicInfo) return null;

         
        const isSuperAdminUser = isSuperAdmin();
        const timeParam = isSuperAdminUser ? 'YJKW' : Math.floor(Date.now() / 1000).toString();

         
        const params = {
            music: musicInfo.index,
            name: musicInfo.name,
            vip: musicInfo.vipStatus,
            timestamp: timeParam
        };

         
        const jsonString = JSON.stringify(params);
        const md5Hash = CryptoJS.MD5(jsonString).toString();
        const encodedMusic = btoa(encodeURIComponent(md5Hash));

        const baseUrl = window.location.href.split('?')[0];
        return `【${musicInfo.name}】${baseUrl}?music=${encodedMusic}&time=${timeParam}`;
    }

     
    function copyToClipboard(text) {
        return new Promise((resolve, reject) => {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(resolve).catch(reject);
            } else {
                 
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    if (successful) {
                        resolve();
                    } else {
                        reject(new Error('复制失败'));
                    }
                } catch (err) {
                    document.body.removeChild(textArea);
                    reject(err);
                }
            }
        });
    }

     
    shareBtn.addEventListener('click', function () {
        const musicInfo = getCurrentMusicInfo();
        if (!musicInfo) return;

        const shareLink = generateShareLink(musicInfo);
        if (!shareLink) {
            alert('生成分享链接失败');
            return;
        }

        copyToClipboard(shareLink).then(() => {
             
            const originalText = shareBtn.textContent;
            shareBtn.textContent = '已复制到剪贴板';
            shareBtn.style.backgroundColor = '#28a745';

            setTimeout(() => {
                shareBtn.textContent = originalText;
                shareBtn.style.backgroundColor = '';
            }, 2000);

            console.log('分享链接已复制:', shareLink);
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制链接: ' + shareLink);
        });
    });

     
    wechatBtn.addEventListener('click', function () {
        const musicInfo = getCurrentMusicInfo();
        if (!musicInfo) return;

        const shareLink = generateShareLink(musicInfo);
        if (!shareLink) {
            alert('生成分享链接失败');
            return;
        }

         
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
             
            copyToClipboard(shareLink).then(() => {
                const originalText = wechatBtn.textContent;
                wechatBtn.textContent = '链接已复制';
                wechatBtn.style.backgroundColor = '#07c160';

                 
                if (window.WeixinJSBridge) {
                    window.WeixinJSBridge.invoke('shareTimeline', {
                        title: '音乐分享',
                        desc: '分享一首好听的音乐',
                        link: shareLink,
                        imgUrl: window.location.origin + '/assets/ziyit.png'
                    }, function (res) {
                        if (res.err_msg === 'share_timeline:ok') {
                            alert('分享成功！');
                        } else {
                            alert('微信分享失败，链接已复制到剪贴板，请手动分享');
                        }
                    });
                } else {
                     
                    alert('链接已复制到剪贴板！\n\n请在微信中：\n1. 打开要分享的聊天窗口\n2. 长按输入框选择粘贴\n3. 发送消息');
                }

                setTimeout(() => {
                    wechatBtn.textContent = originalText;
                    wechatBtn.style.backgroundColor = '';
                }, 2000);

            }).catch(err => {
                alert('复制失败，请手动复制链接: ' + shareLink);
            });
        } else {
             
            copyToClipboard(shareLink).then(() => {
                const originalText = wechatBtn.textContent;
                wechatBtn.textContent = '链接已复制';
                wechatBtn.style.backgroundColor = '#07c160';

                 
                setTimeout(() => {
                    alert('链接已复制到剪贴板！\n\n请在微信中：\n1. 打开要分享的聊天窗口\n2. 按 Ctrl+V 粘贴链接\n3. 发送消息');
                }, 300);

                setTimeout(() => {
                    wechatBtn.textContent = originalText;
                    wechatBtn.style.backgroundColor = '';
                }, 2000);

            }).catch(err => {
                alert('复制失败，请手动复制链接: ' + shareLink);
            });
        }
    });

     
    qqBtn.addEventListener('click', function () {
        const musicInfo = getCurrentMusicInfo();
        if (!musicInfo) return;

        const shareLink = generateShareLink(musicInfo);
        if (!shareLink) return;

         
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
             
            copyToClipboard(shareLink).then(() => {
                const originalText = qqBtn.textContent;
                qqBtn.textContent = '链接已复制';
                qqBtn.style.backgroundColor = '#12b7f5';

                 
                if (window.mqq && window.mqq.ui && window.mqq.ui.shareMessage) {
                    window.mqq.ui.shareMessage({
                        title: '音乐分享',
                        desc: '分享一首好听的音乐',
                        share_url: shareLink,
                        image_url: window.location.origin + '/assets/ziyit.png'
                    }, function (result) {
                        if (result.retCode === 0) {
                            alert('分享成功！');
                        } else {
                            alert('QQ分享失败，链接已复制到剪贴板，请手动分享');
                        }
                    });
                } else {
                     
                    alert('链接已复制到剪贴板！\n\n请在QQ中：\n1. 打开要分享的聊天窗口\n2. 长按输入框选择粘贴\n3. 发送消息');
                }

                setTimeout(() => {
                    qqBtn.textContent = originalText;
                    qqBtn.style.backgroundColor = '';
                }, 2000);

            }).catch(err => {
                alert('复制失败，请手动复制链接: ' + shareLink);
            });
        } else {
             
            copyToClipboard(shareLink).then(() => {
                const originalText = qqBtn.textContent;
                qqBtn.textContent = '链接已复制';
                qqBtn.style.backgroundColor = '#12b7f5';

                 
                setTimeout(() => {
                    alert('链接已复制到剪贴板！\n\n请在QQ中：\n1. 打开要分享的聊天窗口\n2. 按 Ctrl+V 粘贴链接\n3. 发送消息');
                }, 300);

                setTimeout(() => {
                    qqBtn.textContent = originalText;
                    qqBtn.style.backgroundColor = '';
                }, 2000);

            }).catch(err => {
                alert('复制失败，请手动复制链接: ' + shareLink);
            });
        }
    });

     
    const style = document.createElement('style');
    style.textContent = `
        #share-link-btn {
            background - color: #0078d4;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin: 5px;
        transition: background-color 0.3s;
                }

        #share-wechat-btn {
            background - color: #07c160;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin: 5px;
        transition: background-color 0.3s;
                }

        #share-qq-btn {
            background - color: #12b7f5;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin: 5px;
        transition: background-color 0.3s;
                }

        #share-link-btn:hover, #share-wechat-btn:hover, #share-qq-btn:hover {
            opacity: 0.9;
        transform: translateY(-1px);
                }

        #share-link-btn:active, #share-wechat-btn:active, #share-qq-btn:active {
            transform: translateY(0);
                }
        `;
    document.head.appendChild(style);
});

 
function toggleVideoMode() {
    if (!currentVideoPath || currentVideoPath === '[NO DATA]') {
        alert('此音乐没有视频文件');
        return;
    }

    isVideoMode = !isVideoMode;

    if (isVideoMode) {
         
        videoContainer.classList.remove('hidden');
        videoBtn.textContent = '切换音乐';
        playerStatus.textContent = '视频模式';

         
        if (currentVideoPath.startsWith('http')) {
             
            const bilibiliPlayer = document.getElementById('bilibili-player');
            const videoPlayer = document.getElementById('video-player');

             
            videoPlayer.style.display = 'none';
            bilibiliPlayer.style.display = 'block';

             
            bilibiliPlayer.src = currentVideoPath;

             
            if (isPlaying) {
                audioPlayer.pause();
                isPlaying = false;
                playBtn.textContent = '▶';
                playerStatus.textContent = '视频播放中';
            }
        } else {
             
            const bilibiliPlayer = document.getElementById('bilibili-player');
            const videoPlayer = document.getElementById('video-player');

             
            bilibiliPlayer.style.display = 'none';
            videoPlayer.style.display = 'block';

             
            videoPlayer.src = currentVideoPath;
            videoPlayer.currentTime = 0;
            videoPlayer.muted = false;

             
            videoPlayer.play();
            if (isPlaying) {
                audioPlayer.pause();
                isPlaying = false;
                playBtn.textContent = '▶';
                playerStatus.textContent = '视频播放中';
            }
        }
    } else {
         
        videoContainer.classList.add('hidden');
        videoBtn.textContent = '观看视频';
        playerStatus.textContent = '音乐模式';

         
        const videoPlayer = document.getElementById('video-player');
        const bilibiliPlayer = document.getElementById('bilibili-player');

        videoPlayer.pause();
         
        if (bilibiliPlayer.style.display !== 'none') {
            bilibiliPlayer.src = '';
        }

         
        if (!isPlaying) {
            audioPlayer.play();
            isPlaying = true;
            playBtn.textContent = '||';
            playerStatus.textContent = '播放中';
        }
    }
}

 
videoBtn.addEventListener('click', toggleVideoMode);

 
videoPlayer.addEventListener('timeupdate', updateTimeDisplay);
videoPlayer.addEventListener('timeupdate', updateProgressBar);
videoPlayer.addEventListener('loadedmetadata', function () {
    updateTimeDisplay();
    updateProgressBar();
});

 
function togglePlay() {
    if (isVideoMode) {
         
        if (audioPlayer.paused) {
            audioPlayer.play();
            isPlaying = true;
            playBtn.textContent = '||';
            playerStatus.textContent = '视频+音乐播放中';
        } else {
            audioPlayer.pause();
            isPlaying = false;
            playBtn.textContent = '▶';
            playerStatus.textContent = '视频播放中';
        }
    } else {
         
        if (audioPlayer.paused) {
            audioPlayer.play();
            isPlaying = true;
            playBtn.textContent = '||';
            playerStatus.textContent = '播放中';
        } else {
            audioPlayer.pause();
            isPlaying = false;
            playBtn.textContent = '▶';
            playerStatus.textContent = '暂停中';
        }
    }
}

 
playBtn.addEventListener('click', togglePlay);

 
audioPlayer.addEventListener('timeupdate', updateTimeDisplay);
audioPlayer.addEventListener('timeupdate', updateProgressBar);
audioPlayer.addEventListener('timeupdate', function () {
    updateLyrics(audioPlayer.currentTime);
});

audioPlayer.addEventListener('loadedmetadata', function () {
    updateTimeDisplay();
    updateProgressBar();
});

 
 
videoPlayer.removeEventListener('timeupdate', updateTimeDisplay);
videoPlayer.removeEventListener('timeupdate', updateProgressBar);
videoPlayer.removeEventListener('loadedmetadata', function () {
    updateTimeDisplay();
    updateProgressBar();
});

 
videoPlayer.removeEventListener('timeupdate', function () {
     
    if (audioPlayer.duration > 0 && videoPlayer.duration > 0) {
        const audioProgress = audioPlayer.currentTime / audioPlayer.duration;
        const targetVideoTime = audioProgress * videoPlayer.duration;

         
        if (Math.abs(videoPlayer.currentTime - targetVideoTime) > 1) {
            videoPlayer.currentTime = targetVideoTime;
        }
    }
});

 
function handleAudioPlay() {
    console.log('音频播放事件触发');
    isPlaying = true;
    playBtn.textContent = '||';
    playerStatus.textContent = '播放中';
    
     
    window.isProcessingPlayPause = false;
}

 
function handleAudioPause() {
    console.log('音频暂停事件触发');
    isPlaying = false;
    playBtn.textContent = '▶';
    playerStatus.textContent = '暂停中';
    
     
    window.isProcessingPlayPause = false;
}

 
document.addEventListener('DOMContentLoaded', () => {
    loadMusicList();

     
    audioPlayer.addEventListener('play', handleAudioPlay);
    audioPlayer.addEventListener('pause', handleAudioPause);

     
    window.isProcessingPlayPause = false;
});
