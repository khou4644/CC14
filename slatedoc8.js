// Clear existing content
document.body.innerHTML = '';

// Instead of importing Tailwind via @import, create a link element
const linkElement = document.createElement('link');
linkElement.rel = 'stylesheet';
linkElement.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/base.min.css';
document.head.appendChild(linkElement);

// Create custom styles using textContent instead of innerHTML
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

// Storage System [Previous implementation remains the same]
class StorageSystem {
    // ... [Previous implementation]
}

// Camera System [Previous implementation remains the same]
class CameraSystem {
    // ... [Previous implementation]
}

// SVG Creation Functions
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

const createExpandIcon = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'expand-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

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

// Create UI Container
const container = document.createElement('div');
container.className = 'flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4';
document.body.appendChild(container);

// Create Storage Card
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

// Create Video Element
const video = document.createElement('video');
video.className = 'w-full max-w-full h-auto border-2 border-gray-300 rounded-lg shadow-lg mb-4';
video.autoplay = true;
video.muted = true;
video.playsInline = true;
container.appendChild(video);

// Create Canvas
const canvas = document.createElement('canvas');
canvas.style.display = 'none';
container.appendChild(canvas);

// Create Gallery
const gallery = document.createElement('div');
gallery.className = 'w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4';
container.appendChild(gallery);

// Create Camera Toggle
const toggleContainer = document.createElement('div');
toggleContainer.className = 'fixed bottom-10 right-6';
toggleContainer.innerHTML = `
    <label class="flex items-center cursor-pointer">
        <input type="checkbox" class="hidden camera-toggle">
        <div class="relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out">
            <span class="absolute w-6 h-6 bg-white rounded-full shadow transform transition duration-200 ease-in-out"></span>
        </div>
    </label>
`;
document.body.appendChild(toggleContainer);

const checkbox = toggleContainer.querySelector('.camera-toggle');
const knob = toggleContainer.querySelector('span');
const switchDiv = toggleContainer.querySelector('div');

// Initialize Systems
const storageSystem = new StorageSystem();
const cameraSystem = new CameraSystem(video, canvas);

// Utility Functions
const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString('en-US', { 
        hour12: true,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
    }).replace(/\s[AP]M/, '');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    const period = date.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric' }).slice(-2);
    return `${time}.${ms} ${period}`;
};

// Show Fullscreen Image
const showFullscreen = (imgSrc) => {
    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-overlay';
    
    const img = document.createElement('img');
    img.className = 'fullscreen-image';
    img.src = imgSrc;
    
    overlay.appendChild(img);
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
};

// Update Storage Info
const updateStorageInfo = async () => {
    try {
        const images = await storageSystem.getImages();
        const totalSize = images.reduce((sum, img) => sum + img.data.size, 0);
        const usageInMB = (totalSize / (1024 * 1024)).toFixed(2);
        
        document.getElementById('storage-size').textContent = `${usageInMB} MB`;
        document.getElementById('image-count').textContent = `${images.length} images`;
        
        const maxStorage = 50 * 1024 * 1024; // 50MB limit
        const usagePercentage = (totalSize / maxStorage) * 100;
        document.getElementById('usage-fill').style.width = `${Math.min(usagePercentage, 100)}%`;
    } catch (error) {
        console.error('Error updating storage info:', error);
    }
};

// Display Images
const displayImages = async () => {
    try {
        const images = await storageSystem.getImages();
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

        for (const image of images) {
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
                if (confirm('Delete this image?')) {
                    await storageSystem.deleteImage(image.timestamp);
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
    } catch (error) {
        console.error('Error displaying images:', error);
    }
};

// Camera Toggle Function
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

// Initialize Application
(async () => {
    try {
        await storageSystem.init();
        await displayImages();
        
        // Add event listeners
        checkbox.addEventListener('change', () => toggleCamera(checkbox));
        
        document.getElementById('delete-all').addEventListener('click', async () => {
            if (confirm('Delete all images? This cannot be undone.')) {
                await storageSystem.deleteAllImages();
                await displayImages();
                await updateStorageInfo();
            }
        });
        
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            cameraSystem.stop();
        });
        
        // Enable video metadata loading
        video.addEventListener('loadedmetadata', async () => {
            if (cameraSystem.isStreaming()) {
                const imageBlob = await cameraSystem.captureImage();
                if (imageBlob) {
                    await storageSystem.storeImage(imageBlob);
                    await displayImages();
                }
            }
        });
        
    } catch (error) {
        console.error('Error initializing application:', error);
    }
})();