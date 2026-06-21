/**
 * Adobe Premiere Pro Replica - app.js
 */

const state = {
    mediaAssets: [],
    timelineClips: [],
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    selectedClipId: null,
    zoomLevel: 100,
    masterVolume: 1,
    activeTool: 'select', // 'select' or 'razor'
    sourceAssetId: null,
    history: []
};

// --- Audio Engine ---
let audioCtx;
let masterGain;
let exportDest;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    exportDest = audioCtx.createMediaStreamDestination();
    masterGain.connect(audioCtx.destination);
    masterGain.connect(exportDest);
    masterGain.gain.value = state.masterVolume;
}

// --- UI Elements ---
const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');
const timeline = document.getElementById('timeline');
const playhead = document.getElementById('playhead');
const timestampDisplay = document.getElementById('timestamp');
const mediaGrid = document.getElementById('media-grid');
const importBtn = document.getElementById('import-btn');
const exportBtn = document.getElementById('export-btn');
const playPauseBtn = document.getElementById('play-pause');
const adobeTextEditor = document.getElementById('adobe-text-editor');

canvas.width = 1280;
canvas.height = 720;

// --- Initialization ---
function init() {
    setupTabs();
    setupEventListeners();
    requestAnimationFrame(playbackLoop);
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const panels = document.querySelectorAll('.library-container');
            panels.forEach(p => p.style.display = 'none');

            const targetId = tab.dataset.tab + '-panel';
            const target = document.getElementById(targetId) || document.getElementById(tab.dataset.tab + '-library');
            if (target) {
                target.style.display = 'block';
                if (tab.dataset.tab === 'templates') renderTemplates();
            }
        };
    });
}

const templatesLibrary = [
    { id: 'vlog', name: 'Vlog Intro', description: 'Upbeat music + Title' },
    { id: 'cinematic', name: 'Cinematic', description: 'Slow pans + Epic audio' },
    { id: 'horror', name: 'Horror', description: 'Glitchy text + Dark atmosphere' },
    { id: 'scifi', name: 'Sci-Fi', description: 'Neon effects + Synth audio' },
    { id: 'news', name: 'News', description: 'Lower thirds + Formal style' },
    { id: 'minimal', name: 'Minimal', description: 'Clean cuts + Simple titles' },
    { id: 'retro', name: 'Retro', description: 'CRT filter + 8-bit audio' },
    { id: 'gaming', name: 'Gaming', description: 'Fast cuts + Energetic' },
    { id: 'travel', name: 'Travel', description: 'Smooth transitions' },
    { id: 'doc', name: 'Documentary', description: 'Subtitles + Ambient audio' }
];

function renderTemplates() {
    const grid = document.getElementById('templates-grid');
    grid.innerHTML = '';
    templatesLibrary.forEach(tpl => {
        const item = document.createElement('div');
        item.className = 'media-item';
        item.style.padding = '10px';
        item.style.backgroundColor = '#333';
        item.style.fontSize = '12px';
        item.innerHTML = `<strong>${tpl.name}</strong><br><small style="color: #888;">${tpl.description}</small>`;
        item.onclick = () => applyTemplate(tpl.id);
        grid.appendChild(item);
    });
}

function applyTemplate(id) {
    AIAgent.addMessage(`Applying ${id} template...`, 'bot');
    // Automation logic to add clips/effects based on template
    if (id === 'vlog') {
        AIAgent.executeActions([
            { action: 'setText', text: 'MY VLOG', startTime: 0, duration: 3 }
        ]);
    }
}

