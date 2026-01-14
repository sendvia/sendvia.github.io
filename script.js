import { getDatabase, ref, set, get, remove, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

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

// NOW check URL parameters (after elements are declared)
const urlParams = new URLSearchParams(window.location.search);
const urlCode = urlParams.get('code');

if (urlCode && urlCode.length === 6) {
    codeInput.value = urlCode.toUpperCase();
    setTimeout(() => {
    connectBtn.click();
    }, 500);
} else if (window.location.search) {
    window.history.replaceState({}, '', window.location.pathname);
}

let peerConnection = null;
let dataChannel = null;
let selectedFile = null;
let receivedChunks = [];
let receivedSize = 0;
let totalSize = 0;
let fileMetadata = null;
let startTime = 0;
let lastUpdate = 0;
let bytesAtLastUpdate = 0;
let transferCode = null;

const CHUNK_SIZE = 262144; // 256KB chunks

const config = {
    iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
    ]
};

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
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

function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status active ' + type;
}

function updateConnectionStatus(connected) {
    if (connected) {
    connectionStatus.classList.add('connected');
    statusText.textContent = '✓ Connected!';
    } else {
    connectionStatus.classList.remove('connected');
    }
}

function updateProgress(current, total) {
    const now = Date.now();
    const percent = (current / total * 100);
    progressFill.style.width = percent + '%';
    progressPercent.textContent = percent.toFixed(1) + '%';

    if (now - lastUpdate > 500) {
    const timeDiff = (now - lastUpdate) / 1000;
    const bytesDiff = current - bytesAtLastUpdate;
    const speed = bytesDiff / timeDiff;
    
    transferSpeed.textContent = formatSpeed(speed);
    
    const remaining = (total - current) / speed;
    timeRemaining.textContent = formatTime(remaining);
    
    lastUpdate = now;
    bytesAtLastUpdate = current;
    }
}

// SENDER
async function createOffer(file) {
    selectedFile = file;
    transferCode = generateCode();
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    shareCode.textContent = transferCode;
    
    fileInfo.classList.add('active');
    dropZone.style.display = 'none';
    inputSection.style.display = 'none';
    orDivider.style.display = 'flex';

    // Generate QR code
    const qrSection = document.getElementById('qrSection');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
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
    
    dataChannel = peerConnection.createDataChannel('fileTransfer', {
    ordered: true
    });
    dataChannel.binaryType = 'arraybuffer';

    dataChannel.onopen = async () => {
    updateConnectionStatus(true);
    showStatus('✓ Connected! Starting transfer...', 'success');
    statusText.textContent = 'Transferring...';
    await sendFile();
    };

    // Collect ICE candidates
    const iceCandidates = [];
    peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
        iceCandidates.push(event.candidate.toJSON());
    } else {
        // All candidates gathered, save to Firebase
        await set(ref(db, `offers/${transferCode}`), {
        sdp: peerConnection.localDescription.sdp,
        candidates: iceCandidates,
        fileInfo: {
            name: file.name,
            size: file.size,
            type: file.type
        },
        timestamp: Date.now()
        });
        
        showStatus('✓ Code ready! Share with receiver.', 'success');
        statusText.textContent = 'Waiting for receiver...';
    }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Listen for answer
    const answerRef = ref(db, `answers/${transferCode}`);
    onValue(answerRef, async (snapshot) => {
    if (snapshot.exists()) {
        const data = snapshot.val();
        
        await peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: data.sdp
        });

        // Add ICE candidates from receiver
        if (data.candidates) {
        for (const candidate of data.candidates) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        }

        statusText.textContent = 'Establishing connection...';
        
        // Cleanup
        await remove(answerRef);
    }
    });
}

async function sendFile() {
    if (!selectedFile || !dataChannel) return;

    stats.style.display = 'flex';
    progressBar.classList.add('active');
    startTime = Date.now();
    lastUpdate = startTime;
    bytesAtLastUpdate = 0;

    const chunkCount = Math.ceil(selectedFile.size / CHUNK_SIZE);
    
    for (let i = 0; i < chunkCount; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
    const chunk = selectedFile.slice(start, end);
    
    const arrayBuffer = await chunk.arrayBuffer();
    
    while (dataChannel.bufferedAmount > CHUNK_SIZE * 4) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    dataChannel.send(arrayBuffer);
    updateProgress(end, selectedFile.size);
    }

    showStatus('✓ Transfer complete!', 'success');
    statusText.textContent = '✓ File sent successfully!';
    
    // Cleanup Firebase
    await remove(ref(db, `offers/${transferCode}`));
}

// RECEIVER
async function createAnswer(code) {
    showStatus('Looking for transfer...', 'info');
    
    const offerSnapshot = await get(ref(db, `offers/${code}`));
    
    if (!offerSnapshot.exists()) {
    showStatus('❌ Invalid code or transfer expired', 'error');
    return;
    }

    const offerData = offerSnapshot.val();
    fileMetadata = offerData.fileInfo;
    totalSize = fileMetadata.size;

    fileName.textContent = fileMetadata.name;
    fileSize.textContent = formatFileSize(fileMetadata.size);
    fileInfo.classList.add('active');
    
    dropZone.style.display = 'none';
    inputSection.style.display = 'none';
    orDivider.style.display = 'none';

    showStatus('✓ Found transfer! Connecting...', 'success');
    statusText.textContent = 'Establishing connection...';

    peerConnection = new RTCPeerConnection(config);

    peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    dataChannel.binaryType = 'arraybuffer';

    dataChannel.onmessage = (e) => {
        receivedChunks.push(e.data);
        receivedSize += e.data.byteLength;
        updateProgress(receivedSize, totalSize);

        if (receivedSize >= totalSize) {
        saveReceivedFile();
        }
    };

    dataChannel.onopen = () => {
        updateConnectionStatus(true);
        showStatus('✓ Connected! Receiving file...', 'success');
        statusText.textContent = 'Downloading...';
        stats.style.display = 'flex';
        progressBar.classList.add('active');
        startTime = Date.now();
        lastUpdate = startTime;
        bytesAtLastUpdate = 0;
    };
    };

    // Collect ICE candidates
    const iceCandidates = [];
    peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
        iceCandidates.push(event.candidate.toJSON());
    } else {
        // All candidates gathered, save answer to Firebase
        await set(ref(db, `answers/${code}`), {
        sdp: peerConnection.localDescription.sdp,
        candidates: iceCandidates,
        timestamp: Date.now()
        });
    }
    };

    await peerConnection.setRemoteDescription({
    type: 'offer',
    sdp: offerData.sdp
    });

    // Add ICE candidates from sender
    if (offerData.candidates) {
    for (const candidate of offerData.candidates) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
    }

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
}

function saveReceivedFile() {
    const blob = new Blob(receivedChunks, { type: fileMetadata.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileMetadata.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus('✓ Download complete!', 'success');
    statusText.textContent = '✓ File received successfully!';
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
    const file = e.dataTransfer.files[0];
    if (file) createOffer(file);
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) createOffer(file);
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
const VERSION = "v1.1.1";
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


// CHANGE THIS to your repo
const CHANGELOG_URL = "https://raw.githubusercontent.com/sendvia/sendvia.github.io/main/CHANGELOG.md";
const res = await fetch(`${CHANGELOG_URL}?t=${Date.now()}`);

const changelogBtn = document.getElementById("changelogBtn");
const changelogModal = document.getElementById("changelogModal");
const changelogBody = document.getElementById("changelogBody");
const closeChangelog = document.getElementById("closeChangelog");

// Replace the changelog button click handler with this:
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

// Add cleanup on page unload - place AFTER all event listeners
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