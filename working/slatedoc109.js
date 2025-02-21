// Clear the existing content of the page
document.body.innerHTML = '';

// Create a style element for Tailwind CSS and custom styles
const style = document.createElement('style');
style.innerHTML = `
@import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');

.card, .storage-usage-card, .camera-select-card, .video-container {
    border-radius: 0.5rem;
    outline-offset: 2px;
}

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

// Check for saved color preferences (move these to the top)
const savedCardBgColor = localStorage.getItem('cardBackgroundColor');
const savedCardTextColor = localStorage.getItem('cardTextColor');
const savedInputBgColor = localStorage.getItem('inputBackgroundColor');

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

// Create a reset icon function
const createResetIcon = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'reset-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.style.cursor = 'pointer';
    
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8');
    
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M3 3v5h5');
    
    svg.appendChild(path1);
    svg.appendChild(path2);
    
    return svg;
};

// Create export icon SVG
const createExportIcon = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'export-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.style.cursor = 'pointer';
    
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4');
    
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M7 10l5 5 5-5');
    
    const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path3.setAttribute('d', 'M12 15V3');
    
    svg.appendChild(path1);
    svg.appendChild(path2);
    svg.appendChild(path3);
    
    return svg;
};

// Create import icon SVG
const createImportIcon = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'import-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.style.cursor = 'pointer';
    
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4');
    
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M7 10l5-5 5 5');
    
    const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path3.setAttribute('d', 'M12 4v12');
    
    svg.appendChild(path1);
    svg.appendChild(path2);
    svg.appendChild(path3);
    
    return svg;
};

// Reset colors functionality
const resetColors = () => {
    const defaultColors = {
        cardBackground: '#FFFFFF',
        cardText: '#000000',
        inputBackground: '#FFFFFF'
    };

    // Update color pickers
    bgColorPicker.value = defaultColors.cardBackground;
    textColorPicker.value = defaultColors.cardText;
    inputBgColorPicker.value = defaultColors.inputBackground;

    // Apply background color to all cards including gallery cards
    const allCards = document.querySelectorAll('.card, .storage-usage-card, .camera-select-card');
    allCards.forEach(card => {
        card.style.backgroundColor = defaultColors.cardBackground;
    });

    // Apply text color and borders to all elements including video container
    const elements = document.querySelectorAll(
        '.card, .storage-usage-card, .camera-select-card, .video-container, ' +
        'input:not([type="color"]), select, label, ' +
        '.storage-info-text, .image-timestamp, ' +
        '.expand-icon, .delete-icon, .trash-icon, .reset-icon, .export-icon, .import-icon, ' +
        '#reset-colors, #usage-bar-title'
    );
    elements.forEach(el => {
        el.style.color = defaultColors.cardText;
        // Clear old outline/border first, then add new border
        if (el.classList.contains('card') || 
            el.classList.contains('storage-usage-card') || 
            el.classList.contains('camera-select-card') ||
            el.classList.contains('video-container')) {
            el.style.outline = 'none';  // Clear old outline
            el.style.border = `1px solid ${defaultColors.cardText}`;
            el.style.borderRadius = '0.5rem';
        }
    });

    // Apply input background color
    const inputs = document.querySelectorAll('input:not([type="color"]), select');
    inputs.forEach(input => {
        input.style.backgroundColor = defaultColors.inputBackground;
    });

    // Update color picker display elements
    document.querySelectorAll('.color-picker-display').forEach(display => {
        if (display.parentElement.parentElement === bgColorPickerContainer) {
            display.style.backgroundColor = defaultColors.cardBackground;
        } else if (display.parentElement.parentElement === textColorPickerContainer) {
            display.style.backgroundColor = defaultColors.cardText;
        } else if (display.parentElement.parentElement === inputBgColorPickerContainer) {
            display.style.backgroundColor = defaultColors.inputBackground;
        }
    });

    // Clear localStorage
    localStorage.removeItem('cardBackgroundColor');
    localStorage.removeItem('cardTextColor');
    localStorage.removeItem('inputBackgroundColor');
};

// JSZip library
const jsZipScript = document.createElement('script');
jsZipScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
document.head.appendChild(jsZipScript);

// Create a container for all elements
document.body.className = 'bg-gray-100 min-h-screen overflow-y-auto';
const container = document.createElement('div');
container.className = 'container mx-auto p-4 min-h-screen pb-24'; // Added padding bottom for switch clearance
document.body.appendChild(container);

// Create storage info card
const storageCard = document.createElement('div');
storageCard.className = 'w-full max-w-full bg-white rounded-lg shadow-lg p-4 sticky top-0 z-50 mb-4 storage-usage-card card';
storageCard.style.outline = '1px solid ' + (savedCardTextColor || '#000000');
storageCard.style.outlineOffset = '1px';
storageCard.innerHTML = `
    <div class="flex justify-between items-center mb-2">
        <div>
            <h3 id="usage-bar-title" class="text-lg font-semibold">Storage Usage</h3>
            <div class="flex space-x-4 text-sm text-gray-500 storage-info-text">
                <span id="storage-size">0 MB</span>
                <span id="image-count">0 images</span>
            </div>
        </div>
        <div class="flex items-center space-x-3">
            <button id="import-all" class="text-blue-500 hover:text-blue-700 focus:outline-none" title="Import Images">
                ${createImportIcon().outerHTML}
            </button>
            <button id="export-all" class="text-blue-500 hover:text-blue-700 focus:outline-none" title="Export All Images">
                ${createExportIcon().outerHTML}
            </button>
            <button id="reset-colors" class="text-blue-500 hover:text-blue-700 focus:outline-none" title="Reset Colors">
                ${createResetIcon().outerHTML}
            </button>
            <button id="delete-all" class="text-red-500 hover:text-red-700 focus:outline-none" title="Delete All Images">
                ${createTrashIcon().outerHTML}
            </button>
        </div>
    </div>
    <div class="usage-bar">
        <div id="usage-fill" class="usage-fill" style="width: 0%"></div>
    </div>
