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
    
    // 全局变量
    let voices = [];
    let voicesReady = false;

    // 更健壮的填充
    function populateVoiceList() {
        if (typeof speechSynthesis === 'undefined') return;
        voices = speechSynthesis.getVoices() || [];
        console.log("可用语音:", voices.map(v => `${v.name} (${v.lang})`));
        if (voices.length > 0) voicesReady = true;
    }

    populateVoiceList();
    if (typeof speechSynthesis !== 'undefined') {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    // 在 speakText 里等待 voices 就绪（超时回退）
    async function waitVoicesReady(timeout = 2000) {
        const start = Date.now();
        while (!voicesReady && Date.now() - start < timeout) {
            await new Promise(res => setTimeout(res, 100));
        }
    }

    // 更稳健的 speakText 实现
    async function speakText(text) {
        if (!('speechSynthesis' in window)) {
            status.textContent = '您的浏览器不支持语音朗读';
            return;
        }

        await waitVoicesReady(2000); // 等待最多 2s

        // 限制与清理文本
        if (!text || !text.trim()) return;
        text = text.replace(/[\u200B-\u200F\uFEFF]/g, '').trim(); // 去控制字符

        // 找中文语音（优先 male），宽松匹配 lang
        const zhVoices = voices.filter(v => /^zh/.test(v.lang));
        let chosenVoice = null;
        if (zhVoices.length) {
            chosenVoice = zhVoices.find(v => /男|Male|Microsoft|Xiaochen|Xiaocheng/i.test(v.name)) || zhVoices[0];
        }

        // 分片播放（如果文本非常长）
        const maxLen = 300; // 可调整
        const parts = [];
        for (let i = 0; i < text.length; i += maxLen) parts.push(text.slice(i, i + maxLen));

        // 播放队列，串行播放每段
        for (const part of parts) {
            const utter = new SpeechSynthesisUtterance(part);
            if (chosenVoice) utter.voice = chosenVoice;
            utter.lang = chosenVoice ? chosenVoice.lang : (zhVoices[0] ? zhVoices[0].lang : 'zh-CN');
            utter.rate = 1.0; // 降速更稳妥
            utter.pitch = 1.0;
            utter.volume = 1.0;

            utter.onstart = () => { character.classList.add('talking'); status.textContent = '正在朗读回复...'; };
            utter.onend = () => { character.classList.remove('talking'); status.textContent = '准备就绪'; };
            utter.onerror = (ev) => {
                console.error('语音合成错误事件：', ev);
                character.classList.remove('talking');
                // 回退策略：如果指定 voice 导致错误，尝试不指定 voice 重试一次
                if (chosenVoice) {
                    console.warn('重试：不指定 voice 再试一次');
                    utter.voice = null;
                    utter.lang = 'zh-CN';
                    try { window.speechSynthesis.speak(utter); } catch (e) { console.error('重试失败', e); }
                } else {
                    status.textContent = '语音合成错误';
                    setTimeout(() => status.textContent = '准备就绪', 3000);
                }
            };

            // 使用 cancel+短延迟或直接 speak（要注意不同浏览器差异）
            window.speechSynthesis.cancel();
            await new Promise(res => setTimeout(res, 80))
            window.speechSynthesis.speak(utter);

            // 等待该段播放结束（通过事件或轮询）再继续
            await new Promise(resolve => {
                utter.onend = () => { resolve(); };
                utter.onerror = () => { resolve(); };
            });
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
        chatContainer.innerHTML = '<div class="message ai-message">对话已重置！我是你的课堂AI助手，有什么可以帮你的吗？</div>';
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