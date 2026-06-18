        // app.js - WonderClone Filmora Futuristic Edition

const state = {
    mediaAssets: [],
    audioAssets: [],
    timelineClips: [], // Both video and audio clips
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    selectedClipId: null,
    zoomLevel: 100,
    masterVolume: 100,
    playerModel: 'default',
    transitionSpeed: 0.5,
    transitionContrast: 100,
    aspectRatio: '16/9',
    viewMode: 'fit',
    themeStyle: 'neon'
};

const mediaGrid = document.getElementById('media-grid');
const importBtn = document.getElementById('import-btn');
const emptyMsg = document.querySelector('.empty-msg');
const timeline = document.getElementById('timeline');
const videoTrack1 = document.getElementById('video-track-1');
const videoTrack2 = document.getElementById('video-track-2');
const audioTrack = document.getElementById('audio-track');
const playhead = document.getElementById('playhead');
const playPauseBtn = document.getElementById('play-pause');
const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');
const timestampDisplay = document.getElementById('timestamp');
const zoomInput = document.getElementById('timeline-zoom');
const playerModelSelect = document.getElementById('player-model-select');
const previewContainer = document.getElementById('main-preview-container');
const aspectRatioSelect = document.getElementById('aspect-ratio-select');
const viewModeSelect = document.getElementById('view-mode-select');
const styleButtons = document.querySelectorAll('.style-btn');
const clipTransformControls = document.getElementById('clip-transform-controls');
const clipXInput = document.getElementById('clip-x');
const clipYInput = document.getElementById('clip-y');
const adobeTextEditor = document.getElementById("adobe-text-editor");
const clipScaleInput = document.getElementById('clip-scale');

canvas.width = 1280;
canvas.height = 720;

let isDraggingCanvas = false;
let draggedClip = null;
let dragStartX, dragStartY;
let clipStartX, clipStartY;

canvas.onmousedown = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const activeClips = state.timelineClips.filter(c =>
        (c.type === 'video' || c.type === 'image' || c.type === 'text') &&
        state.currentTime >= c.startTime &&
        state.currentTime < (c.startTime + c.duration)
    ).reverse();

    for (const clip of activeClips) {
        let isHit = false;
        if (clip.type === 'text') {
            ctx.font = `${clip.fontSize || 60}px Orbitron`;
            const textWidth = ctx.measureText(clip.text).width;
            const fontSize = parseInt(clip.fontSize) || 60;
            const padding = 20;

            const x = clip.x !== undefined ? clip.x : canvas.width/2;
            const y = clip.y !== undefined ? clip.y : canvas.height/2;

            const left = x - textWidth/2 - padding;
            const right = x + textWidth/2 + padding;
            const top = y - fontSize/2 - padding;
            const bottom = y + fontSize/2 + padding;

            if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) {
                isHit = true;
            }
        } else {
            const cw = canvas.width, ch = canvas.height;
            const x = clip.x || 0;
            const y = clip.y || 0;
            const scale = clip.scale || 1;

            const left = cw/2 + x - (cw/2 * scale);
            const right = cw/2 + x + (cw/2 * scale);
            const top = ch/2 + y - (ch/2 * scale);
            const bottom = ch/2 + y + (ch/2 * scale);

            if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) {
                isHit = true;
            }
        }

        if (isHit) {
            isDraggingCanvas = true;
            draggedClip = clip;
            dragStartX = mouseX;
            dragStartY = mouseY;
            clipStartX = clip.x || 0;
            clipStartY = clip.y || 0;
            selectClip(clip.id);
            return;
        }
    }
    selectClip(null);
};

window.addEventListener('mousemove', (e) => {
    if (!isDraggingCanvas || !draggedClip) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const dx = mouseX - dragStartX;
    const dy = mouseY - dragStartY;

    draggedClip.x = Math.round(clipStartX + dx);
    draggedClip.y = Math.round(clipStartY + dy);

    updateUIForSelectedClip();
    renderPreview();
});

window.addEventListener('mouseup', () => {
    isDraggingCanvas = false;
    draggedClip = null;
});

function selectClip(clipId) {
    state.selectedClipId = clipId;
    renderTimeline();
    updateUIForSelectedClip();
}

function updateUIForSelectedClip() {
    const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
    if (!clip) {
        clipTransformControls.style.display = 'none';
        return;
    }

    clipTransformControls.style.display = 'block';
    clipXInput.value = clip.x || 0;
    clipYInput.value = clip.y || 0;
    clipScaleInput.value = clip.scale || 1;

    if (clip.type === 'text') {
        updateTitleInputs(clip);
    }
}

clipXInput.oninput = (e) => {
    const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
    if (clip) {
        clip.x = parseInt(e.target.value);
        renderPreview();
    }
};

clipYInput.oninput = (e) => {
    const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
    if (clip) {
        clip.y = parseInt(e.target.value);
        renderPreview();
    }
};

clipScaleInput.oninput = (e) => {
    const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
    if (clip) {
        clip.scale = parseFloat(e.target.value);
        renderPreview();
    }
};

// --- Tab System ---
const tabs = document.querySelectorAll('.tab');
const panels = {
    media: document.getElementById('media-library'),
    titles: document.getElementById('titles-panel'),
    audio: document.getElementById('audio-panel'),
    effects: null, // created dynamically
    transitions: document.getElementById('transitions-panel')
};

tabs.forEach(tab => {
    tab.onclick = () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        Object.keys(panels).forEach(key => {
            if (panels[key]) panels[key].style.display = 'none';
        });

        const target = tab.dataset.tab;
        if (target === 'effects') {
            showEffects();
        } else if (panels[target]) {
            panels[target].style.display = 'block';
            if (effectsPanel) effectsPanel.style.display = 'none';
            if (target === 'transitions') showTransitions();
        }
    };
});

// --- Preview Side Controls ---
playerModelSelect.onchange = (e) => {
    const model = e.target.value;
    previewContainer.className = 'preview-container ' + model;
    state.playerModel = model;
};

aspectRatioSelect.onchange = (e) => {
    state.aspectRatio = e.target.value;
    const [w, h] = state.aspectRatio.split('/').map(Number);
    previewContainer.style.aspectRatio = state.aspectRatio;

    // Update canvas resolution based on aspect ratio
    if (w / h >= 16 / 9) {
        canvas.width = 1280;
        canvas.height = 1280 / (w / h);
    } else {
        canvas.height = 720;
        canvas.width = 720 * (w / h);
    }

    renderPreview();
};

