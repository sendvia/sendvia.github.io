// ==================== PAGE LOADER ====================

// Hide loader when page is fully loaded
window.addEventListener('load', () => {
    const loader = document.getElementById('pageLoader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('loaded');
            setTimeout(() => {
                loader.remove();
            }, 500);
        }, 300);
    }
});

// Fallback: Hide loader after 5 seconds
setTimeout(() => {
    const loader = document.getElementById('pageLoader');
    if (loader && !loader.classList.contains('loaded')) {
        loader.classList.add('loaded');
        setTimeout(() => {
            loader.remove();
        }, 500);
    }
}, 5000);

import { getDatabase, ref, set, get, remove, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

// ------------------- Firebase Setup -------------------
const firebaseConfig = {
    apiKey: "AIzaSyDm6YJ19Pnh718AjjIN32KxltRo6qpgqtM",
    authDomain: "sendly-83909.firebaseapp.com",
    databaseURL: "https://sendly-83909-default-rtdb.firebaseio.com",
    projectId: "sendly-83909",
    storageBucket: "sendly-83909.firebasestorage.app",
    messagingSenderId: "1075199067786",
    appId: "1:1075199067786:web:55163b960bd5c26f6d4f73"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ------------------- DOM Elements -------------------
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const shareCode = document.getElementById('shareCode');
const copyBtn = document.getElementById('copyBtn');
const status = document.getElementById('status');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const connectionStatus = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');
const stats = document.getElementById('stats');
const progressPercent = document.getElementById('progressPercent');
const transferSpeed = document.getElementById('transferSpeed');
const timeRemaining = document.getElementById('timeRemaining');
const inputSection = document.getElementById('inputSection');
const codeInput = document.getElementById('codeInput');
const connectBtn = document.getElementById('connectBtn');
const orDivider = document.getElementById('orDivider');
const qrSection = document.getElementById('qrSection');
const qrCodeContainer = document.getElementById('qrCodeContainer');

// ------------------- URL Code Handling -------------------
const navType = performance.getEntriesByType("navigation")[0]?.type;
const urlParams = new URLSearchParams(window.location.search);
const urlCode = urlParams.get('code');

if (navType === "reload" && window.location.search) {
    window.history.replaceState({}, '', window.location.pathname);
} else if (urlCode && urlCode.length === 6) {
    codeInput.value = urlCode.toUpperCase();
    setTimeout(() => connectBtn.click(), 500);
}

let selectedFile = null;
let fileMetadata = null;
let currentReceivedFile = null;
let peerConnection = null;
let dataChannel = null;
let transferCode = null;
let receivedSize = 0;
let currentFileIndex = 0;
let startTime = 0;
let lastUpdate = 0;
let bytesAtLastUpdate = 0;
let totalSize = 0;
let receivedChunks = [];
let receivedFiles = [];
let selectedFiles = [];
const CHUNK_SIZE = 262144; // 256KB chunks
const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' }
    ]
};
let expirationTimer = null;
let expirationTime = null;
const EXPIRATION_DURATION = 15 * 60 * 1000;

// ------------------- Utility Functions -------------------