`;

// After creating storageCard and setting its innerHTML...
if (savedCardBgColor) {
    storageCard.style.backgroundColor = savedCardBgColor;
}

// Create hidden file input for import
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.zip';
fileInput.style.display = 'none';
fileInput.addEventListener('change', (e) => importImages(e.target.files));
document.body.appendChild(fileInput);

// Add export/import functions first
const exportAllImages = async () => {
    const images = await getImages();
    if (images.length === 0) {
        alert('No images to export');
        return;
    }

    try {
        const zip = new JSZip();
        
        // Add each image to the zip
        for (const image of images) {
            const fileName = `image_${formatTimestamp(image.timestamp).replace(/[:.]/g, '-')}.jpg`;
            zip.file(fileName, image.data);
        }
        
        // Generate and download the zip file
        const zipBlob = await zip.generateAsync({type: 'blob'});
        const downloadUrl = URL.createObjectURL(zipBlob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = `camera_captures_${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('Export error:', error);
        alert('Error exporting images. Please try again.');
    }
};

const importImages = async (files) => {
    if (!files.length) return;

    try {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(files[0]);
        
        let importCount = 0;
        // Process each file in the zip
        for (const [fileName, file] of Object.entries(zipContent.files)) {
            if (!fileName.endsWith('.jpg')) continue;
            
            const blob = await file.async('blob');
            const timestamp = Date.now() + performance.now() % 1 + importCount;
            await storeImage(blob);
            importCount++;
        }
        
        await displayImages();
        await updateStorageInfo();
        alert(`Successfully imported ${importCount} images`);
    } catch (error) {
        console.error('Import error:', error);
        alert('Error importing images. Please make sure you selected a valid zip file.');
    }
};

// Add event listeners AFTER adding storageCard to container
container.appendChild(storageCard);

// Now add the event listeners
document.getElementById('import-all').addEventListener('click', () => fileInput.click());
document.getElementById('export-all').addEventListener('click', exportAllImages);

// Create color pickers container
const colorControlContainer = document.createElement('div');
colorControlContainer.className = 'flex space-x-2 items-center mt-4';

// Create background color picker container and elements
const bgColorPickerContainer = document.createElement('div');
bgColorPickerContainer.className = 'flex-1 flex flex-col';

const bgColorPickerLabel = document.createElement('label');
bgColorPickerLabel.textContent = 'Card Background Color: ';
bgColorPickerLabel.className = 'text-xs mb-1';

const bgColorPicker = document.createElement('input');
bgColorPicker.type = 'color';
bgColorPicker.value = '#FFFFFF'; // Default white
bgColorPicker.className = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50';