viewModeSelect.onchange = (e) => {
    state.viewMode = e.target.value;
    renderPreview();
};

styleButtons.forEach(btn => {
    btn.onclick = () => {
        styleButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const style = btn.dataset.style;
        state.themeStyle = style;

        // Remove old style classes
        document.body.classList.remove('style-neon', 'style-gold', 'style-ghost', 'style-matrix');
        // Add new one
        document.body.classList.add('style-' + style);
    };
});

// --- Media Logic ---
function createMediaItem(file, existingAsset = null) {
    const asset = {
        id: "asset-" + Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type.startsWith("video") ? "video" : "image",
        url: URL.createObjectURL(file),
        duration: file.type.startsWith("video") ? 0 : 5,
        element: null
    };
    const isVideo = asset.type === 'video';

    const mediaItem = document.createElement('div');
    mediaItem.className = 'media-item';
    mediaItem.draggable = true;
    mediaItem.dataset.id = asset.id;
    mediaItem.style.position = 'relative';

if (isVideo) {

    mediaItem.style.border = '2px solid #00f3ff';

    mediaItem.style.boxShadow =
        '0 0 10px rgba(0,243,255,.8), ' +
        '0 0 25px rgba(0,243,255,.6), ' +
        '0 0 50px rgba(0,243,255,.4)';

    mediaItem.style.transition = 'all .3s ease';

    mediaItem.addEventListener('mouseenter', () => {

        mediaItem.style.transform = 'scale(1.05)';

        mediaItem.style.boxShadow =
            '0 0 20px rgba(0,243,255,1), ' +
            '0 0 40px rgba(0,243,255,.8), ' +
            '0 0 80px rgba(0,243,255,.5)';
    });

    mediaItem.addEventListener('mouseleave', () => {

        mediaItem.style.transform = 'scale(1)';

        mediaItem.style.boxShadow =
            '0 0 10px rgba(0,243,255,.8), ' +
            '0 0 25px rgba(0,243,255,.6), ' +
            '0 0 50px rgba(0,243,255,.4)';
    });

    const badge = document.createElement('div');
    badge.textContent = 'VIDEO';

    badge.style.position = 'absolute';
    badge.style.top = '5px';
    badge.style.right = '5px';
    badge.style.padding = '2px 6px';
    badge.style.borderRadius = '6px';
    badge.style.background = '#00f3ff';
    badge.style.color = '#000';
    badge.style.fontSize = '10px';
    badge.style.fontWeight = 'bold';

    mediaItem.appendChild(badge);
}

    if (isVideo) {
        const video = document.createElement('video');
        video.src = asset.url;
        video.muted = true;
        video.onloadedmetadata = () => { asset.duration = video.duration; asset.element = video; };
        mediaItem.appendChild(video);
    } else {
        const img = document.createElement('img');
        img.src = asset.url;
        img.onload = () => { asset.element = img; };
        mediaItem.appendChild(img);
    }

    mediaItem.addEventListener('dragstart', (e) => e.dataTransfer.setData('assetId', asset.id));
    mediaItem.addEventListener('dblclick', () => addAssetToTimeline(asset.id));

    mediaGrid.appendChild(mediaItem);
    state.mediaAssets.push(asset);
    emptyMsg.style.display = 'none';
}