function formatCountdown(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

function startExpirationCountdown() {
    expirationTime = Date.now() + EXPIRATION_DURATION;
    
    let countdownEl = document.getElementById('expirationCountdown');
    if (!countdownEl) {
        countdownEl = document.createElement('div');
        countdownEl.id = 'expirationCountdown';
        countdownEl.style.cssText = `
            padding: 12px;
            margin: 10px 0;
            border-radius: 8px;
            text-align: center;
            font-size: 14px;
            transition: all 0.3s ease;
        `;
        
        const codeLabel = document.querySelector('.code-label');
        if (codeLabel) {
            codeLabel.parentNode.insertBefore(countdownEl, codeLabel.nextSibling);
        }
    }
    
    expirationTimer = setInterval(() => {
        const remaining = expirationTime - Date.now();
        
        if (remaining <= 0) {
            clearInterval(expirationTimer);
            handleCodeExpiration();
            return;
        }
        
        const timeStr = formatCountdown(remaining);
        
        if (remaining < 2 * 60 * 1000) {
            countdownEl.style.background = '#ffebee';
            countdownEl.style.borderColor = '#ef5350';
            countdownEl.style.color = '#c62828';
            countdownEl.innerHTML = `⚠️ Code expires in <strong>${timeStr}</strong>`;
        } else if (remaining < 5 * 60 * 1000) {
            countdownEl.style.background = '#fff3cd';
            countdownEl.style.borderColor = '#ffc107';
            countdownEl.style.color = '#856404';
            countdownEl.innerHTML = `⏱️ Code expires in <strong>${timeStr}</strong>`;
        } else {
            countdownEl.style.background = '#e3f2fd';
            countdownEl.style.borderColor = '#90caf9';
            countdownEl.style.color = '#1976d2';
            countdownEl.innerHTML = `⏱️ Code expires in <strong>${timeStr}</strong>`;
        }
    }, 1000);
}

async function handleCodeExpiration() {
    const countdownEl = document.getElementById('expirationCountdown');
    if (countdownEl) countdownEl.remove();
    
    if (transferCode) {
        try {
            await remove(ref(db, `offers/${transferCode}`));
            await remove(ref(db, `answers/${transferCode}`));
        } catch (e) {
            console.error('Cleanup failed:', e);
        }
    }
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }
    
    showStatus('❌ Transfer code expired. Please create a new transfer.', 'error');
    statusText.textContent = 'Code expired';
    
    setTimeout(() => {
        location.reload();
    }, 3000);
}

async function checkCodeExpiration(code) {
    const offerSnapshot = await get(ref(db, `offers/${code}`));
    if (!offerSnapshot.exists()) return false;
    
    const offerData = offerSnapshot.val();
    const age = Date.now() - offerData.timestamp;
    
    if (age > EXPIRATION_DURATION) {
        try {
            await remove(ref(db, `offers/${code}`));
            await remove(ref(db, `answers/${code}`));
        } catch (e) {
            console.error('Cleanup failed:', e);
        }
        return false;
    }
    
    return true;
}

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSecond) {
    return formatFileSize(bytesPerSecond) + '/s';
}

function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '--:--';
    if (seconds < 60) return Math.floor(seconds) + 's';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showStatus(message, type='') {
    status.textContent = message;
    status.className = `status active ${type}`;
}

function updateConnectionStatus(connected) {
    connectionStatus.classList.toggle('connected', connected);
    statusText.textContent = connected ? '✓ Connected!' : '';
}

function updateProgress(current, total) {
    const now = Date.now();
    const percent = total ? (current / total) * 100 : 0;
    progressFill.style.width = percent + '%';
    progressPercent.textContent = percent.toFixed(1) + '%';

    if (now - lastUpdate > 500) {
        const timeDiff = (now - lastUpdate) / 1000;
        const bytesDiff = current - bytesAtLastUpdate;

        if (timeDiff > 0 && bytesDiff > 0) {
            const speed = bytesDiff / timeDiff;
            transferSpeed.textContent = formatSpeed(speed);

            const remaining = total - current;
            timeRemaining.textContent = remaining > 0 ? formatTime(remaining / speed) : '0s';
        } else if (current < total) {
            transferSpeed.textContent = '—';
            timeRemaining.textContent = '--:--';
        }
        lastUpdate = now;
        bytesAtLastUpdate = current;
    }
}

function showFileInfo(file) {
    if (selectedFiles.length > 1) {
        const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
        fileName.textContent = `${selectedFiles.length} files selected`;
        fileSize.innerHTML = `Total size: ${formatFileSize(totalSize)}<br><span style="font-size: 12px; color: #999;">Click to view all files</span>`;
        fileSize.style.cursor = 'pointer';
        fileSize.style.whiteSpace = 'normal';
        
        fileSize.onclick = () => {
            const existingList = document.getElementById('fileListExpanded');
            if (existingList) {
                existingList.remove();
                fileSize.innerHTML = `Total size: ${formatFileSize(totalSize)}<br><span style="font-size: 12px; color: #999;">Click to view all files</span>`;
            } else {
                const fileList = selectedFiles.map((f, i) => 
                    `<div style="padding: 4px 0; font-size: 13px; color: #666; border-bottom: 1px solid #eee;">
                        <span style="font-weight: 600; color: #333;">${i + 1}.</span> ${f.name} 
                        <span style="color: #999;">(${formatFileSize(f.size)})</span>
                    </div>`
                ).join('');
                fileSize.innerHTML = `Total size: ${formatFileSize(totalSize)}<br><span style="font-size: 12px; color: #999;">Click to hide</span>
                    <div id="fileListExpanded" style="margin-top: 10px; max-height: 200px; overflow-y: auto;">${fileList}</div>`;
            }
        };
    } else {
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileSize.style.whiteSpace = 'normal';
        fileSize.style.cursor = 'default';
        fileSize.onclick = null;
    }
    fileInfo.classList.add('active');
}

