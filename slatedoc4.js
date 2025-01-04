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

#usage-bar-title{
    color: #000000;
}

.usage-fill {
    height: 100%;
    background-color: #3b82f6;
    transition: width 0.3s ease;
}
`;
document.head.appendChild(style);

//------------------------------------------------------------------------------
// Utility Functions (outside initialization to avoid redefinition)
//------------------------------------------------------------------------------

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

//------------------------------------------------------------------------------
// Database Functions
//------------------------------------------------------------------------------

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

// Get images from DB
const getImages = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['images'], 'readonly');
        const store = transaction.objectStore('images');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Store image in DB
const storeImage = async (imageBlob) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        
        const image = {
            timestamp: Date.now() + performance.now() % 1,
            data: imageBlob
        };
        
        const request = store.add(image);
        request.onsuccess = async () => {
            await updateStorageInfo();
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
};

//------------------------------------------------------------------------------
// Main Application Initialization
//------------------------------------------------------------------------------

function initializeCameraApp() {
    // Cleanup function to remove existing elements and listeners
    const cleanup = () => {
        // Remove any existing elements
        document.body.innerHTML = '';
        
        // Remove existing style if it exists
        const existingStyle = document.querySelector('#camera-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
    };

    // Run cleanup before initializing
    cleanup();

    // Create and initialize UI elements
    function createUI() {
        // Create style element
        const style = document.createElement('style');
        style.id = 'camera-styles';
        style.innerHTML = `
            @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');
            .expand-icon, .trash-icon {
                width: 16px;
                height: 16px;
                cursor: pointer;
            }
            /* Add rest of your styles here */
        `;
        document.head.appendChild(style);

        // Create main container
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

        // Create gallery
        const gallery = document.createElement('div');
        gallery.className = 'w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4';
        container.appendChild(gallery);

        // Create camera switch
        const switchLabel = document.createElement('label');
        switchLabel.className = 'camera-switch-label flex items-center cursor-pointer fixed bottom-10 right-6';
        
        const switchInput = document.createElement('input');
        switchInput.type = 'checkbox';
        switchInput.className = 'hidden';
        
        const switchDiv = document.createElement('div');
        switchDiv.className = 'relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out';
        
        const knob = document.createElement('span');
        knob.className = 'absolute w-6 h-6 bg-white rounded-full shadow transform transition duration-200 ease-in-out';
        
        switchDiv.appendChild(knob);
        switchLabel.appendChild(switchInput);
        switchLabel.appendChild(switchDiv);
        document.body.appendChild(switchLabel);

        // Add event listener for camera toggle
        switchInput.addEventListener('change', async () => {
            if (switchInput.checked) {
                console.log('Turning camera on');
                await startVideo(video, canvas);
                knob.style.transform = 'translateX(100%)';
                switchDiv.className = 'relative w-14 h-8 bg-green-500 rounded-full shadow-inner transition duration-200 ease-in-out';
            } else {
                console.log('Turning camera off');
                try {
                    const imageBlob = await captureImage(video, canvas);
                    await storeImage(imageBlob);
                    video.srcObject.getTracks().forEach(track => track.stop());
                    video.srcObject = null;
                    await displayImages(gallery);
                } catch (error) {
                    console.error('Error during camera shutdown:', error);
                }
                knob.style.transform = 'translateX(0)';
                switchDiv.className = 'relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out';
            }
        });

        return {
            video,
            canvas,
            gallery
        };
    }

    // Create UI and get references
    const ui = createUI();

    // Initialize the app
    (async () => {
        await initDB();
        await displayImages(ui.gallery);
    })();
}

// Call the initialization function
initializeCameraApp();