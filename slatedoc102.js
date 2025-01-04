// Debug configuration
const DEBUG = {
    enabled: true,
    logLevel: 'verbose', // 'error' | 'warn' | 'info' | 'verbose'
    logToConsole: function(level, ...args) {
        if (!this.enabled) return;
        
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        
        switch (level) {
            case 'error':
                console.error(prefix, ...args);
                break;
            case 'warn':
                console.warn(prefix, ...args);
                break;
            case 'info':
                if (this.logLevel === 'info' || this.logLevel === 'verbose') {
                    console.info(prefix, ...args);
                }
                break;
            case 'verbose':
                if (this.logLevel === 'verbose') {
                    console.log(prefix, ...args);
                }
                break;
        }
    }
};

// Camera stream configuration
const CAMERA_CONFIG = {
    video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
    }
};

// Clear existing content and setup basic styles
document.body.innerHTML = '';

// Create and append style element
const style = document.createElement('style');
style.innerHTML = `
    @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');

    .expand-icon, .trash-icon {
        width: 16px;
        height: 16px;
        cursor: pointer;
    }

    .fullscreen-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .fullscreen-image {
        max-width: 95%;
        max-height: 95%;
        object-fit: contain;
    }

    .usage-bar {
        height: 8px;
        border-radius: 4px;
        background-color: #e5e7eb;
        overflow: hidden;
    }

    #usage-bar-title {
        color: #000000;
    }

    .usage-fill {
        height: 100%;
        background-color: #3b82f6;
        transition: width 0.3s ease;
    }

    .video-container {
        position: relative;
        width: 100%;
        max-width: 640px;
        margin: 0 auto;
    }

    .video-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
        font-size: 1.2em;
        display: none;
    }
`;
document.head.appendChild(style);

// Database initialization with error handling
class DatabaseManager {
    constructor() {
        this.dbName = 'CameraDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        try {
            this.db = await new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.version);
                
                request.onerror = () => {
                    DEBUG.logToConsole('error', 'Failed to open database:', request.error);
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    DEBUG.logToConsole('info', 'Database opened successfully');
                    resolve(request.result);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('images')) {
                        db.createObjectStore('images', { keyPath: 'timestamp' });
                        DEBUG.logToConsole('info', 'Created images object store');
                    }
                };
            });
            return true;
        } catch (error) {
            DEBUG.logToConsole('error', 'Database initialization failed:', error);
            return false;
        }
    }

    async storeImage(imageBlob) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['images'], 'readwrite');
                const store = transaction.objectStore('images');
                
                const image = {
                    timestamp: Date.now() + performance.now() % 1,
                    data: imageBlob
                };
                
                const request = store.add(image);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            DEBUG.logToConsole('verbose', 'Image stored successfully');
        } catch (error) {
            DEBUG.logToConsole('error', 'Failed to store image:', error);
            throw error;
        }
    }
}

// Camera manager class
class CameraManager {
    constructor() {
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.dbManager = new DatabaseManager();
    }

    async initialize() {
        try {
            await this.dbManager.init();
            this.setupVideoElement();
            this.setupCanvasElement();
            DEBUG.logToConsole('info', 'Camera manager initialized');
        } catch (error) {
            DEBUG.logToConsole('error', 'Camera manager initialization failed:', error);
            throw error;
        }
    }

    setupVideoElement() {
        this.video = document.createElement('video');
        this.video.className = 'w-full max-w-full h-auto border-2 border-gray-300 rounded-lg shadow-lg mb-4';
        this.video.autoplay = true;
        this.video.playsInline = true;
        this.video.muted = true;
        
        // iOS 14 specific attributes
        this.video.setAttribute('playsinline', 'true');
        this.video.setAttribute('webkit-playsinline', 'true');
        
        const container = document.querySelector('.video-container');
        if (!container) {
            DEBUG.logToConsole('error', 'Video container not found');
            throw new Error('Video container not found');
        }
        container.appendChild(this.video);
        DEBUG.logToConsole('verbose', 'Video element setup complete');
    }

