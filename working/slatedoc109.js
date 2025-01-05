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

.video-container {
    background-color: #000000;
    position: relative;
    border-radius: 0.5rem;
    overflow: hidden;
}

.video-container::before {
    content: '📷'; /* Unicode camera emoji */
    text-shadow: 0 0 20px crimson, 0 0 30px red; /* More intense red glow */
    filter: drop-shadow(0 0 10px red); /* Additional red shadow */
    font-size: 2rem;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
    transition: opacity 0.3s ease;
}

.video-container.video-playing::before {
    opacity: 0;
    pointer-events: none;
}

.video-container::before {
    content: '🎥'; /* Unicode movie camera emoji */
    text-shadow: 0 0 20px crimson, 0 0 30px red; /* More intense red glow */
    filter: drop-shadow(0 0 10px red); /* Additional red shadow */
    font-size: 2rem;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
    transition: opacity 0.3s ease;
}

.video-container.video-playing::before {
    opacity: 0;
    pointer-events: none;
}

.loading-spinner {
    width: 1.5rem;
    height: 1.5rem;
    border: 2px solid #ffffff;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: none;
}

@keyframes spin {
    to {
        transform: translate(-50%, -50%) rotate(360deg);
    }
}

.switch-disabled {
    pointer-events: none;
    opacity: 0.7;
}
`;
document.head.appendChild(style);

// Add scroll to top button
const scrollTopButton = document.createElement('button');
scrollTopButton.className = 'fixed bottom-24 right-6 bg-blue-500 text-white rounded-full p-3 shadow-lg hover:bg-blue-600 focus:outline-none z-50 hidden';
scrollTopButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 15l-6-6-6 6"/>
    </svg>
`;
scrollTopButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
document.body.appendChild(scrollTopButton);

// Show/hide scroll button based on scroll position
window.addEventListener('scroll', () => {
    scrollTopButton.style.display = window.pageYOffset > 100 ? 'block' : 'none';
});

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

// Calculate storage usage
const calculateStorageUsage = async () => {
    const images = await getImages();
    let totalSize = 0;
    for (const image of images) {
        if (image && image.data) {
            totalSize += image.data.size;
        }
    }
    return totalSize;
};

// Delete all images
const deleteAllImages = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
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
const transaction = db.transaction(['images'], 'readonly');
const store = transaction.objectStore('images');
const request = store.getAll();

request.onsuccess = () => resolve(request.result);
request.onerror = () => reject(request.error);
});
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
document.body.className = 'bg-gray-100 min-h-screen overflow-y-auto';
const container = document.createElement('div');
container.className = 'container mx-auto p-4 min-h-screen pb-24'; // Added padding bottom for switch clearance
document.body.appendChild(container);