// Create text color picker container and elements
const textColorPickerContainer = document.createElement('div');
textColorPickerContainer.className = 'flex-1 flex flex-col';

const textColorPickerLabel = document.createElement('label');
textColorPickerLabel.textContent = 'Card Text Color: ';
textColorPickerLabel.className = 'text-xs mb-1';

const textColorPicker = document.createElement('input');
textColorPicker.type = 'color';
textColorPicker.value = '#000000'; // Default black
textColorPicker.className = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50';

// Create input background color picker container and elements
const inputBgColorPickerContainer = document.createElement('div');
inputBgColorPickerContainer.className = 'flex-1 flex flex-col';

const inputBgColorPickerLabel = document.createElement('label');
inputBgColorPickerLabel.textContent = 'Input Background Color: ';
inputBgColorPickerLabel.className = 'text-xs mb-1';

const inputBgColorPicker = document.createElement('input');
inputBgColorPicker.type = 'color';
inputBgColorPicker.value = '#FFFFFF'; // Default white
inputBgColorPicker.className = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50';

// Apply saved text color if it exists
if (savedCardTextColor) {
    storageCard.style.color = savedCardTextColor;
    storageCard.querySelector('#usage-bar-title').style.color = savedCardTextColor;
    storageCard.querySelector('.storage-info-text').style.color = savedCardTextColor;
    const allIcons = storageCard.querySelectorAll('.trash-icon, .reset-icon, .export-icon, .import-icon');
    allIcons.forEach(icon => {
        icon.style.color = savedCardTextColor;
    });
    
    textColorPicker.value = savedCardTextColor;
    
    const elements = document.querySelectorAll(
        '.card, .storage-usage-card, .camera-select-card, ' +
        'input:not([type="color"]), select, label, ' +
        '.storage-info-text, .image-timestamp, ' +
        '.expand-icon, .delete-icon, .trash-icon, .reset-icon, .export-icon, .import-icon, ' +
        '#reset-colors, #usage-bar-title'
    );
    elements.forEach(el => {
        el.style.color = savedCardTextColor;
        if (el.classList.contains('card') || 
            el.classList.contains('storage-usage-card') || 
            el.classList.contains('camera-select-card')) {
            el.style.outline = `1px solid ${savedCardTextColor}`;
            el.style.outlineOffset = '1px';
        }
    });
}

// Background Color Picker
bgColorPickerContainer.className = 'flex-1 flex flex-col';

bgColorPickerLabel.textContent = 'Card Background Color: ';
bgColorPickerLabel.className = 'text-xs mb-1';

bgColorPicker.type = 'color';
bgColorPicker.value = '#FFFFFF'; // Default white
bgColorPicker.className = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50';

// Text Color Picker
textColorPickerContainer.className = 'flex-1 flex flex-col';
textColorPickerLabel.textContent = 'Card Text Color: ';
textColorPickerLabel.className = 'text-xs mb-1';

textColorPicker.type = 'color'; // Changed back to color type
textColorPicker.value = '#000000'; // Default black
textColorPicker.className = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50';

