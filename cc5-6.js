// Clear the existing content of the page
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

.usage-fill {
    height: 100%;
    background-color: #3b82f6;
    transition: width 0.3s ease;
}
`;
document.head.appendChild(style);

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

// Enhanced IndexedDB Initialization with iOS 14 and Modern Browser Support
const isIndexedDBSupported = () => {
    try {
        // Check for IndexedDB support with fallback for older browsers
        return 'indexedDB' in window && 
               window.indexedDB !== null;
    } catch (e) {
        console.warn('IndexedDB support check failed:', e);
        return false;
    }
};

// Fallback storage mechanism for limited browser support
const fallbackStorage = {
    _storage: {},
    setItem: function(key, value) {
        try {
            // Attempt to use localStorage first
            if (window.localStorage) {
                localStorage.setItem(key, JSON.stringify(value));
            }
            this._storage[key] = value;
        } catch (e) {
            console.warn('Storage fallback failed:', e);
        }
    },
    getItem: function(key) {
        try {
            // Check localStorage first
            if (window.localStorage) {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : this._storage[key];
            }
            return this._storage[key];
        } catch (e) {
            console.warn('Retrieval from fallback storage failed:', e);
            return null;
        }
    },
    deleteItem: function(key) {
        try {
            if (window.localStorage) {
                localStorage.removeItem(key);
            }
            delete this._storage[key];
        } catch (e) {
            console.warn('Deletion from fallback storage failed:', e);
        }
    }
};

// Improved IndexedDB Initialization
const initDB = () => {
    return new Promise((resolve, reject) => {
        // Early check for IndexedDB support
        if (!isIndexedDBSupported()) {
            console.warn('IndexedDB not supported. Using fallback storage.');
            resolve(fallbackStorage);
            return;
        }

        // Attempt to open IndexedDB
        const request = indexedDB.open('CameraDB', 1);
        
        // Comprehensive error handling
        request.onerror = (event) => {
            console.error('IndexedDB initialization error:', event.target.error);
            
            // Fallback to alternative storage if IndexedDB fails
            console.warn('Falling back to alternative storage mechanism');
            resolve(fallbackStorage);
        };
        
        request.onsuccess = () => {
            const db = request.result;
            
            // Add additional error handlers to database
            db.onerror = (event) => {
                console.error('IndexedDB operation error:', event.target.error);
            };
            
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object store if it doesn't exist
            if (!db.objectStoreNames.contains('images')) {
                db.createObjectStore('images', { 
                    keyPath: 'timestamp',
                    // Add index for easier querying
                    autoIncrement: true 
                });
            }
        };
    });
};

// Calculate storage usage
const calculateStorageUsage = async () => {
    const images = await getImages();
    let totalSize = 0;
    for (const image of images) {
        totalSize += image.data.size;
    }
    return totalSize;
};

// Delete all images function with fallback support
const deleteAllImages = async () => {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
        if (db.transaction) {
            // IndexedDB path
            const transaction = db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.clear();
            
            request.onsuccess = () => {
                updateStorageInfo();
                resolve();
            };
            request.onerror = () => reject(request.error);
        } else {
            // Fallback storage path
            try {
                db.setItem('images', []);
                updateStorageInfo();
                resolve();
            } catch (error) {
                console.error('Image deletion failed:', error);
                reject(error);
            }
        }
    });
};

// Update storage info
const updateStorageInfo = async () => {
    const usageInBytes = await calculateStorageUsage();
    const usageInMB = (usageInBytes / (1024 * 1024)).toFixed(2);
    const imageCount = (await getImages()).length;
    
    // Update storage card content
    document.getElementById('storage-size').textContent = `${usageInMB} MB`;
    document.getElementById('image-count').textContent = `${imageCount} images`;
    
    // Update progress bar (assume 50MB max for example)
    const maxStorage = 50 * 1024 * 1024; // 50MB in bytes
    const usagePercentage = (usageInBytes / maxStorage) * 100;
    const usageBar = document.getElementById('usage-fill');
    usageBar.style.width = `${Math.min(usagePercentage, 100)}%`;
};

// Retrieve images from IndexedDB
const getImages = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        if (db.transaction) {
            // IndexedDB path
            const transaction = db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } else {
            // Fallback storage path
            try {
                const images = db.getItem('images') || [];
                resolve(images);
            } catch (error) {
                console.error('Image retrieval failed:', error);
                reject(error);
            }
        }
    });
};

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
            <h3 class="text-lg font-semibold">Storage Usage</h3>
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

// Capture image function
const captureImage = () => {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0);

            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.95);
        });
    });
};

// Variable to hold the media stream
let stream;

// Function to start the video stream
async function startVideo() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        console.log('Camera started');
        
        video.onloadedmetadata = async () => {
            const imageBlob = await captureImage();
            await storeImage(imageBlob);
            await displayImages();
        };
    } catch (error) {
        console.error('Error accessing the camera: ', error);
        document.body.innerHTML = '<h1 class="text-red-500">Error accessing the camera</h1>';
    }
}

// Function to toggle the camera
async function toggleCamera() {
    if (checkbox.checked) {
        console.log('Turning camera on');
        await startVideo();
        knob.style.transform = 'translateX(100%)';
        switchDiv.className = 'relative w-14 h-8 bg-green-500 rounded-full shadow-inner transition duration-200 ease-in-out';
    } else {
        console.log('Turning camera off');
        if (stream) {
            try {
                const imageBlob = await captureImage();
                await storeImage(imageBlob);
                
                stream.getTracks().forEach(track => track.stop());
                video.srcObject = null;
                console.log('Camera stopped');
                
                await displayImages();
            } catch (error) {
                console.error('Error during camera shutdown:', error);
            }
        }
        knob.style.transform = 'translateX(0)';
        switchDiv.className = 'relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out';
    }
}

// Update display images function to call updateStorageInfo
const displayImages = async () => {
    const images = await getImages();
    gallery.innerHTML = '';

    const createThumbnail = async (blob) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                // Set a very small thumbnail width
                const thumbnailWidth = 64;
                const aspectRatio = img.width / img.height;
                const thumbnailHeight = thumbnailWidth / aspectRatio;
                
                canvas.width = thumbnailWidth;
                canvas.height = thumbnailHeight;
                // Use better quality settings for the small image
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, thumbnailWidth, thumbnailHeight);
                
                canvas.toBlob((thumbnailBlob) => {
                    URL.revokeObjectURL(img.src);
                    resolve(URL.createObjectURL(thumbnailBlob));
                }, 'image/jpeg', 0.85); // Slightly higher quality for the smaller image
            };
            img.src = URL.createObjectURL(blob);
        });
    };

    for (const image of images.sort((a, b) => b.timestamp - a.timestamp)) {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-lg p-4';
        
        const timeContainer = document.createElement('div');
        timeContainer.className = 'flex items-center space-x-2 text-sm text-gray-500';
        
        const timestamp = document.createElement('span');
        const date = new Date(image.timestamp);
        timestamp.textContent = date.toLocaleString() + '.' +
        String(date.getMilliseconds()).padStart(3, '0');
        
        const img = document.createElement('img');
        img.className = 'w-16 h-auto object-contain';
        const thumbnailUrl = await createThumbnail(image.data);
        img.src = thumbnailUrl;
        
        const expandIcon = createExpandIcon();
        expandIcon.addEventListener('click', () => {
            showFullscreen(URL.createObjectURL(image.data));
        });
        
        timeContainer.appendChild(timestamp);
        timeContainer.appendChild(img);
        timeContainer.appendChild(expandIcon);
        
        card.appendChild(timeContainer);
        gallery.appendChild(card);
    };
    
    await updateStorageInfo();
};

// Update storeImage function to call updateStorageInfo
const storeImage = async (imageBlob) => {
    const db = await initDB();
    const timestamp = Date.now();
    
    return new Promise((resolve, reject) => {
        // Handle both IndexedDB and fallback storage
        if (db.transaction) {
            // IndexedDB path
            const transaction = db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.add({ 
                timestamp, 
                image: imageBlob 
            });
            
            request.onsuccess = () => {
                updateStorageInfo();
                resolve();
            };
            request.onerror = () => reject(request.error);
        } else {
            // Fallback storage path
            try {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64Image = reader.result;
                    const images = db.getItem('images') || [];
                    images.push({ 
                        timestamp, 
                        image: base64Image 
                    });
                    db.setItem('images', images);
                    updateStorageInfo();
                    resolve();
                };
                reader.readAsDataURL(imageBlob);
            } catch (error) {
                console.error('Image storage failed:', error);
                reject(error);
            }
        }
    });
};

// Initialize
(async () => {
    await initDB();
    await startVideo();
    await displayImages();
    await updateStorageInfo();
})();

// Add event listener to the checkbox
checkbox.addEventListener('change', toggleCamera);