function saveReceivedFile(fileMeta, chunks) {
    const blob = new Blob(chunks, { type: fileMeta.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileMeta.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus(`✓ Downloaded ${fileMeta.name}`, 'success');
}

// ------------------- SENDER -------------------
async function createOffer(files) {
    selectedFiles = Array.from(files);
    transferCode = generateCode();
    currentFileIndex = 0;
    
    showFileInfo(selectedFiles[0]);
    selectedFile = selectedFiles[0];
    shareCode.textContent = transferCode;
    
    startExpirationCountdown();
    
    dropZone.style.display = 'none';
    inputSection.style.display = 'none';
    orDivider.style.display = 'flex';

    // Generate QR code
    qrCodeContainer.innerHTML = '';
    const shareUrl = `${window.location.origin}${window.location.pathname}?code=${transferCode}`;
    
    // Check if QRCode is available
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrCodeContainer, {
            text: shareUrl,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });
    }
    
    qrSection.classList.add('active');

    showStatus('Setting up connection...', 'info');
    statusText.textContent = 'Creating offer...';

    peerConnection = new RTCPeerConnection(config);
    dataChannel = peerConnection.createDataChannel('fileTransfer', {ordered: true});
    dataChannel.binaryType = 'arraybuffer';

    dataChannel.onopen = async () => {
        updateConnectionStatus(true);
        showStatus('✓ Connected! Starting transfer...', 'success');
        statusText.textContent = 'Transferring...';
        await sendFiles();
    };

    const iceCandidates = [];
    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            iceCandidates.push(event.candidate.toJSON());
        } else {
            await set(ref(db, `offers/${transferCode}`), {
                sdp: peerConnection.localDescription.sdp,
                candidates: iceCandidates,
                fileInfo: selectedFiles.map(f => ({
                    name: f.name,
                    size: f.size,
                    type: f.type
                })),
                timestamp: Date.now()
            });
            showStatus('✓ Code ready! Share with receiver.', 'success');
            statusText.textContent = 'Waiting for receiver...';
        }
    };

    const answerRef = ref(db, `answers/${transferCode}`);
    onValue(answerRef, async snapshot => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();
        await peerConnection.setRemoteDescription({ type: 'answer', sdp: data.sdp });
        if (data.candidates) {
            for (const c of data.candidates) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(c));
            }
        }
        await remove(answerRef);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
}

async function sendFiles() {
    stats.style.display = 'flex';
    progressBar.classList.add('active');
    let totalBytes = selectedFiles.reduce((a, f) => a + f.size, 0);
    let sentBytes = 0;
    lastUpdate = Date.now();
    bytesAtLastUpdate = 0;

    for (currentFileIndex = 0; currentFileIndex < selectedFiles.length; currentFileIndex++) {
        const file = selectedFiles[currentFileIndex];
        showFileInfo(file);
        dataChannel.send(JSON.stringify({ name: file.name, size: file.size, type: file.type }));

        const chunkCount = Math.ceil(file.size / CHUNK_SIZE);
        for (let i = 0; i < chunkCount; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);
            const arrayBuffer = await chunk.arrayBuffer();

            while (dataChannel.bufferedAmount > CHUNK_SIZE * 4) {
                await new Promise(r => setTimeout(r, 10));
            }
            dataChannel.send(arrayBuffer);
            sentBytes += (end - start);
            updateProgress(sentBytes, totalBytes);
        }
    }

    showStatus('✓ All files sent!', 'success');
    transferSpeed.textContent = formatSpeed(0);
    timeRemaining.textContent = '0s';
    progressPercent.textContent = '100%';
}