// Input Background Color Picker
inputBgColorPickerContainer.className = 'flex-1 flex flex-col';
inputBgColorPickerLabel.textContent = 'Input Background Color: ';
inputBgColorPickerLabel.className = 'text-xs mb-1';inputBgColorPicker.type = 'color';
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
        '.card, .storage-usage-card, .camera-select-card, .video-container, ' +
        'input:not([type="color"]), select, label, ' +
        '.storage-info-text, .image-timestamp, ' +
        '.expand-icon, .delete-icon, .trash-icon, .reset-icon, .export-icon, .import-icon, ' +  // Added export-icon and import-icon
        '#reset-colors, #usage-bar-title'
    );
    elements.forEach(el => {
        el.style.color = e.target.value;
        if (el.classList.contains('card') || 
            el.classList.contains('storage-usage-card') || 
            el.classList.contains('camera-select-card') ||
            el.classList.contains('video-container')) {
            el.style.outline = 'none';
            el.style.border = `1px solid ${e.target.value}`;
            el.style.borderRadius = '0.5rem';
        }
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
    wrapper.style.cursor = 'pointer';
    
    // Create a clickable display element
    const displayElement = document.createElement('button');  // Changed to button for better click handling
    displayElement.type = 'button';  // Prevent form submission
    displayElement.className = 'color-picker-display w-full h-10 border rounded cursor-pointer';
    displayElement.style.backgroundColor = picker.value;
    displayElement.style.outline = 'none';  // Remove default button outline
    
    // Modify picker styling
    picker.style.width = '100%';
    picker.style.position = 'absolute';
    picker.style.top = 'calc(100% + 5px)';  // Add small gap
    picker.style.left = '0';
    picker.style.zIndex = '50';  // Increased z-index
    picker.style.display = 'none';
    picker.style.opacity = '1';  // Ensure picker is visible
    
    // Wrap the picker
    wrapper.appendChild(displayElement);
    wrapper.appendChild(picker);
    
    // Replace the original container content
    pickerContainer.innerHTML = '';
    pickerContainer.appendChild(wrapper);

    // Function to toggle picker
    const togglePicker = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isVisible = picker.style.display === 'block';
        picker.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            picker.focus();
        }
    };
    
    // Add click event to both wrapper and display element
    wrapper.addEventListener('click', togglePicker);
    displayElement.addEventListener('click', togglePicker);
    
    // Update display when color changes
    picker.addEventListener('input', () => {
        displayElement.style.backgroundColor = picker.value;
    });

    picker.addEventListener('change', () => {
        displayElement.style.backgroundColor = picker.value;
        picker.style.display = 'none';
    });
    
    // Close picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            picker.style.display = 'none';
        }
    });

    // Prevent clicks on the picker from closing it
    picker.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    return wrapper;
}

// Apply enhancement after a short delay to ensure DOM is ready
setTimeout(() => {
    enhanceColorPicker(bgColorPickerContainer, bgColorPicker);
    enhanceColorPicker(textColorPickerContainer, textColorPicker);
    enhanceColorPicker(inputBgColorPickerContainer, inputBgColorPicker);
}, 100);

// Append all picker elements to their containers
bgColorPickerContainer.appendChild(bgColorPickerLabel);
bgColorPickerContainer.appendChild(bgColorPicker);

textColorPickerContainer.appendChild(textColorPickerLabel);
textColorPickerContainer.appendChild(textColorPicker);

inputBgColorPickerContainer.appendChild(inputBgColorPickerLabel);
inputBgColorPickerContainer.appendChild(inputBgColorPicker);

// Add all picker containers to the main color control container
colorControlContainer.appendChild(bgColorPickerContainer);
colorControlContainer.appendChild(textColorPickerContainer);
colorControlContainer.appendChild(inputBgColorPickerContainer);

// Add color control container to storage card
storageCard.appendChild(colorControlContainer);

// Add storage card to main container
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
videoContainer.style.outline = '1px solid ' + (savedCardTextColor || '#000000');
videoContainer.style.outlineOffset = '1px';
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
cameraSelectCard.style.outline = '1px solid ' + (savedCardTextColor || '#000000');
cameraSelectCard.style.outlineOffset = '1px';
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

// After setting cameraSelectCard innerHTML...
if (savedCardBgColor) {
    cameraSelectCard.style.backgroundColor = savedCardBgColor;
}
if (savedCardTextColor) {
    cameraSelectCard.style.color = savedCardTextColor;
    const select = cameraSelectCard.querySelector('select');
    if (select) {
        select.style.color = savedCardTextColor;
    }
}
if (savedInputBgColor) {
    const select = cameraSelectCard.querySelector('select');
    if (select) {
        select.style.backgroundColor = savedInputBgColor;
    }
}

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

// Simplified fullscreen function
const showFullscreen = (imgSrc) => {
    try {
        const overlay = document.createElement('div');
        overlay.className = 'fullscreen-overlay';

        const img = document.createElement('img');
        img.className = 'fullscreen-image';
        img.src = imgSrc;

        img.onerror = () => {
            overlay.remove();
            URL.revokeObjectURL(imgSrc);
        };

        overlay.onclick = () => {
            overlay.remove();
            URL.revokeObjectURL(imgSrc);
        };

        overlay.appendChild(img);
        document.body.appendChild(overlay);
    } catch (error) {
        console.error('Fullscreen error:', error);
    }
};

