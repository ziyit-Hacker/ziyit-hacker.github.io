 
function checkCreditBlacklist() {
    console.log('开始检查征信黑名单...');
    
     
    const currentUser = getCurrentUser();
    console.log('当前用户:', currentUser);
    
    if (!currentUser) {
        console.log('未检测到登录用户，跳过黑名单检查');
        return false;
    }
    
     
    fetch('/zxbl.txt')
        .then(response => {
            console.log('黑名单文件响应状态:', response.status);
            if (!response.ok) {
                throw new Error('黑名单文件加载失败: ' + response.status);
            }
            return response.text();
        })
        .then(data => {
            console.log('黑名单文件内容:', data);
            const lines = data.split('\n');
            let foundInBlacklist = false;
            
             
            for (const line of lines) {
                if (line.trim() === '') continue;
                
                 
                const parts = line.split('  \\\\  ');
                console.log('解析行:', line, '分割结果:', parts);
                
                if (parts.length >= 2) {
                    const blacklistUserData = parts[0].trim();
                    const reason = parts[1].trim();
                    
                    console.log('黑名单用户数据:', blacklistUserData, '当前用户数据:', currentUser);
                    
                     
                    const blacklistDataParts = blacklistUserData.split('-');
                    const blacklistUsername = blacklistDataParts.length >= 2 ? blacklistDataParts[1] : blacklistUserData;
                    
                     
                    const currentUserParts = currentUser.split('-');
                    const currentUsername = currentUserParts.length >= 2 ? currentUserParts[1] : currentUser;
                    
                    console.log('黑名单用户名:', blacklistUsername, '当前用户名:', currentUsername);
                    
                     
                    if (blacklistUserData === currentUser || blacklistUsername === currentUsername) {
                        console.log('用户存在于黑名单中，原因:', reason);
                         
                        showCreditWarning(reason);
                        foundInBlacklist = true;
                        return;
                    }
                }
            }
            
            if (!foundInBlacklist) {
                console.log('用户不在黑名单中');
            }
        })
        .catch(error => {
            console.error('加载黑名单文件失败:', error);
        });
}

 
function showCreditWarning(reason) {
    console.log('显示征信警告，原因:', reason);
    
     
    const creditWarning = document.createElement('div');
    creditWarning.id = 'credit-warning';
    creditWarning.innerHTML = `
        <div id="credit-badge" style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #ff4444;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        ">征信</div>
        <div id="credit-details" style="
            position: fixed;
            bottom: 60px;
            right: 20px;
            background-color: #ff4444;
            color: white;
            padding: 15px;
            border-radius: 5px;
            font-size: 14px;
            max-width: 300px;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.3s ease;
            z-index: 9998;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            pointer-events: none;
        ">您存在在征信黑名单中，无法使用大部分功能，原因为：${reason}</div>
    `;
    
    document.body.appendChild(creditWarning);
    
    const creditBadge = document.getElementById('credit-badge');
    const creditDetails = document.getElementById('credit-details');
    
     
    creditBadge.addEventListener('mouseenter', () => {
        creditDetails.style.opacity = '1';
        creditDetails.style.transform = 'translateY(0)';
        creditDetails.style.pointerEvents = 'auto';
    });
    
    creditBadge.addEventListener('mouseleave', () => {
        creditDetails.style.opacity = '0';
        creditDetails.style.transform = 'translateY(10px)';
        creditDetails.style.pointerEvents = 'none';
    });
    
     
    setTimeout(() => {
        removeRandomElements();
    }, 1000);
}

 
function removeRandomElements() {
    console.log('开始删除页面元素...');
    const elementsToRemove = [];
    const allElements = document.body.querySelectorAll('*:not(#credit-warning):not(#credit-warning *)');
    
    console.log('页面元素总数:', allElements.length);
    
     
    const randomPercentage = 0.25 + Math.random() * 0.5;  
    const removeCount = Math.floor(allElements.length * randomPercentage);
    console.log('随机删除比例:', (randomPercentage * 100).toFixed(1) + '%', '需要删除的元素数量:', removeCount);
    
     
    while (elementsToRemove.length < removeCount && allElements.length > 0) {
        const randomIndex = Math.floor(Math.random() * allElements.length);
        const element = allElements[randomIndex];
        
         
        if (!elementsToRemove.includes(element) && 
            !element.closest('#credit-warning')) {
            elementsToRemove.push(element);
        }
    }
    
    console.log('即将删除的元素数量:', elementsToRemove.length);
    
     
    elementsToRemove.forEach(element => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    
    console.log('元素删除完成');
}

 
function getCurrentUser() {
    console.log('开始获取当前用户...');
    
     
    const urlParams = new URLSearchParams(window.location.search);
    const urlUser = urlParams.get('user');
    if (urlUser) {
        console.log('从URL参数获取用户:', urlUser);
        return urlUser;
    }
    
     
    const userData = getCookie('authToken') || localStorage.getItem('authToken');
    console.log('从cookie/localStorage获取的用户数据:', userData);
    
    if (!userData) {
        console.log('未找到任何用户数据');
        return null;
    }
    
    try {
         
        const parts = userData.split('-');
        console.log('解析用户数据部分:', parts);
        
        if (parts.length >= 2) {
             
            const username = parts[1];
            console.log('解析出的用户名:', username);
            return username;
        }
    } catch (error) {
        console.error('解析用户数据失败:', error);
    }
    
    console.log('用户数据解析失败，返回原始数据:', userData);
    return userData;  
}

 
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return null;
}

 
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始检查征信黑名单');
    checkCreditBlacklist();
});

 
window.manualCheckBlacklist = function() {
    console.log('手动触发征信检查');
    checkCreditBlacklist();
};