// Create storage info card
const storageCard = document.createElement('div');
storageCard.className = 'w-full max-w-full bg-white rounded-lg shadow-lg p-4 sticky top-0 z-50 mb-4 storage-usage-card card';  // Removed mb-4
storageCard.innerHTML = `
    <div class="flex justify-between items-center mb-2">
        <div>
            <h3 id="usage-bar-title" class="text-lg font-semibold">Storage Usage</h3>
            <div class="flex space-x-4 text-sm text-gray-500 storage-info-text">
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

// Create color pickers for card background, text, and input background
const colorControlContainer = document.createElement('div');
colorControlContainer.className = 'flex space-x-2 items-center mt-4'; // Added mb-4 for margin bottom

// Background Color Picker
const bgColorPickerContainer = document.createElement('div');
bgColorPickerContainer.className = 'flex-1 flex flex-col';

const bgColorPickerLabel = document.createElement('label');
bgColorPickerLabel.textContent = 'Card Background Color: ';
bgColorPickerLabel.className = 'text-xs mb-1';

const bgColorPicker = document.createElement('input');
bgColorPicker.type = 'color';
bgColorPicker.value = '#FFFFFF'; // Default white
bgColorPicker.className = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50';

// Text Color Picker
const textColorPickerContainer = document.createElement('div');
textColorPickerContainer.className = 'flex-1 flex flex-col';

const textColorPickerLabel = document.createElement('label');
textColorPickerLabel.textContent = 'Card Text Color: ';
textColorPickerLabel.className = 'text-xs mb-1';

const textColorPicker = document.createElement('input');
textColorPicker.type = 'color'; // Changed back to color type
textColorPicker.value = '#000000'; // Default black
textColorPicker.className = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50';

// Input Background Color Picker
const inputBgColorPickerContainer = document.createElement('div');
inputBgColorPickerContainer.className = 'flex-1 flex flex-col';

const inputBgColorPickerLabel = document.createElement('label');
inputBgColorPickerLabel.textContent = 'Input Background Color: ';
inputBgColorPickerLabel.className = 'text-xs mb-1';

const inputBgColorPicker = document.createElement('input');
inputBgColorPicker.type = 'color';
inputBgColorPicker.value = '#FFFFFF'; // Default white
inputBgColorPicker.className = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50';

// Background Color Change Event
bgColorPicker.addEventListener('input', (e) => {
    const cards = document.querySelectorAll('.card, .storage-usage-card, .camera-select-card');
    cards.forEach(card => {
        card.style.backgroundColor = e.target.value;
    });
    localStorage.setItem('cardBackgroundColor', e.target.value);
});

// Text Color Change Event
textColorPicker.addEventListener('input', (e) => {
    const elements = document.querySelectorAll(
        '.card, .storage-usage-card, .camera-select-card, ' +
        'input:not([type="color"]), select, label, ' +
        '.storage-info-text, .image-timestamp, ' +
        '.expand-icon, .delete-icon, .trash-icon, ' +
        '#usage-bar-title'
    );
    elements.forEach(el => {
        el.style.color = e.target.value;
    });
    localStorage.setItem('cardTextColor', e.target.value);
});

// Input Background Color Change Event
inputBgColorPicker.addEventListener('input', (e) => {
    const inputs = document.querySelectorAll('input:not([type="color"]), select');
    inputs.forEach(input => {
        input.style.backgroundColor = e.target.value;
    });
    localStorage.setItem('inputBackgroundColor', e.target.value);
});

// Check for saved color preferences
const savedCardBgColor = localStorage.getItem('cardBackgroundColor');
const savedCardTextColor = localStorage.getItem('cardTextColor');
const savedInputBgColor = localStorage.getItem('inputBackgroundColor');

if (savedCardBgColor) {
    bgColorPicker.value = savedCardBgColor;
    const cards = document.querySelectorAll('.card, .storage-usage-card, .camera-select-card');
    cards.forEach(card => {
        card.style.backgroundColor = savedCardBgColor;
    });
}

if (savedCardTextColor) {
    textColorPicker.value = savedCardTextColor;
    const elements = document.querySelectorAll(
        '.card, .storage-usage-card, .camera-select-card, ' +
        'input:not([type="color"]), select, label, ' +
        '.storage-info-text, .image-timestamp, ' +
        '.expand-icon, .delete-icon, .trash-icon, ' +
        '#usage-bar-title'
    );
    elements.forEach(el => {
        el.style.color = savedCardTextColor;
    });
}

if (savedInputBgColor) {
    inputBgColorPicker.value = savedInputBgColor;
    const inputs = document.querySelectorAll('input:not([type="color"]), select');
    inputs.forEach(input => {
        input.style.backgroundColor = savedInputBgColor;
    });
}

// Enhance color picker functionality
function enhanceColorPicker(pickerContainer, picker) {
    // Create a wrapper to handle click events more robustly
    const wrapper = document.createElement('div');
    wrapper.className = 'relative color-picker-wrapper';
    
    // Create a clickable display element
    const displayElement = document.createElement('div');
    displayElement.className = 'color-picker-display w-full h-10 border rounded cursor-pointer';
    displayElement.style.backgroundColor = picker.value;
    
    // Modify picker styling
    picker.style.width = '100%';
    picker.style.position = 'absolute';
    picker.style.top = '100%';
    picker.style.left = '0';
    picker.style.zIndex = '10';
    picker.style.display = 'none';
    
    // Wrap the picker
    wrapper.appendChild(displayElement);
    wrapper.appendChild(picker);
    
    // Replace the original container content
    pickerContainer.innerHTML = '';
    pickerContainer.appendChild(wrapper);
    
    // Toggle picker visibility
    displayElement.addEventListener('click', (e) => {
        e.stopPropagation();
        if (picker.style.display === 'none') {
            picker.style.display = 'block';
            picker.focus();
        } else {
            picker.style.display = 'none';
        }
    });
    
    // Update display when color changes
    picker.addEventListener('input', () => {
        displayElement.style.backgroundColor = picker.value;
        picker.style.display = 'none';
    });
    
    // Close picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            picker.style.display = 'none';
        }
    });
    
    return wrapper;
}

// Apply enhancement to existing color pickers after they're created
setTimeout(() => {
    enhanceColorPicker(bgColorPickerContainer, bgColorPicker);
    enhanceColorPicker(textColorPickerContainer, textColorPicker);
    enhanceColorPicker(inputBgColorPickerContainer, inputBgColorPicker);
}, 0);

// Append color pickers to container
bgColorPickerContainer.appendChild(bgColorPickerLabel);
bgColorPickerContainer.appendChild(bgColorPicker);

textColorPickerContainer.appendChild(textColorPickerLabel);
textColorPickerContainer.appendChild(textColorPicker);

inputBgColorPickerContainer.appendChild(inputBgColorPickerLabel);
inputBgColorPickerContainer.appendChild(inputBgColorPicker);

colorControlContainer.appendChild(bgColorPickerContainer);
colorControlContainer.appendChild(textColorPickerContainer);
colorControlContainer.appendChild(inputBgColorPickerContainer);

// Add color pickers to Storage Usage card
storageCard.appendChild(colorControlContainer);

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
video.className = 'w-full max-w-full h-auto';
video.autoplay = true;
video.muted = true;
video.playsInline = true;

// Create video container and add video to it
const videoContainer = document.createElement('div');
videoContainer.className = 'video-container w-full max-w-full shadow-lg sticky z-40';
container.appendChild(videoContainer);
videoContainer.appendChild(video);

// Remove previous event listeners
// Add logic to toggle icon based on mediaStream
function updateVideoIconVisibility() {
    if (stream && stream.active) {
        videoContainer.classList.add('video-playing');
    } else {
        videoContainer.classList.remove('video-playing');
    }
}

// Modify startVideo function to call updateVideoIconVisibility
const originalStartVideo = startVideo;
startVideo = async (deviceId = null) => {
    await originalStartVideo(deviceId);
    updateVideoIconVisibility();
};

// Modify toggleCamera function to call updateVideoIconVisibility
const originalToggleCamera = toggleCamera;
toggleCamera = async () => {
    await originalToggleCamera();
    updateVideoIconVisibility();
};

// First, create the gallery 
const gallery = document.createElement('div');
gallery.className = 'w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pb-20';
container.appendChild(gallery);

// Then create the camera selection card
const cameraSelectCard = document.createElement('div');
cameraSelectCard.className = 'w-full max-w-full bg-white rounded-lg shadow-lg p-4 mb-4 camera-select-card card';
cameraSelectCard.innerHTML = `
    <div class="flex items-center justify-between mb-2">
        <div class="flex-grow">
            <select id="camera-select" class="w-full p-2 border rounded-lg mr-2 focus:outline-none focus:border-blue-500">
                <option value="">Loading cameras...</option>
            </select>
        </div>
        <button id="prime-camera" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
            Prime Camera
        </button>
    </div>