// ------------------- RECEIVER -------------------
async function createAnswer(code) {
    showStatus('Checking code validity...', 'info');
    const isValid = await checkCodeExpiration(code);
    if (!isValid) {
        return showStatus('❌ Transfer code expired or invalid', 'error');
    }
    
    showStatus('Looking for transfer...', 'info');
    
    const offerSnapshot = await get(ref(db, `offers/${code}`));
    if (!offerSnapshot.exists()) {
        return showStatus('❌ Invalid code or transfer expired', 'error');
    }

    const offerData = offerSnapshot.val();
    const filesInfo = Array.isArray(offerData.fileInfo) ? offerData.fileInfo : [offerData.fileInfo];
    
    if (filesInfo.length > 1) {
        const totalSize = filesInfo.reduce((sum, f) => sum + f.size, 0);
        fileName.textContent = `${filesInfo.length} files incoming`;
        fileSize.innerHTML = `Total size: ${formatFileSize(totalSize)}<br><span style="font-size: 12px; color: #999;">Click to view all files</span>`;
        fileSize.style.cursor = 'pointer';
        fileSize.style.whiteSpace = 'normal';
        
        fileSize.onclick = () => {
            const existingList = document.getElementById('fileListExpanded');
            if (existingList) {
                existingList.remove();
                fileSize.innerHTML = `Total size: ${formatFileSize(totalSize)}<br><span style="font-size: 12px; color: #999;">Click to view all files</span>`;
            } else {
                const fileList = filesInfo.map((f, i) => 
                    `<div style="padding: 4px 0; font-size: 13px; color: #666; border-bottom: 1px solid #eee;">
                        <span style="font-weight: 600; color: #333;">${i + 1}.</span> ${f.name} 
                        <span style="color: #999;">(${formatFileSize(f.size)})</span>
                    </div>`
                ).join('');
                fileSize.innerHTML = `Total size: ${formatFileSize(totalSize)}<br><span style="font-size: 12px; color: #999;">Click to hide</span>
                    <div id="fileListExpanded" style="margin-top: 10px; max-height: 200px; overflow-y: auto;">${fileList}</div>`;
            }
        };
    } else {
        fileName.textContent = filesInfo[0].name;
        fileSize.textContent = formatFileSize(filesInfo[0].size);
        fileSize.style.whiteSpace = 'normal';
        fileSize.style.cursor = 'default';
        fileSize.onclick = null;
    }
    fileInfo.classList.add('active');
    
    dropZone.style.display = 'none';
    inputSection.style.display = 'none';
    orDivider.style.display = 'none';

    showStatus('✓ Found transfer! Connecting...', 'success');
    statusText.textContent = 'Establishing connection...';

    peerConnection = new RTCPeerConnection(config);

    peerConnection.ondatachannel = event => {
        dataChannel = event.channel;
        dataChannel.binaryType = 'arraybuffer';

        dataChannel.onmessage = e => {
            if (typeof e.data === 'string') {
                currentReceivedFile = JSON.parse(e.data);
                totalSize = currentReceivedFile.size;
                receivedChunks = [];
                receivedSize = 0;

                lastUpdate = Date.now();
                bytesAtLastUpdate = 0;

                stats.style.display = 'flex';
                progressBar.classList.add('active');
                progressFill.style.width = '0%';
                progressPercent.textContent = '0%';
                transferSpeed.textContent = '—';
                timeRemaining.textContent = '--:--';

                statusText.textContent = `Receiving: ${currentReceivedFile.name}`;
                return;
            }

            receivedChunks.push(e.data);
            receivedSize += e.data.byteLength;
            updateProgress(receivedSize, totalSize);

            if (receivedSize >= totalSize) {
                saveReceivedFile(currentReceivedFile, receivedChunks);
                receivedFiles.push(currentReceivedFile);

                receivedChunks = [];
                currentReceivedFile = null;
                receivedSize = 0;
                totalSize = 0;

                stats.style.display = 'none';
                progressBar.classList.remove('active');
                progressFill.style.width = '0%';
                progressPercent.textContent = '';
                transferSpeed.textContent = '';
                timeRemaining.textContent = '';

                statusText.textContent = 'File received!';
            }
        };

        dataChannel.onopen = () => {
            updateConnectionStatus(true);
            showStatus('✓ Connected! Receiving file...', 'success');
        };
    };

    const iceCandidates = [];
    peerConnection.onicecandidate = async event => {
        if (event.candidate) {
            iceCandidates.push(event.candidate.toJSON());
        } else {
            await set(ref(db, `answers/${code}`), {
                sdp: peerConnection.localDescription.sdp,
                candidates: iceCandidates,
                timestamp: Date.now()
            });
        }
    };

    await peerConnection.setRemoteDescription({ type: 'offer', sdp: offerData.sdp });
    if (offerData.candidates) {
        for (const c of offerData.candidates) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(c));
        }
    }

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
}

