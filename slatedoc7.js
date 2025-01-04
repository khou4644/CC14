// Clear existing content and set up storage system
document.body.innerHTML = '';

// Create a style element for Tailwind CSS and custom styles
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
}`;
document.head.appendChild(style);

// Storage system
class StorageSystem {
    constructor() {
        this.db = null;
        this.type = 'localStorage'; // Default to localStorage
    }

    async init() {
        if (window.isSecureContext) {
            try {
                this.db = await new Promise((resolve, reject) => {
                    const request = indexedDB.open('CameraDB', 1);
                    request.onerror = () => resolve(null);
                    request.onsuccess = () => resolve(request.result);
                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains('images')) {
                            db.createObjectStore('images', { keyPath: 'timestamp' });
                        }
                    };
                });
                if (this.db) this.type = 'indexedDB';
            } catch (error) {
                console.warn('IndexedDB failed, using localStorage');
            }
        }
    }

    async storeImage(imageBlob) {
        if (this.type === 'indexedDB' && this.db) {
            return new Promise((resolve, reject) => {
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
        } else {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const timestamp = Date.now() + performance.now() % 1;
                    localStorage.setItem(`image_${timestamp}`, reader.result);
                    localStorage.setItem(`timestamp_${timestamp}`, timestamp);
                    resolve();
                };
                reader.readAsDataURL(imageBlob);
            });
        }
    }

    async getImages() {
        if (this.type === 'indexedDB' && this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['images'], 'readonly');
                const store = transaction.objectStore('images');
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } else {
            const images = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('image_')) {
                    const timestamp = parseInt(localStorage.getItem(`timestamp_${key.slice(6)}`));
                    const dataUrl = localStorage.getItem(key);
                    try {
                        const response = await fetch(dataUrl);
                        const blob = await response.blob();
                        images.push({
                            timestamp: timestamp,
                            data: blob
                        });
                    } catch (error) {
                        console.error('Error loading image:', error);
                    }
                }
            }
            return images.sort((a, b) => b.timestamp - a.timestamp);
        }
    }

    async deleteAllImages() {
        if (this.type === 'indexedDB' && this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['images'], 'readwrite');
                const store = transaction.objectStore('images');
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } else {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('image_') || key.startsWith('timestamp_')) {
                    keys.push(key);
                }
            }
            keys.forEach(key => localStorage.removeItem(key));
            return Promise.resolve();
        }
    }
}

// Camera System
class CameraSystem {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.stream = null;
        this.isActive = false;
    }

    async start() {
        if (this.isActive) return;
        
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            this.video.srcObject = this.stream;
            this.isActive = true;
            console.log('Camera started');
            return true;
        } catch (error) {
            console.error('Error accessing camera:', error);
            return false;
        }
    }

    async stop() {
        if (!this.isActive) return;
        
        try {
            if (this.stream) {
                this.stream.getTracks().forEach(track => {
                    track.stop();
                    this.stream.removeTrack(track);
                });
                this.stream = null;
            }
            this.video.srcObject = null;
            this.isActive = false;
            console.log('Camera stopped');
        } catch (error) {
            console.error('Error stopping camera:', error);
        }
    }

    async captureImage() {
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                if (!this.video.videoWidth) {
                    resolve(null);
                    return;
                }
                
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                const context = this.canvas.getContext('2d');
                context.drawImage(this.video, 0, 0);
                
                this.canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.95);
            });
        });
    }

    isStreaming() {
        return this.isActive && this.stream !== null;
    }
}

// Create trash icon SVG
const createTrashIcon = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'trash-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M3 6h18');
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6');
    const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path3.setAttribute('d', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2');
    
    svg.appendChild(path1);
    svg.appendChild(path2);
    svg.appendChild(path3);
    
    return svg;
};

// Initialize IndexedDB
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('CameraDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('images')) {
                db.createObjectStore('images', { keyPath: 'timestamp' });
            }
        };
    });
};

// Create UI elements
const container = document.createElement('div');
container.className = 'flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4';
document.body.appendChild(container);

// Create video element
const video = document.createElement('video');
video.className = 'w-full max-w-full h-auto border-2 border-gray-300 rounded-lg shadow-lg mb-4';
video.autoplay = true;
video.muted = true;
video.playsInline = true;
container.appendChild(video);

// Create canvas
const canvas = document.createElement('canvas');
canvas.style.display = 'none';
container.appendChild(canvas);

// Create storage info card and other UI elements
// [Previous UI creation code remains the same]

// Initialize systems
const storageSystem = new StorageSystem();
const cameraSystem = new CameraSystem(video, canvas);

// Modified toggle camera function
async function toggleCamera(checkbox) {
    if (checkbox.checked) {
        const success = await cameraSystem.start();
        if (success) {
            knob.style.transform = 'translateX(100%)';
            switchDiv.className = 'relative w-14 h-8 bg-green-500 rounded-full shadow-inner transition duration-200 ease-in-out';
        } else {
            checkbox.checked = false;
        }
    } else {
        if (cameraSystem.isStreaming()) {
            try {
                const imageBlob = await cameraSystem.captureImage();
                if (imageBlob) {
                    await storageSystem.storeImage(imageBlob);
                }
                await cameraSystem.stop();
                await displayImages();
            } catch (error) {
                console.error('Error during camera shutdown:', error);
            }
        }
        knob.style.transform = 'translateX(0)';
        switchDiv.className = 'relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out';
    }
}

// Initialize application
(async () => {
    await storageSystem.init();
    await displayImages();
    // Add event listeners
    checkbox.addEventListener('change', () => toggleCamera(checkbox));
    
    document.getElementById('delete-all').addEventListener('click', async () => {
        if (confirm('Delete all images? This cannot be undone.')) {
            await storageSystem.deleteAllImages();
            await displayImages();
        }
    });
})();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    cameraSystem.stop();
});