`;
container.insertBefore(cameraSelectCard, gallery);

// Get elements
const cameraSelect = document.getElementById('camera-select');
const primeButton = document.getElementById('prime-camera');

// Create a canvas for capturing images (hidden)
const canvas = document.createElement('canvas');
canvas.style.display = 'none';
container.appendChild(canvas);

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

// Add isTransitioning state variable
let isTransitioning = false;

// Create loading spinner
const spinner = document.createElement('div');
spinner.className = 'loading-spinner';
switchDiv.appendChild(spinner);

// Create a span for the switch knob
const knob = document.createElement('span');
knob.className = 'absolute w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ease-in-out top-1 left-1';
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

// Variable to store the current camera ID
let currentCameraId = null;

// Function to start the video stream
async function startVideo(deviceId = null) {
    try {
        // Use stored camera ID if no specific ID is provided
        const targetDeviceId = deviceId || currentCameraId;
        stream = await navigator.mediaDevices.getUserMedia({
            video: targetDeviceId ? { deviceId: { exact: targetDeviceId } } : true
        });
        
        // Store the camera ID if successful
        if (deviceId) {
            currentCameraId = deviceId;
            // Also update the select element to match
            if (cameraSelect) {
                cameraSelect.value = currentCameraId;
            }
        }
        
        video.srcObject = stream;
        console.log('Camera started');
        
        // Update toggle state
        checkbox.checked = true;
        knob.style.transform = 'translateX(24px)';
        switchDiv.className = 'relative w-14 h-8 bg-green-500 rounded-full shadow-inner transition duration-200 ease-in-out';
        
        // Only capture image if metadata loads
        video.onloadedmetadata = async () => {
            const imageBlob = await captureImage();
            await storeImage(imageBlob);
            await displayImages();
        };
        
        // Enumerate cameras after getting permission
        await enumerateCameras();
        
    } catch (error) {
        console.error('Error accessing the camera:', error);
        checkbox.checked = false;
        knob.style.transform = 'translateX(0)';
        switchDiv.className = 'relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out';
    }
}

// Function to toggle the camera
async function toggleCamera() {
    if (isTransitioning) return;
    
    try {
        isTransitioning = true;
        label.classList.add('switch-disabled');
        spinner.style.display = 'block';
        
        if (checkbox.checked) {
            console.log('Turning camera on');
            await startVideo();
            knob.style.transform = 'translateX(24px)';  // 6 units (1.5rem) in pixels
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
        console.error('Camera toggle error:', error);
        checkbox.checked = !checkbox.checked; // Revert checkbox state
    } finally {
        isTransitioning = false;
        label.classList.remove('switch-disabled');
        spinner.style.display = 'none';
    }
}

// Function to enumerate cameras
async function enumerateCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Clear and populate select
        cameraSelect.innerHTML = '';
        if (videoDevices.length === 0) {
            cameraSelect.innerHTML = '<option value="">No cameras found</option>';
            primeButton.disabled = true;
            return;
        }
        
        videoDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${cameraSelect.length + 1}`;
            // Set selected if this is the current camera
            if (device.deviceId === currentCameraId) {
                option.selected = true;
            }
            cameraSelect.appendChild(option);
        });
        
        // If we have a currentCameraId but it wasn't found in the list, select the first camera
        if (currentCameraId && !videoDevices.find(device => device.deviceId === currentCameraId)) {
            currentCameraId = videoDevices[0].deviceId;
            cameraSelect.value = currentCameraId;
        }
        
        primeButton.disabled = false;
    } catch (error) {
        console.error('Error enumerating cameras:', error);
        cameraSelect.innerHTML = '<option value="">Error loading cameras</option>';
        primeButton.disabled = true;
    }
}