// Capture image function - make more robust
const captureImage = () => {
    return new Promise((resolve, reject) => {
        try {
            requestAnimationFrame(() => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const context = canvas.getContext('2d');
                context.drawImage(video, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create blob'));
                    }
                }, 'image/jpeg', 0.95);
            });
        } catch (error) {
            reject(error);
        }
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

// Modified toggleCamera function
async function toggleCamera() {
    if (isTransitioning) return;
    
    try {
        isTransitioning = true;
        label.classList.add('switch-disabled');
        spinner.style.display = 'block';
        
        if (checkbox.checked) {
            console.log('Turning camera on');
            await startVideo();
            knob.style.transform = 'translateX(24px)';
            switchDiv.className = 'relative w-14 h-8 bg-green-500 rounded-full shadow-inner transition duration-200 ease-in-out';
        } else {
            console.log('Turning camera off');
            if (stream) {
                try {
                    // Take final image before stopping stream
                    const imageBlob = await captureImage().catch(err => null);
                    
                    // Stop stream first
                    stream.getTracks().forEach(track => track.stop());
                    video.srcObject = null;
                    console.log('Camera stopped');
                    
                    // Then store image if we got one
                    if (imageBlob) {
                        await storeImage(imageBlob);
                        await displayImages();
                    }
                } catch (error) {
                    console.error('Error during camera shutdown:', error);
                }
            }
            knob.style.transform = 'translateX(0)';
            switchDiv.className = 'relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out';
        }
    } catch (error) {
        console.error('Camera toggle error:', error);
        checkbox.checked = !checkbox.checked;
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

    // Create thumbnail function - simplified for iOS 14
    const createThumbnail = async (blob) => {
        return new Promise((resolve, reject) => {
            try {
                const url = URL.createObjectURL(blob);
                const img = new Image();
                
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = 64;  // Fixed thumbnail width
                        canvas.height = Math.floor(64 * (img.height / img.width));
                        
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        
                        canvas.toBlob((thumbBlob) => {
                            URL.revokeObjectURL(url);
                            if (thumbBlob) {
                                resolve(URL.createObjectURL(thumbBlob));
                            } else {
                                resolve(url);
                            }
                        }, 'image/jpeg', 0.8);
                    } catch (err) {
                        URL.revokeObjectURL(url);
                        resolve(URL.createObjectURL(blob));
                    }
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    resolve(URL.createObjectURL(blob));
                };
                
                img.src = url;
            } catch (error) {
                resolve(URL.createObjectURL(blob));
            }
        });
    };

    for (const image of images.sort((a, b) => b.timestamp - a.timestamp)) {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-lg p-4 card';

        // Apply saved background color if it exists
        const savedBgColor = localStorage.getItem('cardBackgroundColor');
        if (savedBgColor) {
            card.style.backgroundColor = savedBgColor;
        }
        
        // Apply saved text color if it exists
        const savedTextColor = localStorage.getItem('cardTextColor');
        if (savedTextColor) {
            card.style.color = savedTextColor;
        }

        // Apply saved styles
        if (savedBgColor) {
            card.style.backgroundColor = savedBgColor;
        }
        if (savedTextColor) {
            card.style.color = savedTextColor;
            card.style.outline = `1px solid ${savedTextColor}`;
            card.style.outlineOffset = '1px';
        } else {
            card.style.outline = '1px solid #000000';
            card.style.outlineOffset = '1px';
        }


        const timestamp = document.createElement('span');
        timestamp.textContent = formatTimestamp(image.timestamp);
        timestamp.className = 'image-timestamp';
        if (savedTextColor) {
            timestamp.style.color = savedTextColor;
        }
        
        const timeContainer = document.createElement('div');
        timeContainer.className = 'flex items-center justify-between space-x-2 text-sm text-gray-500';
        

        
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
        if (savedTextColor) {
            expandIcon.style.color = savedTextColor;
        }
        
        const deleteIcon = createTrashIcon();
        deleteIcon.className = 'trash-icon text-red-500 hover:text-red-700 delete-icon';
        if (savedTextColor) {
            deleteIcon.style.color = savedTextColor;
        }
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

        if (savedTextColor) {
            card.style.color = savedTextColor;
            timestamp.style.color = savedTextColor;
            expandIcon.style.color = savedTextColor;
        }

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

// Add event listener to reset button
document.getElementById('reset-colors').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all colors to default?')) {
        resetColors();
    }
});