function setupEventListeners() {
    importBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*,audio/*,image/*';
        input.multiple = true;
        input.onchange = (e) => Array.from(e.target.files).forEach(addMediaAsset);
        input.click();
    };

    playPauseBtn.onclick = () => {
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        state.isPlaying ? pause() : play();
    };

    document.getElementById('tool-select').onclick = () => setTool('select');
    document.getElementById('tool-razor').onclick = () => setTool('razor');

    window.onkeydown = (e) => {
        if (document.activeElement.tagName === 'INPUT') return;
        if (e.key.toLowerCase() === 'v') setTool('select');
        if (e.key.toLowerCase() === 'c') setTool('razor');
        if (e.key === ' ') { e.preventDefault(); playPauseBtn.click(); }
    };

    document.getElementById('timeline-zoom').oninput = (e) => {
        state.zoomLevel = e.target.value * 100;
        renderTimeline();
    };

    exportBtn.onclick = () => exportVideo();
}

function exportVideo() {
    initAudio();
    const stream = canvas.captureStream(30);
    const audioTrack = exportDest.stream.getAudioTracks()[0];
    if (audioTrack) stream.addTrack(audioTrack);

    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'premiere-replica-export.webm';
        a.click();
    };

    const originalTime = state.currentTime;
    state.currentTime = 0;
    state.isPlaying = true;
    recorder.start();

    const frame = () => {
        if (state.currentTime >= state.duration) {
            recorder.stop();
            state.isPlaying = false;
            state.currentTime = originalTime;
            return;
        }
        state.currentTime += 1/30;
        renderPreview();
        syncAudio();
        requestAnimationFrame(frame);
    };
    frame();
}

function setTool(tool) {
    state.activeTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tool-' + tool).classList.add('active');
}

// --- Media Logic ---
function addMediaAsset(file) {
    const asset = {
        id: 'asset-' + Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image',
        url: URL.createObjectURL(file),
        duration: 0,
        element: null
    };

    if (asset.type === 'video' || asset.type === 'audio') {
        const el = document.createElement(asset.type === 'video' ? 'video' : 'audio');
        el.src = asset.url;
        el.crossOrigin = 'anonymous';
        el.onloadedmetadata = () => {
            asset.duration = el.duration;
            asset.element = el;
            renderMediaGrid();
        };
    } else {
        const img = new Image();
        img.src = asset.url;
        img.onload = () => {
            asset.duration = 5;
            asset.element = img;
            renderMediaGrid();
        };
    }
    state.mediaAssets.push(asset);
}

function renderMediaGrid() {
    mediaGrid.innerHTML = '';
    state.mediaAssets.forEach(asset => {
        const item = document.createElement('div');
        item.className = 'media-item';
        item.style.width = '100px';
        item.style.height = '60px';
        item.style.backgroundColor = '#111';
        item.style.marginBottom = '5px';
        item.style.cursor = 'pointer';
        item.innerHTML = `<div style="font-size: 9px; padding: 2px; color: #AAA; overflow: hidden; height: 100%;">${asset.name}</div>`;

        item.onclick = () => loadToSourceMonitor(asset);
        item.ondblclick = () => addClipToTimeline(asset);
        mediaGrid.appendChild(item);
    });
}

function loadToSourceMonitor(asset) {
    state.sourceAssetId = asset.id;
    const sourceHeader = document.querySelector('#source-monitor .monitor-header');
    sourceHeader.innerText = `Source: ${asset.name}`;

    const sourceVideo = document.getElementById('source-video');
    const placeholder = document.getElementById('source-placeholder');

    if (asset.type === 'video') {
        sourceVideo.src = asset.url;
        sourceVideo.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        sourceVideo.style.display = 'none';
        placeholder.style.display = 'block';
        placeholder.innerText = asset.name;
    }
}

// --- Timeline Logic ---
function addClipToTimeline(asset, startTime = state.duration) {
    const clip = {
        id: 'clip-' + Math.random().toString(36).substr(2, 9),
        assetId: asset.id,
        type: asset.type,
        startTime: startTime,
        duration: asset.duration,
        offset: 0,
        trackId: asset.type === 'audio' ? 'audio-track' : 'video-track-1',
        x: 0, y: 0, scale: 1,
        filters: { brightness: 100, contrast: 100 },
        audioNode: null
    };
    state.timelineClips.push(clip);
    updateDuration();
    renderTimeline();
}

function updateDuration() {
    state.duration = state.timelineClips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
}

function renderTimeline() {
    const tracks = ['video-track-2', 'video-track-1', 'audio-track'];
    tracks.forEach(trackId => {
        const trackEl = document.getElementById(trackId);
        trackEl.innerHTML = '';
        state.timelineClips.filter(c => c.trackId === trackId).forEach(clip => {
            const asset = state.mediaAssets.find(a => a.id === clip.assetId);
            const clipEl = document.createElement('div');
            clipEl.className = `clip ${clip.type}-clip`;
            if (state.selectedClipId === clip.id) clipEl.style.boxShadow = 'inset 0 0 0 2px white';
            clipEl.style.left = (clip.startTime * state.zoomLevel) + 'px';
            clipEl.style.width = (clip.duration * state.zoomLevel) + 'px';
            clipEl.innerText = asset ? asset.name : (clip.text || 'Title');

            clipEl.onclick = (e) => {
                e.stopPropagation();
                if (state.activeTool === 'razor') {
                    // Razor tool splits at current playback time or click time?
                    // Premiere splits at click location.
                    const rect = trackEl.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const splitTime = clickX / state.zoomLevel;
                    splitClip(clip, splitTime);
                } else {
                    state.selectedClipId = clip.id;
                    renderTimeline();
                }
            };

            // Drag and Drop Logic
            clipEl.onmousedown = (e) => {
                if (state.activeTool !== 'select') return;
                e.stopPropagation();
                const startX = e.clientX;
                const initialStartTime = clip.startTime;

                const onMouseMove = (moveEvent) => {
                    const deltaX = (moveEvent.clientX - startX) / state.zoomLevel;
                    clip.startTime = Math.max(0, initialStartTime + deltaX);
                    renderTimeline();
                };

                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    updateDuration();
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };

            trackEl.appendChild(clipEl);
        });
    });

    playhead.style.left = (state.currentTime * state.zoomLevel) + 'px';
    updateTimestamp();
}

function splitClip(clip, time) {
    if (time <= clip.startTime || time >= clip.startTime + clip.duration) return;

    const splitPoint = time - clip.startTime;
    const newClip = JSON.parse(JSON.stringify(clip));
    newClip.id = 'clip-' + Math.random().toString(36).substr(2, 9);
    newClip.startTime = time;
    newClip.duration = clip.duration - splitPoint;
    newClip.offset = clip.offset + splitPoint;

    clip.duration = splitPoint;
    state.timelineClips.push(newClip);
    renderTimeline();
}

// --- Playback and Rendering ---
function playbackLoop(timestamp) {
    if (state.isPlaying) {
        state.currentTime += 1/60; // Assuming 60fps
        if (state.currentTime >= state.duration) {
            state.currentTime = state.duration;
            pause();
        }
        updateUI();
    }
    renderPreview();
    requestAnimationFrame(playbackLoop);
}

function play() { state.isPlaying = true; playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; }
function pause() { state.isPlaying = false; playPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; }

function updateUI() {
    playhead.style.left = (state.currentTime * state.zoomLevel) + 'px';
    updateTimestamp();
    syncAudio();
    updateAdobeEditorSync();
}

function updateTimestamp() {
    const pad = (n) => Math.floor(n).toString().padStart(2, '0');
    const f = (s) => `${pad(s/3600)}:${pad((s%3600)/60)}:${pad(s%60)}:${pad((s%1)*60)}`;
    timestampDisplay.innerText = f(state.currentTime);
}

function renderPreview() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const activeClips = state.timelineClips
        .filter(c => (c.type === 'video' || c.type === 'image' || c.type === 'text') && state.currentTime >= c.startTime && state.currentTime < c.startTime + c.duration)
        .sort((a, b) => {
            const order = { 'video-track-1': 1, 'video-track-2': 2 };
            return order[a.trackId] - order[b.trackId];
        });

    activeClips.forEach(clip => {
        const asset = state.mediaAssets.find(a => a.id === clip.assetId);
        ctx.save();

        if (asset && asset.element) {
            if (clip.type === 'video') {
                const vid = asset.element;
                vid.currentTime = (state.currentTime - clip.startTime) + clip.offset;
                ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
            } else if (clip.type === 'image') {
                const elapsed = state.currentTime - clip.startTime;
                const progress = elapsed / clip.duration;
                const kenBurnsScale = 1 + progress * 0.2; // 20% zoom
                ctx.translate(canvas.width/2, canvas.height/2);
                ctx.scale(kenBurnsScale, kenBurnsScale);
                ctx.translate(-canvas.width/2, -canvas.height/2);
                ctx.drawImage(asset.element, 0, 0, canvas.width, canvas.height);
            }
        }

        if (clip.type === 'text') {
            applySubtitleAnimation(clip);
        }
        ctx.restore();
    });
}

function applySubtitleAnimation(clip) {
    const elapsed = state.currentTime - clip.startTime;
    const anim = clip.animation || 'none';
    let x = canvas.width/2;
    let y = canvas.height/2;
    let scale = 1;
    let alpha = 1;

    ctx.fillStyle = clip.color || 'white';
    ctx.font = `${clip.fontSize || 60}px Arial`;
    ctx.textAlign = 'center';

    if (anim === 'glitch') {
        if (Math.random() > 0.9) x += (Math.random() - 0.5) * 20;
    } else if (anim === 'shake') {
        x += Math.sin(elapsed * 20) * 5;
        y += Math.cos(elapsed * 20) * 5;
    } else if (anim === 'neon') {
        ctx.shadowBlur = 15 + Math.sin(elapsed * 10) * 10;
        ctx.shadowColor = clip.color || 'cyan';
    } else if (anim === '3d') {
        ctx.transform(1, 0.2 * Math.sin(elapsed), 0, 1, 0, 0);
    } else if (anim === 'rainbow') {
        ctx.fillStyle = `hsl(${elapsed * 100}, 100%, 50%)`;
    }

    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillText(clip.text, 0, 0);
}

function syncAudio() {
    if (!audioCtx) return;

    state.timelineClips.filter(c => c.type === 'video' || c.type === 'audio').forEach(clip => {
        const asset = state.mediaAssets.find(a => a.id === clip.assetId);
        if (asset && asset.element && (asset.type === 'video' || asset.type === 'audio')) {
            const el = asset.element;
            const isActive = state.isPlaying && state.currentTime >= clip.startTime && state.currentTime < clip.startTime + clip.duration;

            if (isActive) {
                if (!clip.audioNode) {
                    clip.audioNode = audioCtx.createMediaElementSource(el);
                    clip.audioNode.connect(masterGain);
                }
                const targetTime = (state.currentTime - clip.startTime) + clip.offset;
                if (Math.abs(el.currentTime - targetTime) > 0.1) el.currentTime = targetTime;
                if (el.paused) el.play().catch(() => {});
            } else {
                el.pause();
            }
        }
    });
}

function updateAdobeEditorSync() {
    const textClip = state.timelineClips.find(c => c.type === 'text' && state.currentTime >= c.startTime && state.currentTime < c.startTime + c.duration);
    if (textClip) {
        adobeTextEditor.value = textClip.text;
    } else {
        adobeTextEditor.value = "";
    }
}

adobeTextEditor.oninput = (e) => {
    let textClip = state.timelineClips.find(c => c.type === 'text' && state.currentTime >= c.startTime && state.currentTime < c.startTime + c.duration);
    if (!textClip) {
        textClip = {
            id: 'clip-' + Math.random().toString(36).substr(2, 9),
            type: 'text',
            text: e.target.value,
            startTime: state.currentTime,
            duration: 3,
            trackId: 'video-track-2'
        };
        state.timelineClips.push(textClip);
        updateDuration();
    } else {
        textClip.text = e.target.value;
    }
    renderTimeline();
};

// --- AIAgent ---
const AIAgent = {
    init() {
        document.getElementById('ai-trigger').onclick = () => {
            const panel = document.getElementById('ai-panel');
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        };
        document.getElementById('close-ai').onclick = () => {
            document.getElementById('ai-panel').style.display = 'none';
        };
        document.getElementById('send-ai-btn').onclick = () => this.handleInput();
        document.getElementById('ai-command-input').onkeypress = (e) => {
            if (e.key === 'Enter') this.handleInput();
        };
    },

    async handleInput() {
        const input = document.getElementById('ai-command-input');
        const cmd = input.value.trim();
        if (!cmd) return;

        this.addMessage(cmd, 'user');
        input.value = '';

        this.addMessage("Neural AI is thinking...", 'bot');

        try {
            const response = await this.callAI(cmd);
            const actions = JSON.parse(response);
            this.executeActions(actions);
            this.addMessage("Neural transformations applied.", 'bot');
        } catch (e) {
            console.error(e);
            this.addMessage("AI link disrupted. Try again.", 'bot');
        }
    },

    addMessage(text, type) {
        const history = document.getElementById('ai-chat-history');
        const msg = document.createElement('div');
        msg.className = type + '-msg';
        msg.style.background = type === 'user' ? '#00AAFF33' : '#333';
        msg.style.padding = '8px';
        msg.style.borderRadius = '4px';
        msg.style.alignSelf = type === 'user' ? 'flex-end' : 'flex-start';
        msg.innerText = text;
        history.appendChild(msg);
        history.scrollTop = history.scrollHeight;
    },

    async callAI(prompt) {
        const apiKey = localStorage.getItem('OPENAI_API_KEY') || 'sk-proj-yi0ER...';
        const systemPrompt = `You are a video editor AI. Assets: ${JSON.stringify(state.mediaAssets.map(a => ({id: a.id, name: a.name}))) }
        Return JSON array of actions:
        - {"action": "addClip", "assetId": "id", "startTime": sec}
        - {"action": "cut", "clipId": "id", "time": sec}
        - {"action": "setText", "text": "str", "startTime": sec, "duration": sec}
        - {"action": "generateImage", "prompt": "str"}
        - {"action": "generateTTS", "text": "str"}
        Only JSON.`;

        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{role: "system", content: systemPrompt}, {role: "user", content: prompt}]
            })
        });
        const data = await resp.json();
        return data.choices[0].message.content;
    },

    executeActions(actions) {
        actions.forEach(act => {
            if (act.action === 'addClip') {
                const asset = state.mediaAssets.find(a => a.id === act.assetId);
                if (asset) addClipToTimeline(asset, act.startTime);
            } else if (act.action === 'setText') {
                const clip = {
                    id: 'clip-' + Math.random().toString(36).substr(2, 9),
                    type: 'text',
                    text: act.text,
                    startTime: act.startTime || state.currentTime,
                    duration: act.duration || 3,
                    trackId: 'video-track-2'
                };
                state.timelineClips.push(clip);
                updateDuration();
                renderTimeline();
            } else if (act.action === 'generateImage') {
                this.mockGenerateImage(act.prompt);
            } else if (act.action === 'generateTTS') {
                this.mockGenerateTTS(act.text);
            }
        });
    },

    mockGenerateImage(prompt) {
        const canvas = document.createElement('canvas');
        canvas.width = 1280; canvas.height = 720;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#111'; ctx.fillRect(0,0,1280,720);
        ctx.fillStyle = 'white'; ctx.font = '30px Arial';
        ctx.fillText("AI Image: " + prompt, 100, 360);
        const asset = {
            id: 'ai-img-' + Math.random().toString(36).substr(2, 9),
            name: "AI: " + prompt,
            type: 'image',
            url: canvas.toDataURL(),
            duration: 5,
            element: new Image()
        };
        asset.element.src = asset.url;
        state.mediaAssets.push(asset);
        renderMediaGrid();
    },

    mockGenerateTTS(text) {
        this.addMessage("Generating TTS for: " + text, 'bot');
        // In a real scenario, call OpenAI TTS API
    }
};

AIAgent.init();
init();