// Function to switch camera
async function switchCamera(deviceId) {
    if (!deviceId) return;
    
    try {
        // Stop current stream if it exists
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        // Store the new camera ID before starting
        currentCameraId = deviceId;
        
        // Start new stream with selected camera
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: { exact: deviceId }
            }
        });
        video.srcObject = stream;
        console.log('Switched to new camera');
        
        // Update toggle state if successful
        checkbox.checked = true;
        knob.style.transform = 'translateX(24px)';
        switchDiv.className = 'relative w-14 h-8 bg-green-500 rounded-full shadow-inner transition duration-200 ease-in-out';
        
        // Ensure video icon is hidden when camera is primed
        videoContainer.classList.add('video-playing');
        
    } catch (error) {
        console.error('Error switching camera:', error);
        checkbox.checked = false;
        knob.style.transform = 'translateX(0)';
        switchDiv.className = 'relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out';
        currentCameraId = null; // Reset stored ID on error
    }
}

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
        card.className = 'bg-white rounded-lg shadow-lg p-4 card';
        
        const timeContainer = document.createElement('div');
        timeContainer.className = 'flex items-center justify-between space-x-2 text-sm text-gray-500';
        
        const timestamp = document.createElement('span');
        timestamp.textContent = formatTimestamp(image.timestamp);
        timestamp.className = 'image-timestamp';
        
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
        expandIcon.className = 'expand-icon';
        
        const deleteIcon = createTrashIcon();
        deleteIcon.className = 'trash-icon text-red-500 hover:text-red-700 delete-icon';
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

// storeImage function
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

// Initialize
(async () => {
    await initDB();
    await displayImages();
    await updateStorageInfo();
    
    // Just enumerate cameras without starting video
    try {
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        initialStream.getTracks().forEach(track => track.stop());
        await enumerateCameras();
    } catch (error) {
        console.error('Error getting initial camera permission:', error);
        cameraSelect.innerHTML = '<option value="">Camera permission denied</option>';
        primeButton.disabled = true;
    }
})();

// Add event listener to the checkbox
checkbox.addEventListener('change', toggleCamera);

// Add event listeners for camera selection
primeButton.addEventListener('click', async () => {
    const selectedDeviceId = cameraSelect.value;
    if (selectedDeviceId) {
        await switchCamera(selectedDeviceId);
    }
});

// Request permission and enumerate cameras on page load
navigator.mediaDevices.getUserMedia({ video: true })
    .then(async (initialStream) => {
        initialStream.getTracks().forEach(track => track.stop());
        await enumerateCameras();
    })
    .catch(error => {
        console.error('Error getting initial camera permission:', error);
        cameraSelect.innerHTML = '<option value="">Camera permission denied</option>';
        primeButton.disabled = true;
    });

// Add event listener for camera selection
cameraSelect.addEventListener('change', async () => {
    const selectedDeviceId = cameraSelect.value;
    if (selectedDeviceId) {
        await switchCamera(selectedDeviceId);
    }
});