    setupCanvasElement() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'none';
        document.body.appendChild(this.canvas);
    }

    async startStream() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONFIG);
            this.video.srcObject = this.stream;
            
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => resolve();
                this.video.onerror = (error) => reject(error);
            });
            
            DEBUG.logToConsole('info', 'Camera stream started successfully');
            return true;
        } catch (error) {
            DEBUG.logToConsole('error', 'Failed to start camera stream:', error);
            this.handleStreamError(error);
            return false;
        }
    }

    handleStreamError(error) {
        let errorMessage = 'Failed to access camera';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Camera access denied. Please grant permission.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No camera found on this device.';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'Camera is already in use by another application.';
        }
        
        const overlay = document.createElement('div');
        overlay.className = 'video-overlay';
        overlay.textContent = errorMessage;
        this.video.parentElement.appendChild(overlay);
        overlay.style.display = 'flex';
    }

    async stopStream() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
                DEBUG.logToConsole('verbose', `Stopped track: ${track.kind}`);
            });
            this.video.srcObject = null;
            this.stream = null;
        }
    }

    async captureImage() {
        if (!this.video || !this.stream) {
            throw new Error('Camera not initialized');
        }

        try {
            return await new Promise((resolve) => {
                requestAnimationFrame(() => {
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    const context = this.canvas.getContext('2d');
                    context.drawImage(this.video, 0, 0);
                    
                    this.canvas.toBlob((blob) => {
                        DEBUG.logToConsole('verbose', 'Image captured successfully');
                        resolve(blob);
                    }, 'image/jpeg', 0.95);
                });
            });
        } catch (error) {
            DEBUG.logToConsole('error', 'Failed to capture image:', error);
            throw error;
        }
    }
}

// Initialize application
async function initializeApp() {
    try {
        // Create main container
        const container = document.createElement('div');
        container.className = 'flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4';
        document.body.appendChild(container);

        // Create video container
        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container';
        container.appendChild(videoContainer);

        // Create gallery container
        const gallery = document.createElement('div');
        gallery.className = 'w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4';
        container.appendChild(gallery);

        // Create and setup camera toggle
        const label = document.createElement('label');
        label.className = 'flex items-center cursor-pointer fixed bottom-10 right-6';
        document.body.appendChild(label);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'hidden';
        label.appendChild(checkbox);

        const switchDiv = document.createElement('div');
        switchDiv.className = 'relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out';
        label.appendChild(switchDiv);

        const knob = document.createElement('span');
        knob.className = 'absolute w-6 h-6 bg-white rounded-full shadow transform transition duration-200 ease-in-out';
        switchDiv.appendChild(knob);

        // Initialize camera manager
        const cameraManager = new CameraManager();
        await cameraManager.initialize();
        await cameraManager.startStream(); // Start the camera stream immediately

        // Add toggle camera functionality
        checkbox.addEventListener('change', async () => {
            if (checkbox.checked) {
                DEBUG.logToConsole('info', 'Turning camera on');
                await cameraManager.startStream();
                knob.style.transform = 'translateX(100%)';
                switchDiv.className = 'relative w-14 h-8 bg-green-500 rounded-full shadow-inner transition duration-200 ease-in-out';
            } else {
                DEBUG.logToConsole('info', 'Turning camera off');
                await cameraManager.stopStream();
                knob.style.transform = 'translateX(0)';
                switchDiv.className = 'relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out';
            }
        });

        DEBUG.logToConsole('info', 'Application initialized successfully');
    } catch (error) {
        DEBUG.logToConsole('error', 'Application initialization failed:', error);
        document.body.innerHTML = `
            <div class="text-red-500 text-center p-4">
                Failed to initialize application: ${error.message}
            </div>
        `;
    }
}

// Start the application
initializeApp();
