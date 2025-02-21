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

// SVG creation functions:

// Create expand icon SVG
const createExpandIcon = () => {
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute('class', 'expand-icon');
svg.setAttribute('viewBox', '0 0 24 24');
svg.setAttribute('fill', 'none');
svg.setAttribute('stroke', 'currentColor');
svg.setAttribute('stroke-width', '2');
svg.setAttribute('stroke-linecap', 'round');
svg.setAttribute('stroke-linejoin', 'round');

// Create expand arrows path
const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path1.setAttribute('d', 'M15 3h6v6');
const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path2.setAttribute('d', 'M9 21H3v-6');
const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path3.setAttribute('d', 'M21 3l-7 7');
const path4 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path4.setAttribute('d', 'M3 21l7-7');

svg.appendChild(path1);
svg.appendChild(path2);
svg.appendChild(path3);
svg.appendChild(path4);

return svg;
};

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

// UI creation

// Create a container for all elements
const container = document.createElement('div');
container.className = 'flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4';
document.body.appendChild(container);

// Create storage info card
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

// Add delete all functionality
document.getElementById('delete-all').addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all images? This action cannot be undone.')) {
        await deleteAllImages();
        await displayImages();
        await updateStorageInfo();
    }
});

// Create a video element
const video = document.createElement('video');
video.className = 'w-full max-w-full h-auto border-2 border-gray-300 rounded-lg shadow-lg mb-4';
video.autoplay = true;
video.muted = true;
video.playsInline = true;
container.appendChild(video);

// Create a canvas for capturing images (hidden)
const canvas = document.createElement('canvas');
canvas.style.display = 'none';
container.appendChild(canvas);

// Create an image gallery container
const gallery = document.createElement('div');
gallery.className = 'w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4';
container.appendChild(gallery);

// Create a label for the switch
const label = document.createElement('label');
label.className = 'flex items-center cursor-pointer fixed bottom-10 right-6';
document.body.appendChild(label);

// Create a checkbox input for the switch
const checkbox = document.createElement('input');
checkbox.type = 'checkbox';
checkbox.className = 'hidden';
label.appendChild(checkbox);

// Create a div for the switch styling
const switchDiv = document.createElement('div');
switchDiv.className = 'relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out';
label.appendChild(switchDiv);

// Create a span for the switch knob
const knob = document.createElement('span');
knob.className = 'absolute w-6 h-6 bg-white rounded-full shadow transform transition duration-200 ease-in-out';
switchDiv.appendChild(knob);

// Function to show image in fullscreen
const showFullscreen = (imgSrc) => {
const overlay = document.createElement('div');
overlay.className = 'fullscreen-overlay';

const img = document.createElement('img');
img.className = 'fullscreen-image';
img.src = imgSrc;

overlay.appendChild(img);

// Close on click
overlay.addEventListener('click', () => {
overlay.remove();
});

document.body.appendChild(overlay);
};

// Variable to hold the media stream
let stream;

// Format timestamp helper function
const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString('en-US', { 
        hour12: true,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
    }).replace(/\s[AP]M/, '');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    const period = date.toLocaleTimeString('en-US', { 
        hour12: true,
        hour: 'numeric'
    }).slice(-2);
    return `${time}.${ms} ${period}`;
};

// Display images function
const displayImages = async () => {
    const images = await getImages();
    gallery.innerHTML = '';

    const createThumbnail = async (blob) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const thumbnailWidth = 64;
                const aspectRatio = img.width / img.height;
                const thumbnailHeight = thumbnailWidth / aspectRatio;
                
                canvas.width = thumbnailWidth;
                canvas.height = thumbnailHeight;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, thumbnailWidth, thumbnailHeight);
                
                canvas.toBlob((thumbnailBlob) => {
                    URL.revokeObjectURL(img.src);
                    resolve(URL.createObjectURL(thumbnailBlob));
                }, 'image/jpeg', 0.85);
            };
            img.src = URL.createObjectURL(blob);
        });
    };

    for (const image of images.sort((a, b) => b.timestamp - a.timestamp)) {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-lg p-4';
        
        const timeContainer = document.createElement('div');
        timeContainer.className = 'flex items-center justify-between space-x-2 text-sm text-gray-500';
        
        const timestamp = document.createElement('span');
        timestamp.textContent = formatTimestamp(image.timestamp);
        
        const imageAndControlsContainer = document.createElement('div');
        imageAndControlsContainer.className = 'flex items-center space-x-2';
        
        const img = document.createElement('img');
        img.className = 'w-16 h-auto object-contain';
        const thumbnailUrl = await createThumbnail(image.data);
        img.src = thumbnailUrl;
        
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'flex items-center space-x-2';
        
        const expandIcon = createExpandIcon();
        expandIcon.addEventListener('click', () => {
            showFullscreen(URL.createObjectURL(image.data));
        });
        
        const deleteIcon = createTrashIcon();
        deleteIcon.className = 'trash-icon text-red-500 hover:text-red-700';
        deleteIcon.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this image?')) {
                const db = await initDB();
                const transaction = db.transaction(['images'], 'readwrite');
                const store = transaction.objectStore('images');
                await store.delete(image.timestamp);
                await displayImages();
                await updateStorageInfo();
            }
        });
        
        timeContainer.appendChild(timestamp);
        imageAndControlsContainer.appendChild(img);
        controlsContainer.appendChild(expandIcon);
        controlsContainer.appendChild(deleteIcon);
        imageAndControlsContainer.appendChild(controlsContainer);
        timeContainer.appendChild(imageAndControlsContainer);
        
        card.appendChild(timeContainer);
        gallery.appendChild(card);
    }
    
    await updateStorageInfo();
};

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
checkbox.addEventListener('change', toggleCamera);