// ------------------- UI Event Handlers -------------------
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length) createOffer(files);
});

fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length) createOffer(files);
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(shareCode.textContent).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    });
});

const shareCodeBtn = document.getElementById('shareCodeBtn');
if (shareCodeBtn) {
    shareCodeBtn.addEventListener('click', async () => {
        const code = shareCode.textContent;
        const shareUrl = `${window.location.origin}${window.location.pathname}?code=${code}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Sendvia File Transfer',
                    text: `Use code ${code} to download the file`,
                    url: shareUrl
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            navigator.clipboard.writeText(code).then(() => {
                const originalHTML = shareCodeBtn.innerHTML;
                shareCodeBtn.innerHTML = '✓ Copied!';
                setTimeout(() => {
                    shareCodeBtn.innerHTML = originalHTML;
                }, 2000);
            });
        }
    });
}

const copyLinkBtn = document.getElementById('copyLinkBtn');
if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
        const code = shareCode.textContent;
        const shareUrl = `${window.location.origin}${window.location.pathname}?code=${code}`;
        
        navigator.clipboard.writeText(shareUrl).then(() => {
            const originalHTML = copyLinkBtn.innerHTML;
            copyLinkBtn.innerHTML = '✓ Link Copied!';
            setTimeout(() => {
                copyLinkBtn.innerHTML = originalHTML;
            }, 2000);
        });
    });
}

connectBtn.addEventListener('click', () => {
    const code = codeInput.value.toUpperCase().trim();
    if (code.length === 6) {
        createAnswer(code);
    } else {
        showStatus('Please enter a valid 6-character code', 'error');
    }
});

codeInput.addEventListener('input', (e) => {
    const code = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    e.target.value = code;
    
    if (code.length === 6) {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('code', code);
        window.history.replaceState({}, '', newUrl);
    } else if (code.length === 0) {
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('code');
        window.history.replaceState({}, '', newUrl);
    }
});

codeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && codeInput.value.length === 6) {
        connectBtn.click();
    }
});

// ------------------- Version & Changelog -------------------
const VERSION_ELEMENT = document.getElementById("versionText");
const CHANGELOG_URL = "https://raw.githubusercontent.com/sendvia/sendvia.github.io/main/CHANGELOG.md";
const REPO_OWNER = "sendvia";
const REPO_NAME = "sendvia.github.io";
const BRANCH = "main";

async function fetchVersionFromChangelog() {
    try {
        const res = await fetch(`${CHANGELOG_URL}?t=${Date.now()}`);
        if (!res.ok) throw new Error("Failed to fetch changelog");
        const text = await res.text();

        const match = text.match(/^##\s+v?([0-9]+\.[0-9]+\.[0-9]+)/m);
        if (match) return match[1];
        return "unknown";
    } catch (err) {
        console.warn("Could not fetch version from changelog:", err);
        return "unknown";
    }
}

async function fetchLatestCommitHash() {
    try {
        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/${BRANCH}`);
        const data = await res.json();
        return data.sha?.slice(0, 7) || "unknown";
    } catch {
        return "unknown";
    }
}

async function updateVersionText() {
    if (VERSION_ELEMENT) {
        const versionNumber = await fetchVersionFromChangelog();
        const hash = await fetchLatestCommitHash();
        VERSION_ELEMENT.textContent = `v${versionNumber} • build ${hash}`;
    }
}

updateVersionText();

const changelogBtn = document.getElementById("changelogBtn");
const changelogModal = document.getElementById("changelogModal");
const changelogBody = document.getElementById("changelogBody");
const closeChangelog = document.getElementById("closeChangelog");

const HEADER_CLASS_MAP = {
    added: "changelog-body-added",
    changed: "changelog-body-changed",
    removed: "changelog-body-removed",
    fixed: "changelog-body-fixed"
};

