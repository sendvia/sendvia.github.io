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
const urlParams = new URLSearchParams(window.location.search);
const urlCode = urlParams.get('code');
if (urlCode && urlCode.length === 6) {
    codeInput.value = urlCode.toUpperCase();
    setTimeout(() => connectBtn.click(), 500);
} else if (window.location.search) {
    window.history.replaceState({}, '', window.location.pathname);
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

// ------------------- Utility Functions -------------------
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
            timeRemaining.textContent =
                remaining > 0 ? formatTime(remaining / speed) : '0s';
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
        // Show multiple files info
        const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
        fileName.textContent = `${selectedFiles.length} files selected`;
        fileSize.innerHTML = `Total size: ${formatFileSize(totalSize)}<br><span style="font-size: 12px; color: #999;">Click to view all files</span>`;
        fileSize.style.cursor = 'pointer';
        fileSize.style.whiteSpace = 'normal';
        
        // Add click handler to toggle file list
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

// ------------------- Save Received File -------------------
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

// SENDER
async function createOffer(files) {
    selectedFiles = Array.from(files);
    transferCode = generateCode();
    currentFileIndex = 0;
    
    // Show all selected files
    showFileInfo(selectedFiles[0]);

    selectedFile = selectedFiles[0];
    
    shareCode.textContent = transferCode;
    
    dropZone.style.display = 'none';
    inputSection.style.display = 'none';
    orDivider.style.display = 'flex';

    // Generate QR code
    qrCodeContainer.innerHTML = ''; // Clear previous QR code
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?code=${transferCode}`;
    new QRCode(qrCodeContainer, {
        text: shareUrl,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
    
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

    // Collect ICE candidates
    const iceCandidates = [];
    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            iceCandidates.push(event.candidate.toJSON());
        } else {
            // All candidates gathered
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
            for (const c of data.candidates) await peerConnection.addIceCandidate(new RTCIceCandidate(c));
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

            while (dataChannel.bufferedAmount > CHUNK_SIZE * 4) await new Promise(r => setTimeout(r, 10));
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

// RECEIVER
async function createAnswer(code) {
    showStatus('Looking for transfer...', 'info');
    
    const offerSnapshot = await get(ref(db, `offers/${code}`));
    if (!offerSnapshot.exists()) return showStatus('❌ Invalid code or transfer expired', 'error');

    const offerData = offerSnapshot.val();
    const filesInfo = Array.isArray(offerData.fileInfo) ? offerData.fileInfo : [offerData.fileInfo];
    
    // Display all files that will be received
    if (filesInfo.length > 1) {
        const totalSize = filesInfo.reduce((sum, f) => sum + f.size, 0);
        fileName.textContent = `${filesInfo.length} files incoming`;
        fileSize.innerHTML = `Total size: ${formatFileSize(totalSize)}<br><span style="font-size: 12px; color: #999;">Click to view all files</span>`;
        fileSize.style.cursor = 'pointer';
        fileSize.style.whiteSpace = 'normal';
        
        // Add click handler to toggle file list
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
            }
        };

        dataChannel.onopen = () => {
            updateConnectionStatus(true);
            showStatus('✓ Connected! Receiving file...', 'success');
        };
    };

    // Collect ICE candidates
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
        for (const c of offerData.candidates) await peerConnection.addIceCandidate(new RTCIceCandidate(c));
    }

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
}

// UI Event Handlers
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

// Share Code button
document.getElementById('shareCodeBtn').addEventListener('click', async () => {
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
        // Fallback: copy code
        navigator.clipboard.writeText(code).then(() => {
            const btn = document.getElementById('shareCodeBtn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '✓ Copied!';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        });
    }
});

// Copy Link button
document.getElementById('copyLinkBtn').addEventListener('click', () => {
    const code = shareCode.textContent;
    const shareUrl = `${window.location.origin}${window.location.pathname}?code=${code}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        const btn = document.getElementById('copyLinkBtn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '✓ Link Copied!';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
    });
});

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
    
    // Update URL bar to show the code
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

const VERSION = "v1.2.0";
const REPO_OWNER = "sendvia";
const REPO_NAME = "sendvia.github.io";
const BRANCH = "main";
const versionTextEl = document.getElementById("versionText");

async function fetchLatestCommitHash() {
    try {
        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/${BRANCH}`);
        if (!res.ok) throw new Error("GitHub API request failed");
        const data = await res.json();
        const hash = data.sha.slice(0, 7);
        versionTextEl.textContent = `${VERSION} • build ${hash}`;
    } catch (err) {
        console.warn("Could not fetch git hash:", err);
        versionTextEl.textContent = `${VERSION} • build unknown`;
    }
}

fetchLatestCommitHash();

const CHANGELOG_URL = "https://raw.githubusercontent.com/sendvia/sendvia.github.io/main/CHANGELOG.md";

const changelogBtn = document.getElementById("changelogBtn");
const changelogModal = document.getElementById("changelogModal");
const changelogBody = document.getElementById("changelogBody");
const closeChangelog = document.getElementById("closeChangelog");

changelogBtn.addEventListener("click", async () => {
    changelogModal.classList.add("active");

    if (changelogBody.dataset.loaded) return;

    try {
        const res = await fetch(`${CHANGELOG_URL}?t=${Date.now()}`);
        if (!res.ok) throw new Error("Fetch failed");
        const text = await res.text();

        // Improved markdown parser
        let html = text
            .split('\n')
            .map(line => {
                // Headers
                if (line.startsWith('### ')) {
                    return `<h3>${line.slice(4)}</h3>`;
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
        html = html.replace(/(<li>.*?<\/li>\n?)+/gs, match => {
            return '<ul>' + match + '</ul>';
        });

        changelogBody.innerHTML = html;
        changelogBody.dataset.loaded = "true";
    } catch {
        changelogBody.textContent = "Failed to load changelog.";
    }
});

closeChangelog.addEventListener("click", () => {
    changelogModal.classList.remove("active");
});

changelogModal.addEventListener("click", (e) => {
    if (e.target === changelogModal) {
        changelogModal.classList.remove("active");
    }
});

// Add cleanup on page unload
window.addEventListener('beforeunload', async () => {
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
    }
});

const toggleQrBtn = document.getElementById('toggleQrBtn');
const qrDependent = document.querySelector('.qr-dependent');

toggleQrBtn.addEventListener('click', () => {
    const isVisible = qrDependent.classList.toggle('show-qr');
    toggleQrBtn.textContent = isVisible ? 'Hide QR' : 'Show QR';
});

const helpBtn = document.getElementById("helpBtn");
const helpModal = document.getElementById("helpModal");
const helpClose = document.getElementById("helpClose");

helpBtn.addEventListener("click", () => {
    // helpModal.classList.add("active");
    alert("Under Construction")
});

helpClose.addEventListener("click", () => {
    helpModal.classList.remove("active");
});

helpModal.addEventListener("click", (e) => {
    if (e.target === helpModal) {
        helpModal.classList.remove("active");
    }

});
