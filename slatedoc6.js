// Clear existing content
document.body.innerHTML = '';

// Create external stylesheet for Tailwind
const linkElement = document.createElement('link');
linkElement.rel = 'stylesheet';
linkElement.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
document.head.appendChild(linkElement);

// Create custom styles using a separate stylesheet
const customStyles = document.createElement('style');
customStyles.textContent = `
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
document.head.appendChild(customStyles);

// Storage initialization with feature detection
const initStorage = () => {
    return new Promise((resolve) => {
        if (!window.isSecureContext) {
            console.warn('Not in secure context, using localStorage');
            resolve({ type: 'localStorage' });
            return;
        }

        try {
            const request = indexedDB.open('CameraDB', 1);
            
            request.onerror = () => {
                console.warn('IndexedDB failed, using localStorage');
                resolve({ type: 'localStorage' });
            };
            
            request.onsuccess = () => {
                resolve({ type: 'indexedDB', db: request.result });
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('images')) {
                    db.createObjectStore('images', { keyPath: 'timestamp' });
                }
            };
        } catch (error) {
            console.warn('IndexedDB error, using localStorage');
            resolve({ type: 'localStorage' });
        }
    });
};

// Storage operations
const storeImage = async (imageBlob, storage) => {
    if (storage.type === 'indexedDB') {
        const transaction = storage.db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        
        return new Promise((resolve, reject) => {
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
};

// Get images with storage type handling
const getImages = async (storage) => {
    if (storage.type === 'indexedDB') {
        return new Promise((resolve, reject) => {
            const transaction = storage.db.transaction(['images'], 'readonly');
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
                
                // Convert data URL to blob
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                
                images.push({
                    timestamp: timestamp,
                    data: blob
                });
            }
        }
        return images.sort((a, b) => b.timestamp - a.timestamp);
    }
};

// Delete all images
const deleteAllImages = async (storage) => {
    if (storage.type === 'indexedDB') {
        return new Promise((resolve, reject) => {
            const transaction = storage.db.transaction(['images'], 'readwrite');
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
};

// Calculate storage usage
const calculateStorageUsage = async (storage) => {
    const images = await getImages(storage);
    let totalSize = 0;
    for (const image of images) {
        totalSize += image.data.size;
    }
    return totalSize;
};

// Update storage info
const updateStorageInfo = async (storage) => {
    const usageInBytes = await calculateStorageUsage(storage);
    const usageInMB = (usageInBytes / (1024 * 1024)).toFixed(2);
    const imageCount = (await getImages(storage)).length;
    
    document.getElementById('storage-size').textContent = `${usageInMB} MB`;
    document.getElementById('image-count').textContent = `${imageCount} images`;
    
    const maxStorage = 50 * 1024 * 1024;
    const usagePercentage = (usageInBytes / maxStorage) * 100;
    document.getElementById('usage-fill').style.width = `${Math.min(usagePercentage, 100)}%`;
};

// [Previous SVG creation functions remain unchanged]
${createTrashIcon.toString()}
${createExpandIcon.toString()}

// Media handling
let mediaStream = null;

const captureImage = (videoElement, canvasElement) => {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            const context = canvasElement.getContext('2d');
            context.drawImage(videoElement, 0, 0);
            
            canvasElement.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.95);
        });
    });
};

// Start video stream
const startVideo = async (video, storage) => {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        video.srcObject = mediaStream;
        console.log('Camera started');
        
        video.onloadedmetadata = async () => {
            const imageBlob = await captureImage(video, canvas);
            await storeImage(imageBlob, storage);
            await displayImages(storage);
        };
    } catch (error) {
        console.error('Error accessing camera:', error);
        document.body.innerHTML = '<h1 class="text-red-500">Error accessing the camera</h1>';
    }
};

// Toggle camera
const toggleCamera = async (checkbox, video, canvas, storage) => {
    if (checkbox.checked) {
        await startVideo(video, storage);
        document.querySelector('.camera-toggle-knob').style.transform = 'translateX(100%)';
        document.querySelector('.camera-toggle-bg').className = 'camera-toggle-bg relative w-14 h-8 bg-green-500 rounded-full shadow-inner transition duration-200 ease-in-out';
    } else {
        if (mediaStream) {
            try {
                const imageBlob = await captureImage(video, canvas);
                await storeImage(imageBlob, storage);
                
                mediaStream.getTracks().forEach(track => track.stop());
                video.srcObject = null;
                
                await displayImages(storage);
            } catch (error) {
                console.error('Camera shutdown error:', error);
            }
        }
        document.querySelector('.camera-toggle-knob').style.transform = 'translateX(0)';
        document.querySelector('.camera-toggle-bg').className = 'camera-toggle-bg relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out';
    }
};

// [Previous UI creation code remains unchanged]
// Initialize
(async () => {
    const storage = await initStorage();
    
    // Create UI elements
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4';
    document.body.appendChild(container);
    
    // Add storage info card
    const storageCard = document.createElement('div');
    storageCard.className = 'w-full max-w-full bg-white rounded-lg shadow-lg p-4 mb-4';
    storageCard.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <div>
                <h3 id="usage-bar-title" class="text-lg font-semibold">Storage Usage</h3>
                <div class="flex space-x-4 text-sm text-gray-500">
                    <span id="storage-size">0 MB</span>
                    <span id="image-count">0 images</span>
                </div>
            </div>
            <button id="delete-all" class="text-red-500 hover:text-red-700 focus:outline-none">
                ${createTrashIcon().outerHTML}
            </button>
        </div>
        <div class="usage-bar">
            <div id="usage-fill" class="usage-fill" style="width: 0%"></div>
        </div>
    `;
    container.appendChild(storageCard);
    
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
    
    // Create gallery
    const gallery = document.createElement('div');
    gallery.className = 'w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4';
    container.appendChild(gallery);
    
    // Create camera toggle
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'fixed bottom-10 right-6';
    toggleContainer.innerHTML = `
        <label class="flex items-center cursor-pointer">
            <input type="checkbox" class="hidden camera-toggle">
            <div class="camera-toggle-bg relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out">
                <span class="camera-toggle-knob absolute w-6 h-6 bg-white rounded-full shadow transform transition duration-200 ease-in-out"></span>
            </div>
        </label>
    `;
    document.body.appendChild(toggleContainer);
    
    // Add event listeners
    const checkbox = document.querySelector('.camera-toggle');
    checkbox.addEventListener('change', () => toggleCamera(checkbox, video, canvas, storage));
    
    document.getElementById('delete-all').addEventListener('click', async () => {
        if (confirm('Delete all images? This cannot be undone.')) {
            await deleteAllImages(storage);
            await displayImages(storage);
            await updateStorageInfo(storage);
        }
    });
    
    // Initialize camera and display
    await startVideo(video, storage);
    await displayImages(storage);
    await updateStorageInfo(storage);
})();