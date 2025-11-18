// 这是应用的主JavaScript文件，负责实现页面的交互逻辑，包括与AI助手的对话功能、语音识别和合成等。

document.addEventListener('DOMContentLoaded', function() {
    const chatContainer = document.getElementById('chatContainer');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const voiceBtn = document.getElementById('voiceBtn');
    const resetBtn = document.getElementById('resetBtn');
    const status = document.getElementById('status');
    const character = document.getElementById('character');
    const mouth = document.getElementById('mouth');
    const avatarImg = document.getElementById('avatarImg');
    const characterContainer = document.querySelector('.character-container');

    // 加载项目内默认头像（相对于 src/1.html 的路径）
    avatarImg.src = 'assets/avatars/default.png';
    avatarImg.style.display = 'block';
    
    const DEEPSEEK_API_KEY = "sk-85892806bd814af98839d5833caac20e";
    
    let isListening = false;
    let recognition;
    let micStreamAcquired = false; // 新增：记录是否已获取麦克风权限
    let conversationHistory = [
        { role: "system", content: "你是一个课堂AI助手。请尽量保持回答简洁，适合语音播放。以纯文本的形式进行回答里不需要任何表情" }
    ];
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'zh-CN';
        
        recognition.onstart = function() {
            isListening = true;
            status.textContent = '正在聆听...';
            voiceBtn.style.background = '#ff5252';
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            status.textContent = '识别完成';
            // 自动发送识别到的文本（稍作延迟以确保 UI 更新）
            setTimeout(() => {
                sendMessage();
            }, 200);
        };
        
        recognition.onerror = function(event) {
            status.textContent = '语音识别错误: ' + event.error;
            setTimeout(() => {
                status.textContent = '准备就绪';
            }, 3000);
        };
        
        recognition.onend = function() {
            isListening = false;
            voiceBtn.style.background = '';
            if (status.textContent === '正在聆听...') {
                status.textContent = '准备就绪';
            }
        };
    } else {
        voiceBtn.disabled = true;
        voiceBtn.title = '您的浏览器不支持语音识别';
    }
    
    async function sendMessageToDeepSeek(message) {
        if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === "YOUR_DEEPSEEK_API_KEY_HERE") {
            throw new Error('请先在代码中设置有效的DeepSeek API密钥');
        }
        
        conversationHistory.push({ role: "user", content: message });
        
        try {
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: conversationHistory,
                    stream: false
                })
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            const aiResponse = data.choices[0].message.content;
            
            conversationHistory.push({ role: "assistant", content: aiResponse });
            
            return aiResponse;
        } catch (error) {
            console.error('DeepSeek API错误:', error);
            throw error;
        }
    }
    
    let voices = [];

    function populateVoiceList() {
        if(typeof speechSynthesis === 'undefined') {
            return;
        }
        voices = speechSynthesis.getVoices();
        // 可以在这里打印出来看看你的浏览器支持哪些语音
        console.log("可用的语音列表:", voices); 
    }

    populateVoiceList();
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }


    function speakText(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // --- 核心修改部分 ---
            // 1. 查找一个中文男声
            // 注意：'male', '男' 这些关键词取决于浏览器和操作系统的命名
            const maleVoice = voices.find(voice => 
                voice.lang === 'zh-TW' && 
                (voice.name.includes('Male') || voice.name.includes('男') || voice.name.includes('Xiaochen')) // Xiaochen是Windows上常见的男声
            );

            // 2. 如果找到了，就使用它
            if (maleVoice) {
                utterance.voice = maleVoice;
                console.log("已选用男声:", maleVoice.name);
            } else {
                // 如果没找到，就使用默认的中文语音（通常是女声）
                utterance.lang = 'zh-TW';
                console.log("未找到指定男声，使用默认中文语音。");
            }
            
            // 其他设置保持不变
            utterance.rate = 1.5;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            utterance.onstart = function() {
                character.classList.add('talking');
                status.textContent = '正在朗读回复...';
            };
            
            utterance.onend = function() {
                character.classList.remove('talking');
                status.textContent = '准备就绪';
            };
            
            utterance.onerror = function(event) {
                console.error('语音合成错误:', event);
                character.classList.remove('talking');
                status.textContent = '语音合成错误';
                setTimeout(() => {
                    status.textContent = '准备就绪';
                }, 3000);
            };
            
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn('您的浏览器不支持语音合成');
            status.textContent = '您的浏览器不支持语音朗读';
            setTimeout(() => {
                status.textContent = '准备就绪';
            }, 3000);
        }
    }
    
    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;
        
        addMessage(message, 'user');
        userInput.value = '';
        
        status.textContent = 'AI正在思考...';
        sendBtn.disabled = true;
        
        try {
            const aiResponse = await sendMessageToDeepSeek(message);
            addMessage(aiResponse, 'ai');
            speakText(aiResponse);
        } catch (error) {
            console.error('错误:', error);
            let errorMessage = '抱歉，发生了错误: ' + error.message;
            addMessage(errorMessage, 'ai');
            status.textContent = '错误: ' + error.message;
            
            setTimeout(() => {
                status.textContent = '准备就绪';
            }, 5000);
        } finally {
            sendBtn.disabled = false;
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
    
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
        messageDiv.textContent = text;
        chatContainer.appendChild(messageDiv);
        
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    sendBtn.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // 新增：只请求一次麦克风权限
    async function acquireMicPermission() {
        if (micStreamAcquired) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // 立即停止所有轨道以释放麦克风，但浏览器会记住权限（会话内）
            stream.getTracks().forEach(track => track.stop());
            micStreamAcquired = true;
        } catch (err) {
            console.error('获取麦克风权限失败:', err);
            throw err;
        }
    }

    voiceBtn.addEventListener('click', async function() {
        if (!recognition) return;
        if (isListening) {
            recognition.stop();
            return;
        }
        try {
            // 第一次点击先申请一次权限，之后不会再次弹窗（若浏览器支持记住权限）
            await acquireMicPermission();
            recognition.start();
        } catch (err) {
            status.textContent = '无法获取麦克风权限';
            setTimeout(() => { status.textContent = '准备就绪'; }, 3000);
        }
    });
    
    resetBtn.addEventListener('click', function() {
        chatContainer.innerHTML = '<div class="message ai-message">对话已重置！我是你的动漫AI助手，有什么可以帮你的吗？</div>';
        conversationHistory = [
            { role: "system", content: "你是一个课堂AI助手。请尽量保持回答简洁，适合语音播放。以纯文本的形式进行回答里不需要任何表情" }
        ];
        status.textContent = '对话已重置';
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        character.classList.remove('talking');
        setTimeout(() => {
            status.textContent = '准备就绪';
        }, 2000);
    });
    
    document.addEventListener('mousemove', function(e) {
        const eyes = document.querySelectorAll('.pupil');
        const characterRect = character.getBoundingClientRect();
        const characterCenterX = characterRect.left + characterRect.width / 2;
        const characterCenterY = characterRect.top + characterRect.height / 2;
        
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        const angleX = (mouseX - characterCenterX) / 50;
        const angleY = (mouseY - characterCenterY) / 50;
        
        eyes.forEach(eye => {
            eye.style.transform = `translate(calc(-50% + ${angleX}px), calc(-50% + ${angleY}px))`;
        });
    });
});