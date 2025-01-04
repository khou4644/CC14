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

// Enhanced IndexedDB Initialization with Broader Compatibility
const initDB = () => {
    return new Promise((resolve, reject) => {
        // Check for IndexedDB support with more comprehensive fallback
        if (!window.indexedDB) {
            console.warn('IndexedDB not supported. Falling back to alternative storage.');
            resolve({
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
            });
            return;
        }

        // Attempt to open IndexedDB with more robust error handling
        const request = indexedDB.open('CameraDB', 1);
        
        request.onerror = (event) => {
            console.error('IndexedDB initialization error:', event.target.error);
            reject(event.target.error);
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
                    autoIncrement: true 
                });
            }
        };
    });
};

// Retrieve images from IndexedDB with fallback
const getImages = async () => {
    const db = await initDB();
    
    // Check if it's a fallback storage object
    if (!db.transaction) {
        return db.getItem('images') || [];
    }
    
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        } catch (error) {
            console.error('Image retrieval error:', error);
            resolve([]);
        }
    });
};

// Delete all images with fallback support
const deleteAllImages = async () => {
    const db = await initDB();
    
    // Check if it's a fallback storage object
    if (!db.transaction) {
        db.setItem('images', []);
        return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (error) {
            console.error('Image deletion error:', error);
            resolve();
        }
    });
};

// Store image with enhanced compatibility
const storeImage = async (imageBlob) => {
    const db = await initDB();
    const timestamp = Date.now();
    
    // Check if it's a fallback storage object
    if (!db.transaction) {
        try {
            const reader = new FileReader();
            return new Promise((resolve) => {
                reader.onloadend = () => {
                    const base64Image = reader.result;
                    const images = db.getItem('images') || [];
                    images.push({ 
                        timestamp, 
                        data: base64Image 
                    });
                    db.setItem('images', images);
                    updateStorageInfo();
                    resolve();
                };
                reader.readAsDataURL(imageBlob);
            });
        } catch (error) {
            console.error('Fallback image storage failed:', error);
            return Promise.resolve();
        }
    }
    
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            
            const image = {
                timestamp: timestamp + (performance.now() % 1),
                data: imageBlob
            };
            
            const request = store.add(image);
            request.onsuccess = async () => {
                await updateStorageInfo();
                resolve();
            };
            request.onerror = () => reject(request.error);
        } catch (error) {
            console.error('Image storage error:', error);
            resolve();
        }
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

// Capture image with more robust error handling
const captureImage = () => {
    return new Promise((resolve, reject) => {
        try {
            requestAnimationFrame(() => {
                try {
                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 480;
                    const context = canvas.getContext('2d');
                    context.drawImage(video, 0, 0);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            console.warn('Failed to create image blob');
                            reject(new Error('Blob creation failed'));
                        }
                    }, 'image/jpeg', 0.95);
                } catch (drawError) {
                    console.error('Error drawing video frame:', drawError);
                    reject(drawError);
                }
            });
        } catch (error) {
            console.error('Capture image error:', error);
            reject(error);
        }
    });
};

// Start video with improved error handling
async function startVideo() {
    try {
        // Add more flexible video constraints
        const constraints = {
            video: { 
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                facingMode: 'environment'
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        console.log('Camera started');
        
        return new Promise((resolve, reject) => {
            video.onloadedmetadata = async () => {
                try {
                    const imageBlob = await captureImage();
                    await storeImage(imageBlob);
                    await displayImages();
                    resolve();
                } catch (captureError) {
                    console.error('Capture error after video start:', captureError);
                    reject(captureError);
                }
            };

            // Add error handling for video stream
            video.onerror = (error) => {
                console.error('Video stream error:', error);
                reject(error);
            };
        });
    } catch (error) {
        console.error('Error accessing the camera: ', error);
        document.body.innerHTML = `
            <h1 class="text-red-500">
                Error accessing the camera: ${error.message || 'Unknown error'}
            </h1>
        `;
        throw error;
    }
}

// Toggle camera with more comprehensive error handling
async function toggleCamera() {
    try {
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
    } catch (error) {
        console.error('Toggle camera error:', error);
        // Reset checkbox and switch state
        checkbox.checked = false;
        knob.style.transform = 'translateX(0)';
        switchDiv.className = 'relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out';
    }
}

// Display images with improved error handling
const displayImages = async () => {
    try {
        const images = await getImages();
        gallery.innerHTML = '';

        const createThumbnail = async (blob) => {
            return new Promise((resolve, reject) => {
                try {
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
                    img.onerror = () => {
                        console.warn('Thumbnail image load failed');
                        resolve(null);
                    };
                    img.src = blob instanceof Blob 
                        ? URL.createObjectURL(blob) 
                        : blob; // Handle base64 or object URL
                } catch (error) {
                    console.error('Thumbnail creation error:', error);
                    reject(error);
                }
            });
        };

        for (const image of images.sort((a, b) => b.timestamp - a.timestamp)) {
            try {
                const thumbnailSrc = await createThumbnail(image.data);
                if (!thumbnailSrc) continue;

                const card = document.createElement('div');
                card.className = 'bg-white rounded-lg shadow-lg p-4';
                
                const img = document.createElement('img');
                img.src = thumbnailSrc;
                img.className = 'w-full h-auto rounded-lg mb-2 cursor-pointer';
                img.addEventListener('click', () => showFullscreen(
                    image.data instanceof Blob 
                        ? URL.createObjectURL(image.data) 
                        : image.data
                ));
                card.appendChild(img);

                const timeContainer = document.createElement('div');
                timeContainer.className = 'text-sm text-gray-500 flex justify-between items-center';
                timeContainer.innerHTML = `
                    <span>${new Date(image.timestamp).toLocaleString()}</span>
                    <span class="cursor-pointer text-red-500 hover:text-red-700">
                        ${createTrashIcon().outerHTML}
                    </span>
                `;
                
                // Add delete functionality to individual image
                const trashIcon = timeContainer.querySelector('.trash-icon');
                trashIcon.addEventListener('click', async () => {
                    try {
                        const db = await initDB();
                        if (db.transaction) {
                            // IndexedDB delete
                            const transaction = db.transaction(['images'], 'readwrite');
                            const store = transaction.objectStore('images');
                            store.delete(image.timestamp);
                        } else {
                            // Fallback storage delete
                            const images = db.getItem('images') || [];
                            const filteredImages = images.filter(
                                img => img.timestamp !== image.timestamp
                            );
                            db.setItem('images', filteredImages);
                        }
                        await displayImages();
                    } catch (error) {
                        console.error('Image deletion error:', error);
                    }
                });

                card.appendChild(timeContainer);
                gallery.appendChild(card);
            } catch (imageError) {
                console.error('Error processing image:', imageError);
            }
        }
        
        await updateStorageInfo();
    } catch (error) {
        console.error('Display images error:', error);
    }
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