if (changelogBtn && changelogModal && changelogBody) {
    changelogBtn.addEventListener("click", async () => {
        changelogModal.classList.add("active");

        if (changelogBody.dataset.loaded) return;

        try {
            const res = await fetch(`${CHANGELOG_URL}?t=${Date.now()}`);
            if (!res.ok) throw new Error("Fetch failed");
            const text = await res.text();

            // Markdown parser
            let html = text
                .split('\n')
                .map(line => {
                    // Headers
                    if (line.startsWith('### ')) {
                        const headerText = line.slice(4).trim();
                        const headerClass = HEADER_CLASS_MAP[headerText.toLowerCase()];
                        if (headerClass) {
                            return `<h3 class="${headerClass}">${headerText}</h3>`;
                        }
                        return `<h3>${headerText}</h3>`;
                    }
                    if (line.startsWith('## ')) {
                        return `<h2>${line.slice(3)}</h2>`;
                    }
                    if (line.startsWith('# ')) {
                        return `<h1>${line.slice(2)}</h1>`;
                    }

                    // List items
                    if (line.startsWith('- ')) {
                        return `<li>${line.slice(2)}</li>`;
                    }

                    // Empty lines
                    if (line.trim() === '') {
                        return '<br>';
                    }

                    return line;
                })
                .join('\n');

            // Wrap consecutive <li> in <ul>
            html = html.replace(/(<li>.*?<\/li>\n?)+/gs, match => `<ul>${match}</ul>`);

            changelogBody.innerHTML = html;
            changelogBody.dataset.loaded = "true";
        } catch (err) {
            console.error('Changelog fetch error:', err);
            changelogBody.textContent = "Failed to load changelog.";
        }
    });
}

if (closeChangelog && changelogModal) {
    closeChangelog.addEventListener("click", () => {
        changelogModal.classList.remove("active");
    });

    changelogModal.addEventListener("click", (e) => {
        if (e.target === changelogModal) {
            changelogModal.classList.remove("active");
        }
    });
}

// Add cleanup on page unload
window.addEventListener('beforeunload', async () => {
    // Clear expiration timer
    if (typeof expirationTimer !== 'undefined' && expirationTimer) {
        clearInterval(expirationTimer);
        expirationTimer = null;
    }
    
    if (typeof transferCode !== 'undefined' && transferCode) {
        try {
            // Make sure db and ref are available
            if (typeof db !== 'undefined' && typeof ref !== 'undefined' && typeof remove !== 'undefined') {
                await remove(ref(db, `offers/${transferCode}`));
                await remove(ref(db, `answers/${transferCode}`));
            }
        } catch (e) {
            console.error('Cleanup failed:', e);
        }
    }
    
    if (typeof peerConnection !== 'undefined' && peerConnection) {
        peerConnection.close();
    }
});

const toggleQrBtn = document.getElementById('toggleQrBtn');
const qrDependent = document.querySelector('.qr-dependent');

if (toggleQrBtn && qrDependent) {
    toggleQrBtn.addEventListener('click', () => {
        const isVisible = qrDependent.classList.toggle('show-qr');
        toggleQrBtn.textContent = isVisible ? 'Hide QR' : 'Show QR';
    });
}

const helpBtn = document.getElementById("helpBtn");
const helpModal = document.getElementById("helpModal");
const helpClose = document.getElementById("helpClose");

if (helpBtn && helpModal) {
    helpBtn.addEventListener("click", () => {
        helpModal.classList.add("active");
    });
}

if (helpClose && helpModal) {
    helpClose.addEventListener("click", () => {
        helpModal.classList.remove("active");
    });

    helpModal.addEventListener("click", (e) => {
        if (e.target === helpModal) {
            helpModal.classList.remove("active");
        }
    });
}

const aboutBtn = document.getElementById("aboutBtn");
const aboutModal = document.getElementById("aboutModal");
const aboutClose = document.getElementById("aboutClose");

if (aboutBtn && aboutModal) {
    aboutBtn.addEventListener("click", () => {
        aboutModal.classList.add("active");
    });
}

if (aboutClose && aboutModal) {
    aboutClose.addEventListener("click", () => {
        aboutModal.classList.remove("active");
    });

    aboutModal.addEventListener("click", (e) => {
        if (e.target === aboutModal) {
            aboutModal.classList.remove("active");
        }
    });
}

const privacyBtn = document.getElementById('privacyBtn');
if (privacyBtn) {
    privacyBtn.addEventListener('click', () => {
        window.open('/privacy-terms', '_blank', 'noopener,noreferrer');
    });
}