importBtn.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*,image/*';
    input.multiple = true;
    input.onchange = (e) => Array.from(e.target.files).forEach(createMediaItem);
    input.click();
};

// --- Timeline & Rendering ---
function addAssetToTimeline(assetId, customClip = null, dropTime = null, targetTrackId = null) {
    const asset = state.mediaAssets.find(a => a.id === assetId);
    if (!asset && !customClip) return;

    const clip = customClip || {
        id: 'clip-' + Math.random().toString(36).substr(2, 9),
        assetId: assetId,
        type: asset.type,
        track: asset.type === 'audio' ? 'audio' : 'video',
        trackId: targetTrackId || (asset.type === 'audio' ? 'audio' : 'video-1'),
        startTime: dropTime !== null ? dropTime : state.duration,
        duration: asset.duration || 5,
        offset: 0,
        filters: { brightness: 100, contrast: 100, grayscale: 0, sepia: 0, blur: 0 },
        volume: 100,
        x: 0,
        y: 0,
        scale: 1,
        text: null // For Titles
    };

    state.timelineClips.push(clip);
    updateDuration();
    renderTimeline();
    renderPreview();
}

function updateDuration() {
    state.duration = state.timelineClips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
    updateTimestamp();
}

function renderRuler() {
    const ruler = document.getElementById('timeline-ruler');
    ruler.innerHTML = '';
    const duration = Math.max(state.duration + 10, 60);
    const step = state.zoomLevel < 50 ? 10 : (state.zoomLevel < 100 ? 5 : 1);

    for (let i = 0; i < duration; i += step) {
        const mark = document.createElement('div');
        mark.style.position = 'absolute';
        mark.style.left = (i * state.zoomLevel) + 'px';
        mark.style.fontSize = '10px';
        mark.style.color = 'var(--text-dim)';
        mark.style.borderLeft = '1px solid rgba(255,255,255,0.2)';
        mark.style.height = '100%';
        mark.style.paddingLeft = '2px';
        mark.innerText = i + 's';
        ruler.appendChild(mark);
    }
}

function renderTimeline() {
    renderRuler();
    videoTrack1.innerHTML = '';
    videoTrack2.innerHTML = '';
    audioTrack.innerHTML = '';

    state.timelineClips.forEach(clip => {
        const asset = state.mediaAssets.find(a => a.id === clip.assetId);
        const clipEl = document.createElement('div');
        clipEl.className = 'clip';
        clipEl.addEventListener('mouseenter', () => {

    clipEl.style.boxShadow =
        '0 0 15px rgba(0,243,255,1), ' +
        '0 0 35px rgba(0,243,255,.8), ' +
        '0 0 60px rgba(0,243,255,.5)';
});

clipEl.addEventListener('mouseleave', () => {

    clipEl.style.boxShadow =
        '0 0 10px rgba(0,243,255,.8), ' +
        '0 0 20px rgba(0,243,255,.6), ' +
        '0 0 40px rgba(0,243,255,.4)';
});
        if (state.selectedClipId === clip.id) clipEl.classList.add('active');
        clipEl.style.left = (clip.startTime * state.zoomLevel) + 'px';
        clipEl.style.width = (clip.duration * state.zoomLevel) + 'px';
        clipEl.innerHTML = `
            <div class="clip-handle clip-handle-left"></div>
            <div class="clip-title">${clip.text ? 'T: ' + clip.text : (asset ? asset.name : 'Clip')}${clip.transition ? ' [TR]' : ''}</div>
            <div class="clip-handle clip-handle-right"></div>
        `;

        clipEl.onclick = (e) => {
            e.stopPropagation();
            selectClip(clip.id);
            if (effectsPanel && effectsPanel.style.display === 'block') updateEffectsSliders();
        };

        // Handles & Dragging
        clipEl.onmousedown = (e) => {
            if (e.button !== 0) return;
            e.stopPropagation();

            const isLeftHandle = e.target.classList.contains('clip-handle-left');
            const isRightHandle = e.target.classList.contains('clip-handle-right');
            const startX = e.clientX;
            const startStart = clip.startTime;
            const startDuration = clip.duration;
            const startOffset = clip.offset;

            const move = (m) => {
                const diff = (m.clientX - startX) / state.zoomLevel;

                if (isLeftHandle) {
                    const newStart = Math.max(0, startStart + diff);
                    const actualDiff = newStart - startStart;
                    if (startDuration - actualDiff > 0.1) {
                        clip.startTime = newStart;
                        clip.offset = startOffset + actualDiff;
                        clip.duration = startDuration - actualDiff;
                    }
                } else if (isRightHandle) {
                    clip.duration = Math.max(0.1, startDuration + diff);
                } else {
                    clip.startTime = Math.max(0, startStart + diff);

                    // Track switching during drag
                    const rect = timeline.getBoundingClientRect();
                    const y = m.clientY - rect.top;
                    if (clip.track === 'video') {
                        if (y > 30 && y <= 100) clip.trackId = 'video-1';
                        else if (y > 100 && y <= 170) clip.trackId = 'video-2';
                    } else if (clip.track === 'audio') {
                        if (y > 170) clip.trackId = 'audio';
                    }
                }

                clipEl.style.left = (clip.startTime * state.zoomLevel) + 'px';
                clipEl.style.width = (clip.duration * state.zoomLevel) + 'px';
                updateDuration();
                renderPreview();
            };

            const up = () => {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
                renderTimeline();
            };

            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        };

        if (clip.trackId === 'audio') audioTrack.appendChild(clipEl);
        else if (clip.trackId === 'video-1') videoTrack1.appendChild(clipEl);
        else if (clip.trackId === 'video-2') videoTrack2.appendChild(clipEl);
        else videoTrack1.appendChild(clipEl); // Fallback
    });

    timeline.style.width = Math.max(window.innerWidth, (state.duration + 10) * state.zoomLevel) + 'px';
}
 function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {

    const words = text.split(' ');
    const lines = [];
    let line = '';

    for (let n = 0; n < words.length; n++) {

        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }

    lines.push(line);

    const startY =
        y -
        ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((l, i) => {
        ctx.fillText(
            l,
            x,
            startY + i * lineHeight
        );
    });
}
function renderPreview() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const activeClips = state.timelineClips
        .filter(c => c.track === 'video' && state.currentTime >= c.startTime && state.currentTime < (c.startTime + c.duration))
        .sort((a, b) => {
            const trackOrder = { 'video-1': 1, 'video-2': 2 };
            const orderA = trackOrder[a.trackId] || 1;
            const orderB = trackOrder[b.trackId] || 1;
            if (orderA !== orderB) return orderA - orderB;
            return a.startTime - b.startTime;
        });

    activeClips.forEach(clip => {
        const asset = state.mediaAssets.find(a => a.id === clip.assetId);

        let alpha = 1.0;
        const transitionDuration = parseFloat(state.transitionSpeed);
        if (state.currentTime < clip.startTime + transitionDuration) {
            alpha = (state.currentTime - clip.startTime) / transitionDuration;
        } else if (state.currentTime > (clip.startTime + clip.duration) - transitionDuration) {
            alpha = ((clip.startTime + clip.duration) - state.currentTime) / transitionDuration;
        }
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        if (asset && asset.element) {
            let filterString = `brightness(${clip.filters.brightness}%) contrast(${clip.filters.contrast}%) grayscale(${clip.filters.grayscale}%) sepia(${clip.filters.sepia}%) blur(${clip.filters.blur}px)`;
            if (alpha < 1.0) filterString += ` contrast(${state.transitionContrast}%)`;
            ctx.filter = filterString;

            const drawFrame = (element) => {
                let dx = 0, dy = 0, dw = canvas.width, dh = canvas.height;
                const cw = canvas.width, ch = canvas.height;
                const iw = element.videoWidth || element.width;
                const ih = element.videoHeight || element.height;
                const aspect = iw / ih;
                const canvasAspect = cw / ch;

                if (state.viewMode === 'fit') {
                    if (aspect > canvasAspect) {
                        dh = cw / aspect;
                        dy = (ch - dh) / 2;
                    } else {
                        dw = ch * aspect;
                        dx = (cw - dw) / 2;
                    }
                } else if (state.viewMode === 'fill') {
                    if (aspect > canvasAspect) {
                        dw = ch * aspect;
                        dx = (cw - dw) / 2;
                    } else {
                        dh = cw / aspect;
                        dy = (ch - dh) / 2;
                    }
                }

                ctx.save();
                ctx.translate(cw/2 + (clip.x || 0), ch/2 + (clip.y || 0));
                ctx.scale(clip.scale || 1, clip.scale || 1);
                ctx.translate(-cw/2, -ch/2);
                ctx.drawImage(element, dx, dy, dw, dh);
                ctx.restore();
            };

            if (asset.type === 'video') {
                const vid = asset.element;
                const time = (state.currentTime - clip.startTime) + clip.offset;
                if (Math.abs(vid.currentTime - time) > 0.1) vid.currentTime = time;
                drawFrame(vid);
            } else {
                drawFrame(asset.element);
            }
        }

        if (clip.text) {
            ctx.filter = 'none';
            const fontSize = parseInt(clip.fontSize) || 60;
            ctx.font = `${fontSize}px Orbitron`;
            ctx.fillStyle = clip.color || '#00f3ff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let textToDraw = clip.text;
            let drawAlpha = 1.0;
            let currentX = clip.x !== undefined ? clip.x : canvas.width/2;
            let currentY = clip.y !== undefined ? clip.y : canvas.height/2;
            let currentScale = clip.scale || 1.0;

            const elapsed = state.currentTime - clip.startTime;
            const animType = clip.animation || 'none';
            if(animType === 'bounce'){
    currentY += Math.sin(elapsed * 8) * 20;
}

if(animType === 'rotate'){
    ctx.rotate(Math.sin(elapsed * 2) * 0.15);
}

if(animType === 'glow'){
    ctx.shadowBlur =
        20 +
        Math.sin(elapsed * 5) * 15;
}

if(animType === 'wave'){
    currentY += Math.sin(elapsed * 6) * 10;
    currentX += Math.cos(elapsed * 6) * 10;
}

if(animType === 'float'){
    currentY -= elapsed * 15;
}

            if (animType === 'fade') {
                drawAlpha = Math.min(1, elapsed / 1);
            } else if (animType === 'slide') {
                const offset = Math.max(0, 1 - elapsed) * 100;
                currentY += offset;
            } else if (animType === 'typewriter') {
                const chars = Math.floor(elapsed * 35);
                textToDraw = clip.text.substring(0, chars);
            } else if (animType === 'zoom') {
                currentScale *= Math.min(1, elapsed / 1);
            }

            ctx.save();
            ctx.globalAlpha = drawAlpha * ctx.globalAlpha;
            ctx.translate(currentX, currentY);
            ctx.scale(currentScale, currentScale);
            ctx.translate(-currentX, -currentY);

            const textWidth = ctx.measureText(textToDraw).width;
            const padding = 20;

            if (clip.mode === 'speech' || clip.mode === 'thought') {
                ctx.strokeStyle = clip.color || '#00f3ff';
                ctx.lineWidth = 5;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

                if (clip.mode === 'speech') {
                    const bx = currentX - textWidth/2 - padding;
                    const by = currentY - fontSize/2 - padding;
                    const bw = textWidth + padding*2;
                    const bh = fontSize + padding*2;
                    drawRoundedRect(ctx, bx, by, bw, bh, 15);
                    ctx.fill();
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(currentX - 20, by + bh);
                    ctx.lineTo(currentX, by + bh + 30);
                    ctx.lineTo(currentX + 20, by + bh);
                    ctx.fill();
                    ctx.stroke();
                } else if (clip.mode === 'thought') {
                    drawCloud(ctx, currentX, currentY, textWidth + padding*2, fontSize + padding*2);
                }
            }

            ctx.shadowBlur = 15;
            ctx.shadowColor = clip.color || '#00f3ff';
            drawWrappedText(
    ctx,
    textToDraw,
    currentX,
    currentY,
    canvas.width * 0.8,
    fontSize * 1.3
);
            ctx.restore();
        }
    });

    ctx.globalAlpha = 1.0;
    ctx.filter = 'none';
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawCloud(ctx, x, y, width, height) {
    const r = height / 1.5;
    ctx.beginPath();
    ctx.arc(x - width/3, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + width/3, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - height/3, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + height/3, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(x - width/3, y - height/3, (width/3)*2, (height/3)*2);
    ctx.beginPath();
    ctx.arc(x - width/2, y + height/2 + 20, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - width/2 - 25, y + height/2 + 45, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

// --- Audio Sync ---
function syncAudio() {
    const activeAudioClips = state.timelineClips.filter(c => c.track === 'audio' && state.currentTime >= c.startTime && state.currentTime < (c.startTime + c.duration));

    state.timelineClips.filter(c => c.track === 'audio').forEach(clip => {
        const asset = state.mediaAssets.find(a => a.id === clip.assetId);
        if (asset && asset.element) {
            const audio = asset.element;
            if (activeAudioClips.includes(clip) && state.isPlaying) {
                const time = (state.currentTime - clip.startTime) + clip.offset;
                if (Math.abs(audio.currentTime - time) > 0.1) audio.currentTime = time;
                audio.volume = ((clip.volume || 100) / 100) * (state.masterVolume / 100);
                if (audio.paused) audio.play();
            } else {
                audio.pause();
            }
        }
    });
    updateVisualizer();
}

function initVisualizer() {
    const container = document.getElementById('visualizer-mini');
    if(!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 20; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        bar.style.height = '2px';
        container.appendChild(bar);
    }
}

function updateVisualizer() {
    const bars = document.querySelectorAll('.visualizer-bar');
    const isActive = state.isPlaying && state.timelineClips.some(c => c.track === 'audio' && state.currentTime >= c.startTime && state.currentTime < (c.startTime + c.duration));

    bars.forEach(bar => {
        if (isActive) {
            const height = Math.random() * 100;
            bar.style.height = height + '%';
        } else {
            bar.style.height = '2px';
        }
    });
}

// --- Titles Module ---
document.getElementById('add-title-btn').onclick = () => {
    const text = document.getElementById('title-text').value || "NEW TITLE";
    // Longer text = longer duration
const autoDuration = Math.max(
    3,
    Math.ceil(text.length / 8)
);
    const size = document.getElementById('title-size').value;
    const color = document.getElementById('title-color').value;
    const mode = document.getElementById('title-mode').value;
    const x = parseInt(document.getElementById('title-x').value) || 640;
    const y = parseInt(document.getElementById('title-y').value) || 360;
    const anim = document.getElementById('title-animation').value;

    const clip = {
        id: 'clip-' + Math.random().toString(36).substr(2, 9),
        assetId: null,
        type: 'text',
        track: 'video',
        trackId: 'video-2',
        startTime: state.currentTime,
        duration: autoDuration,
        offset: 0,
        filters: { brightness: 100, contrast: 100, grayscale: 0, sepia: 0, blur: 0 },
        volume: 100,
        text: text,
        fontSize: size,
        color: color,
        mode: mode,
        animation: anim,
        x: x,
        y: y,
        scale: 1
    };
    state.timelineClips.push(clip);
    updateDuration();
    renderTimeline();
    renderPreview();
    selectClip(clip.id);
};

// --- Playback Loop ---
let lastTime = 0;
function playback(timestamp) {
    if (!state.isPlaying) {
        lastTime = 0;
        syncAudio();
        return;
    }

    if (!lastTime) lastTime = timestamp;
    const delta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    state.currentTime += delta;
    if (state.currentTime >= state.duration) {
        state.currentTime = state.duration;
        pause();
    }
    updateTimestamp();
    renderPreview();
    syncAudio();
    requestAnimationFrame(playback);
}

function play() { state.isPlaying = true; playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; requestAnimationFrame(playback); }
function pause() { state.isPlaying = false; playPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; syncAudio(); }

playPauseBtn.onclick = () => state.isPlaying ? pause() : play();

document.getElementById('prev-frame').onclick = () => {
    pause();
    state.currentTime = Math.max(0, state.currentTime - (1/30));
    updateTimestamp();
    renderPreview();
};

document.getElementById('next-frame').onclick = () => {
    pause();
    state.currentTime = state.currentTime + (1/30);
    updateTimestamp();
    renderPreview();
};

function updateTimestamp() {
    const pad = (n) => Math.floor(n).toString().padStart(2, '0');
    const f = (s) => `${pad(s/3600)}:${pad((s%3600)/60)}:${pad(s%60)}:${pad((s%1)*60)}`;
    timestampDisplay.innerText = `${f(state.currentTime)} / ${f(state.duration)}`;
    playhead.style.left = (state.currentTime * state.zoomLevel) + 'px';
}

// --- Seek & Scrubbing ---
function seekToX(x) {
    state.currentTime = Math.max(0, x / state.zoomLevel);
    updateTimestamp();
    renderPreview();
    syncAudio();
}

timeline.ondragover = (e) => {
    e.preventDefault();
};

timeline.ondrop = (e) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('assetId');
    if (!assetId) return;

    const rect = timeline.getBoundingClientRect();
    const x = e.clientX - rect.left + timeline.parentElement.scrollLeft;
    const dropTime = Math.max(0, x / state.zoomLevel);

    const y = e.clientY - rect.top;
    let targetTrackId = 'video-1';
    if (y > 30 && y <= 100) targetTrackId = 'video-1';
    else if (y > 100 && y <= 170) targetTrackId = 'video-2';
    else if (y > 170) targetTrackId = 'audio';

    addAssetToTimeline(assetId, null, dropTime, targetTrackId);
};

timeline.onmousedown = (e) => {
    if (e.target.classList.contains('clip') || e.target.classList.contains('clip-handle')) return;
    const rect = timeline.getBoundingClientRect();

    const scrub = (moveEvent) => {
        const x = moveEvent.clientX - rect.left + timeline.parentElement.scrollLeft;
        seekToX(x);
    };

    const stopScrub = () => {
        document.removeEventListener('mousemove', scrub);
        document.removeEventListener('mouseup', stopScrub);
    };

    const x = e.clientX - rect.left + timeline.parentElement.scrollLeft;
    seekToX(x);

    document.addEventListener('mousemove', scrub);
    document.addEventListener('mouseup', stopScrub);
};

// --- Effects Panel ---
let effectsPanel = null;
const effectsLibrary = [
    { id: 'vintage', name: 'Vintage Neural', icon: 'fa-history', type: 'filter', filters: { sepia: 80, contrast: 120 } },
    { id: 'cyber', name: 'Cyber Neon', icon: 'fa-bolt', type: 'filter', filters: { brightness: 150, contrast: 150, blur: 2 } },
    { id: 'noir', name: 'Noir Protocol', icon: 'fa-moon', type: 'filter', filters: { grayscale: 100, contrast: 140 } }
];

for(let i=1; i<=100; i++) {
    effectsLibrary.push({
        id: `fx-${i}`,
        name: `Neural Filter ${i}`,
        icon: 'fa-magic',
        type: 'filter',
        filters: { brightness: 100 + (Math.random()*40-20), contrast: 100 + (Math.random()*40-20) }
    });
}

function showEffects() {
    if (!effectsPanel) {
        effectsPanel = document.createElement('div');
        effectsPanel.className = 'library-container glass';
        effectsPanel.innerHTML = `
            <h3>Neural FX</h3>
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="search-effects" placeholder="Search neural FX...">
            </div>
            <div class="effects-grid" id="effects-grid"></div>
            <hr style="margin: 20px 0; opacity: 0.1;">
            <div id="effect-controls">
                <h3>Manual Overrides</h3>
                ${['brightness', 'contrast', 'grayscale', 'sepia', 'blur'].map(eff => `
                    <div class="effect-control">
                        <label>${eff.toUpperCase()}</label>
                        <input type="range" id="eff-${eff}" min="0" max="${eff === 'blur' ? 50 : 200}" value="100">
                    </div>
                `).join('')}
            <div class="effect-control">
                <label>VOLUME</label>
                <input type="range" id="eff-volume" min="0" max="100" value="100">
            </div>
            </div>
        `;
        document.querySelector('.left-panel').appendChild(effectsPanel);

        ['brightness', 'contrast', 'grayscale', 'sepia', 'blur'].forEach(eff => {
            document.getElementById(`eff-${eff}`).oninput = (e) => {
                const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
                if (clip) { clip.filters[eff] = e.target.value; renderPreview(); }
            };
        });

        document.getElementById('title-text').oninput = (e) => {
            const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
            if (clip && clip.type === 'text') { clip.text = e.target.value; renderPreview(); renderTimeline(); }
        };
        document.getElementById('title-size').oninput = (e) => {
            const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
            if (clip && clip.type === 'text') { clip.fontSize = e.target.value; renderPreview(); }
        };
        document.getElementById('title-color').oninput = (e) => {
            const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
            if (clip && clip.type === 'text') { clip.color = e.target.value; renderPreview(); }
        };
        document.getElementById('title-x').oninput = (e) => {
            const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
            if (clip && clip.type === 'text') { clip.x = parseInt(e.target.value) || 0; renderPreview(); }
        };
        document.getElementById('title-y').oninput = (e) => {
            const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
            if (clip && clip.type === 'text') { clip.y = parseInt(e.target.value) || 0; renderPreview(); }
        };
        document.getElementById('title-mode').onchange = (e) => {
            const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
            if (clip && clip.type === 'text') { clip.mode = e.target.value; renderPreview(); }
        };
        document.getElementById('title-animation').onchange = (e) => {
            const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
            if (clip && clip.type === 'text') { clip.animation = e.target.value; renderPreview(); }
        };
        document.getElementById('eff-volume').oninput = (e) => {
            const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
            if (clip) { clip.volume = e.target.value; syncAudio(); }
        };

        document.getElementById('search-effects').oninput = (e) => {
            renderEffectsList(e.target.value);
        };
    }
    effectsPanel.style.display = 'block';
    renderEffectsList();
    updateEffectsSliders();
}

function renderEffectsList(query = '') {
    const grid = document.getElementById('effects-grid');
    if(!grid) return;
    grid.innerHTML = '';
    const filtered = effectsLibrary.filter(fx => fx.name.toLowerCase().includes(query.toLowerCase()));

    filtered.forEach(fx => {
        const card = document.createElement('div');
        card.className = 'effect-card';
        card.innerHTML = `
            <div class="icon"><i class="fas ${fx.icon}"></i></div>
            <div class="name">${fx.name}</div>
        `;
        card.onclick = () => {
            const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
            if (!clip) return;

            if (fx.type === 'filter') {
                Object.assign(clip.filters, fx.filters);
                updateEffectsSliders();
            }
            renderPreview();
        };
        grid.appendChild(card);
    });
}

function updateEffectsSliders() {
    const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
    if (clip && effectsPanel) {
        ['brightness', 'contrast', 'grayscale', 'sepia', 'blur'].forEach(eff => {
            const el = document.getElementById(`eff-${eff}`);
            if(el) el.value = clip.filters[eff];
        });
        const volEl = document.getElementById('eff-volume');
        if(volEl) volEl.value = clip.volume || 100;
    }
}

function updateTitleInputs(clip) {
    if (!clip || clip.type !== 'text') return;
    document.getElementById('title-text').value = clip.text || '';
    document.getElementById('title-size').value = clip.fontSize || 60;
    document.getElementById('title-color').value = clip.color || '#00f3ff';
    document.getElementById('title-x').value = clip.x || 0;
    document.getElementById('title-y').value = clip.y || 0;
    document.getElementById('title-mode').value = clip.mode || 'plain';
    document.getElementById('title-animation').value = clip.animation || 'none';
}

// --- Transitions Module ---
const transitionsLibrary = [
    { id: 'trans-1', name: 'Neural Fade', icon: 'fa-adjust' },
    { id: 'trans-2', name: 'Quantum Leap', icon: 'fa-bolt' },
    { id: 'trans-3', name: 'Plasma Dissolve', icon: 'fa-tint' },
    { id: 'trans-4', name: 'Static Glitch', icon: 'fa-microchip' },
    { id: 'trans-5', name: 'Binary Shift', icon: 'fa-code' },
    { id: 'trans-6', name: 'Warp Drive', icon: 'fa-space-shuttle' },
    { id: 'trans-7', name: 'Neon Blur', icon: 'fa-eye' },
    { id: 'trans-8', name: 'Cyber Wipe', icon: 'fa-columns' }
];

for(let i=9; i<=100; i++) {
    transitionsLibrary.push({
        id: `trans-${i}`,
        name: `Neural Transition ${i}`,
        icon: 'fa-random'
    });
}

function showTransitions() {
    renderTransitionsList();
}

function renderTransitionsList(query = '') {
    const grid = document.getElementById('transitions-grid');
    if(!grid) return;
    grid.innerHTML = '';
    const filtered = transitionsLibrary.filter(t => t.name.toLowerCase().includes(query.toLowerCase()));

    filtered.forEach(t => {
        const card = document.createElement('div');
        card.className = 'effect-card';
        card.innerHTML = `
            <div class="icon"><i class="fas ${t.icon}"></i></div>
            <div class="name">${t.name}</div>
        `;
        card.onclick = () => {
            const clip = state.timelineClips.find(c => c.id === state.selectedClipId);
            if (clip && clip.track === 'video') {
                clip.transition = t.id;
                renderTimeline();
            }
        };
        grid.appendChild(card);
    });
}

document.getElementById('search-transitions').oninput = (e) => {
    renderTransitionsList(e.target.value);
};

document.getElementById('trans-speed').oninput = (e) => {
    state.transitionSpeed = e.target.value;
    renderPreview();
};

document.getElementById('trans-contrast').oninput = (e) => {
    state.transitionContrast = e.target.value;
    renderPreview();
};

// --- Search Bars ---
document.getElementById('search-media').oninput = (e) => {
    const query = e.target.value.toLowerCase();
    const items = mediaGrid.querySelectorAll('.media-item');
    items.forEach(item => {
        const id = item.dataset.id;
        const asset = state.mediaAssets.find(a => a.id === id);
        if(asset) item.style.display = asset.name.toLowerCase().includes(query) ? 'block' : 'none';
    });
};

document.getElementById('search-audio').oninput = (e) => {
    const query = e.target.value.toLowerCase();
    const list = document.getElementById('audio-list');
    const items = list.querySelectorAll('.media-item');
    items.forEach(item => {
        const name = item.querySelector('div').innerText.toLowerCase();
        item.style.display = name.includes(query) ? 'block' : 'none';
    });
};

// --- Mock 100+ Audio Tracks with Genres ---
const genres = ["Cyberpunk", "Synthwave", "Lofi", "Cinematic"];
const audioStreams = [
    { name: "Glitch Matrix", genre: "Cyberpunk", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { name: "Neural Override", genre: "Cyberpunk", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { name: "Neon Drifter", genre: "Synthwave", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { name: "Plasma Sunset", genre: "Synthwave", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { name: "Static Chill", genre: "Lofi", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
    { name: "Bonsai Logic", genre: "Lofi", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
    { name: "Aeon Rises", genre: "Cinematic", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
    { name: "VOID Symphony", genre: "Cinematic", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" }
];

for(let i=1; i<=100; i++) {
    audioStreams.push({
        name: `Neural Track ${i}`,
        genre: genres[Math.floor(Math.random() * genres.length)]
    });
}

let currentAudioGenre = 'all';
function renderAudio(query = '', genre = 'all') {
    const list = document.getElementById('audio-list');
    if (!list) return;
    list.innerHTML = '';
    state.mediaAssets.filter(a => a.type === 'audio').forEach(asset => {
        const matchesQuery = asset.name.toLowerCase().includes(query.toLowerCase());
        const matchesGenre = genre === 'all' || asset.genre === genre;

        if (matchesQuery && matchesGenre) {
            const div = document.createElement('div');
            div.className = 'media-item';
            div.innerHTML = `<i class="fas fa-music" style="font-size: 2rem; color: var(--accent);"></i><div style="font-size: 10px; padding: 5px;">${asset.name}</div><div style="font-size: 8px; color: var(--text-dim);">${asset.genre}</div>`;

            div.onclick = () => {
                state.mediaAssets.forEach(a => { if (a.type === 'audio' && a.element) a.element.pause(); });
                if (asset.element) { asset.element.currentTime = 0; asset.element.play(); }
            };

            div.ondblclick = (e) => {
                e.stopPropagation();
                if (asset.element) asset.element.pause();
                addAssetToTimeline(asset.id);
            };
            list.appendChild(div);
        }
    });
}

function initAudioLibrary() {
    const genreTabs = document.querySelectorAll('.genre-tab');
    audioStreams.forEach(stream => {
        const asset = {
            id: 'mock-audio-' + Math.random().toString(36).substr(2, 9),
            name: stream.name,
            genre: stream.genre,
            type: 'audio',
            url: stream.url || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            duration: 120,
            element: new Audio()
        };
        asset.element.src = asset.url;
        asset.element.onloadedmetadata = () => asset.duration = asset.element.duration;
        state.mediaAssets.push(asset);
    });
    genreTabs.forEach(tab => {
        tab.onclick = () => {
            genreTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentAudioGenre = tab.dataset.genre;
            renderAudio(document.getElementById('search-audio').value, currentAudioGenre);
        };
    });
    document.getElementById('search-audio').oninput = (e) => { renderAudio(e.target.value, currentAudioGenre); };
    renderAudio();
}
initAudioLibrary();
initVisualizer();

document.getElementById('master-volume').oninput = (e) => {
    state.masterVolume = e.target.value;
    syncAudio();
};

document.getElementById('import-audio-btn').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        asset.element.src = asset.url;
        asset.element.onloadedmetadata = () => {
            asset.duration = asset.element.duration;
            state.mediaAssets.push(asset);
            renderAudio();
        };
    };
    input.click();
};

// --- Tool Buttons ---
document.getElementById('split-btn').onclick = () => {
    let clip = state.timelineClips.find(c => c.id === state.selectedClipId && state.currentTime > c.startTime && state.currentTime < (c.startTime + c.duration));
    if (!clip) clip = state.timelineClips.find(c => state.currentTime > c.startTime && state.currentTime < (c.startTime + c.duration));
    if (clip) {
        const splitPoint = state.currentTime - clip.startTime;
        const newClip = { ...JSON.parse(JSON.stringify(clip)), id: 'clip-' + Math.random().toString(36).substr(2, 9), startTime: state.currentTime, duration: clip.duration - splitPoint, offset: (clip.offset || 0) + splitPoint };
        clip.duration = splitPoint;
        state.timelineClips.push(newClip);
        renderTimeline();
    }
};

document.getElementById('delete-btn').onclick = () => {
    if (state.selectedClipId) {
        state.timelineClips = state.timelineClips.filter(c => c.id !== state.selectedClipId);
        selectClip(null);
        updateDuration(); renderTimeline(); renderPreview(); syncAudio();
    }
};

zoomInput.oninput = () => { state.zoomLevel = zoomInput.value * 100; renderTimeline(); updateTimestamp(); };
document.getElementById('zoom-in-btn').onclick = () => { zoomInput.value = parseFloat(zoomInput.value) + 0.1; zoomInput.oninput(); };
document.getElementById('zoom-out-btn').onclick = () => { zoomInput.value = parseFloat(zoomInput.value) - 0.1; zoomInput.oninput(); };

// --- Help Modal ---
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelp = document.getElementById('close-help');
helpBtn.onclick = () => helpModal.style.display = 'flex';
closeHelp.onclick = () => helpModal.style.display = 'none';
window.onclick = (e) => { if (e.target === helpModal) helpModal.style.display = 'none'; };

// --- Export ---
document.getElementById('export-btn').onclick = () => {
    const originalTime = state.currentTime;
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'futuristic-filmora-export.webm'; a.click();
        state.currentTime = originalTime; renderPreview();
    };
    state.currentTime = 0;
    recorder.start();
    const frame = () => {
        if (state.currentTime >= state.duration) { recorder.stop(); return; }
        renderPreview(); state.currentTime += 1/30; requestAnimationFrame(frame);
    };
    frame();
};

console.log("WonderClone Futuristic Loaded");
requestAnimationFrame(playback);


// --- Real AI Agent Implementation ---
const OPENAI_API_KEY = 'sk_7UIiW9Ejo61nDlI4zHFYLlLBxgFijoKU';

var AIAgent = {
    chatHistory: document.getElementById('ai-chat-history'),
    input: document.getElementById('ai-command-input'),
    panel: document.getElementById('ai-panel'),
    trigger: document.getElementById('ai-trigger'),

    init() {
        if (!this.trigger) return;
        this.trigger.onclick = () => this.togglePanel();
        const closeBtn = document.getElementById('close-ai');
        if (closeBtn) closeBtn.onclick = () => this.togglePanel();
        const sendBtn = document.getElementById('send-ai-btn');
        if (sendBtn) sendBtn.onclick = () => this.handleInput();
        if (this.input) this.input.onkeypress = (e) => { if (e.key === 'Enter') this.handleInput(); };
    },

    togglePanel() {
        const isHidden = this.panel.style.display === 'none';
        this.panel.style.display = isHidden ? 'flex' : 'none';
        if (isHidden && this.input) this.input.focus();
    },

    addMessage(text, type) {
        const msg = document.createElement('div');
        msg.className = `ai-msg ${type}`;
        msg.innerText = text;
        this.chatHistory.appendChild(msg);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    },

    async handleInput() {
        const cmd = this.input.value.trim();
        if (!cmd) return;
        this.addMessage(cmd, 'user');
        this.input.value = '';
        await this.processCommand(cmd);
    },

    async processCommand(userPrompt) {
        this.addMessage("Neural AI is thinking...", 'bot');

        try {
            const systemPrompt = `You are an AI video editing expert. You control a web-based video editor.
            The current state has mediaAssets and timelineClips.
            Available assets: ${JSON.stringify(state.mediaAssets.map(a => ({id: a.id, name: a.name, type: a.type}))) }

            Return a JSON array of actions to execute. Available actions:
            - {"action": "addClip", "assetId": "id", "startTime": seconds, "trackId": "video-1"|"video-2"|"audio"}
            - {"action": "setText", "text": "string", "startTime": seconds, "duration": seconds}
            - {"action": "split", "time": seconds}
            - {"action": "setFilter", "clipId": "id", "filter": "brightness"|"contrast"|"blur", "value": number}
            - {"action": "setAspectRatio", "ratio": "16/9"|"9/16"|"1/1"}

            Only return the JSON array, no other text.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ]
                })
            });

            const data = await response.json();
            const content = data.choices[0].message.content;
            const actions = JSON.parse(content);

            this.executeActions(actions);
            this.addMessage("Neural transformations applied successfully.", 'bot');
        } catch (error) {
            console.error("AI Error:", error);
            this.addMessage("Neural link disrupted. Attempting fallback...", 'bot');
            // Fallback to keyword-based if API fails or returns non-JSON
            this.fallbackProcess(userPrompt.toLowerCase());
        }
    },

    executeActions(actions) {
        actions.forEach(act => {
            switch(act.action) {
                case 'addClip':
                    addAssetToTimeline(act.assetId, null, act.startTime, act.trackId);
                    break;
                case 'setText':
                    this.mockGenerateCaptions(act.text, act.startTime, act.duration);
                    break;
                case 'setAspectRatio':
                    state.aspectRatio = act.ratio;
                    if (aspectRatioSelect) aspectRatioSelect.value = act.ratio;
                    // Trigger resize logic
                    const [w, h] = act.ratio.split('/').map(Number);
                    if (previewContainer) previewContainer.style.aspectRatio = act.ratio;
                    if (w / h >= 16 / 9) {
                        canvas.width = 1280;
                        canvas.height = 1280 / (w / h);
                    } else {
                        canvas.height = 720;
                        canvas.width = 720 * (w / h);
                    }
                    renderPreview();
                    break;
                case 'setFilter':
                    const clip = state.timelineClips.find(c => c.id === act.clipId) || state.timelineClips[0];
                    if (clip && clip.filters) {
                        clip.filters[act.filter] = act.value;
                        renderPreview();
                    }
                    break;
            }
        });
    },

    mockGenerateCaptions(text, startTime, duration) {
        const clip = {
            id: 'clip-' + Math.random().toString(36).substr(2, 9),
            assetId: null,
            type: 'text',
            track: 'video',
            trackId: 'video-2',
            startTime: startTime || state.currentTime,
            duration: duration || 3,
            offset: 0,
            filters: { brightness: 100, contrast: 100, grayscale: 0, sepia: 0, blur: 0 },
            volume: 100,
            text: text,
            fontSize: 40,
            color: '#ffffff',
            mode: 'plain',
            animation: 'fade',
            x: 640,
            y: 600,
            scale: 1
        };
        state.timelineClips.push(clip);
        updateDuration();
        renderTimeline();
        renderPreview();
    },

    fallbackProcess(cmd) {
        if (cmd.includes('cut') || cmd.includes('filler')) {
            // ... existing fallback logic
        }
    }
};

AIAgent.init();

// Adobe Reader Text Overlay Logic
if (adobeTextEditor) {
    adobeTextEditor.oninput = (e) => {
        let clip = state.timelineClips.find(c => c.id === state.selectedClipId);
        if (!clip || clip.type !== 'text') {
            clip = state.timelineClips.find(c => c.type === 'text' && state.currentTime >= c.startTime && state.currentTime < (c.startTime + c.duration));
            if (clip) selectClip(clip.id);
            else {
                AIAgent.mockGenerateCaptions("New Title", state.currentTime, 3);
                clip = state.timelineClips[state.timelineClips.length - 1];
                selectClip(clip.id);
            }
        }
        if (clip && clip.type === 'text') {
            clip.text = e.target.value;
            renderPreview();
            renderTimeline();
        }
    };
}

// Gap Double Click
[videoTrack1, videoTrack2, audioTrack].forEach(track => {
    if (!track) return;
    track.ondblclick = (e) => {
        if (e.target !== track) return;
        const rect = track.getBoundingClientRect();
        const x = e.clientX - rect.left + timeline.parentElement.scrollLeft;
        const time = x / state.zoomLevel;
        const isGap = !state.timelineClips.some(c => c.trackId === track.id && time >= c.startTime && time < (c.startTime + c.duration));
        if (isGap && state.mediaAssets.length > 0) {
            const asset = state.mediaAssets[Math.floor(Math.random() * state.mediaAssets.length)];
            addAssetToTimeline(asset.id, null, time, track.id);
            AIAgent.addMessage("Gap detected. AI generated next scene.", 'bot');
        }
    };
});

AIAgent.generatePlaceholderAsset = function(description) {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
    gradient.addColorStop(0, '#' + Math.floor(Math.random()*16777215).toString(16));
    gradient.addColorStop(1, '#' + Math.floor(Math.random()*16777215).toString(16));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#fff';
    ctx.font = '50px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText("AI GENERATED: " + description, 640, 360);

    const asset = {
        id: 'ai-gen-' + Math.random().toString(36).substr(2, 9),
        name: description,
        type: 'image',
        url: canvas.toDataURL(),
        duration: 5,
        element: new Image()
    };
    asset.element.src = asset.url;
    state.mediaAssets.push(asset);
    createMediaItem({name: asset.name, type: 'image/png'}, asset);
    return asset.id;
};

// Update AIAgent.executeActions to handle generation
const originalExecute = AIAgent.executeActions;
AIAgent.executeActions = function(actions) {
    actions.forEach(act => {
        if (act.action === 'generateAsset') {
            const assetId = this.generatePlaceholderAsset(act.description);
            addAssetToTimeline(assetId, null, act.startTime || state.currentTime, act.trackId || 'video-1');
        }
    });
    originalExecute.call(this, actions);
};
