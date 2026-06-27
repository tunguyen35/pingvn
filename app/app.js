// Dynamic import của speedtest library
let SpeedTest;

// Load library từ CDN hoặc local
async function loadSpeedTest() {
    try {
        // Cách 1: Dùng CDN (nếu có)
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@cloudflare/speedtest@latest/dist/speedtest.min.js';
        document.head.appendChild(script);
        
        // Wait for library loaded
        await new Promise((resolve) => {
            script.onload = resolve;
        });
        
        SpeedTest = window.SpeedTest;
    } catch (error) {
        console.error('Failed to load SpeedTest library:', error);
    }
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', async () => {
    await loadSpeedTest();
    initializeApp();
});

let speedtest = null;
let history = [];
let isRunning = false;

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');
const statusText = document.getElementById('statusText');
const resultsDiv = document.getElementById('results');
const progressDiv = document.getElementById('progress');
const historyList = document.getElementById('historyList');

// Load history from localStorage
function loadHistory() {
    const saved = localStorage.getItem('speedtest-history');
    history = saved ? JSON.parse(saved) : [];
    renderHistory();
}

// Save history to localStorage
function saveHistory() {
    localStorage.setItem('speedtest-history', JSON.stringify(history));
}

// Render history
function renderHistory() {
    if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-history">No test history yet</p>';
        return;
    }

    historyList.innerHTML = history.map((item, index) => `
        <div class="history-item">
            <div class="history-item-info">
                <div class="history-item-time">${item.timestamp}</div>
                <div class="history-item-values">
                    ↓ ${item.download.toFixed(2)} Mbps | ↑ ${item.upload.toFixed(2)} Mbps | Ping ${item.latency.toFixed(0)}ms
                </div>
            </div>
            <button class="history-item-delete" onclick="deleteHistory(${index})">Delete</button>
        </div>
    `).join('');
}

// Delete history item
function deleteHistory(index) {
    history.splice(index, 1);
    saveHistory();
    renderHistory();
}

// Initialize app
function initializeApp() {
    loadHistory();

    startBtn.addEventListener('click', startTest);
    resetBtn.addEventListener('click', resetTest);
}

// Start test
async function startTest() {
    if (isRunning || !SpeedTest) return;

    isRunning = true;
    startBtn.disabled = true;
    resetBtn.disabled = true;
    statusDiv.style.display = 'block';
    resultsDiv.style.display = 'none';
    progressDiv.style.display = 'block';

    statusText.textContent = 'Initializing test...';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';

    try {
        // Create speedtest instance
        speedtest = new SpeedTest({
            autoStart: false,
        });

        // Update on progress
        let lastProgress = 0;
        speedtest.onResultsChange = (info) => {
            const progress = Math.min(
                (speedtest.results.getDownloadBandwidthPoints().length * 10 +
                 speedtest.results.getUploadBandwidthPoints().length * 10) / 2,
                90
            );

            if (progress > lastProgress) {
                lastProgress = progress;
                document.getElementById('progressFill').style.width = progress + '%';
                document.getElementById('progressText').textContent = Math.round(progress) + '%';
            }

            updateStatusText(info.type);
        };

        // On error
        speedtest.onError = (error) => {
            console.error('Test error:', error);
            statusText.textContent = `Error: ${error}`;
        };

        // On finish
        speedtest.onFinish = (results) => {
            showResults(results);
            isRunning = false;
            startBtn.disabled = false;
            resetBtn.disabled = false;
        };

        // Start the test
        statusText.textContent = 'Running test...';
        speedtest.play();

    } catch (error) {
        console.error('Test failed:', error);
        statusText.textContent = 'Test failed. Please try again.';
        isRunning = false;
        startBtn.disabled = false;
        resetBtn.disabled = false;
    }
}

// Update status text based on measurement type
function updateStatusText(type) {
    const messages = {
        'latency': 'Measuring latency...',
        'download': 'Measuring download speed...',
        'upload': 'Measuring upload speed...',
        'packetLoss': 'Measuring packet loss...'
    };
    statusText.textContent = messages[type] || 'Running test...';
}

// Show results
function showResults(results) {
    const summary = results.getSummary();

    const download = (summary.download / 1e6).toFixed(2); // bps to Mbps
    const upload = (summary.upload / 1e6).toFixed(2);
    const latency = summary.latency.toFixed(2);
    const jitter = summary.jitter.toFixed(2);

    document.getElementById('downloadValue').textContent = download;
    document.getElementById('uploadValue').textContent = upload;
    document.getElementById('latencyValue').textContent = latency;
    document.getElementById('jitterValue').textContent = jitter;

    progressDiv.style.display = 'none';
    statusDiv.style.display = 'none';
    resultsDiv.style.display = 'grid';
    document.getElementById('progressFill').style.width = '100%';
    document.getElementById('progressText').textContent = '100%';

    // Save to history
    const now = new Date();
    const timestamp = now.toLocaleString();
    
    history.unshift({
        timestamp,
        download: parseFloat(download),
        upload: parseFloat(upload),
        latency: parseFloat(latency),
        jitter: parseFloat(jitter)
    });

    // Keep only last 20 tests
    if (history.length > 20) {
        history = history.slice(0, 20);
    }

    saveHistory();
    renderHistory();
}

// Reset test
function resetTest() {
    statusDiv.style.display = 'none';
    resultsDiv.style.display = 'none';
    progressDiv.style.display = 'none';
    startBtn.disabled = false;
    isRunning = false;

    if (speedtest) {
        speedtest.pause();
    }
}
