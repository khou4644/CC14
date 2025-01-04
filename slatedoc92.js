// Configuration
const CONFIG = {
  MAX_STORAGE_MB: 50,
  THUMBNAIL_WIDTH: 64,
  IMAGE_QUALITY: 0.95,
  THUMBNAIL_QUALITY: 0.85
};

// Database Manager
class DatabaseManager {
  constructor() {
    this.dbName = 'CameraDB';
    this.version = 1;
    this.storeName = 'images';
  }

  async init() {
    try {
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'timestamp' });
          }
        };
      });
      return true;
    } catch (error) {
      console.error('IndexedDB initialization failed:', error);
      return false;
    }
  }

  async getImages() {
    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      return await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Get images failed:', error);
      return [];
    }
  }

  async deleteAllImages() {
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
      });
      return true;
    } catch (error) {
      console.error('Delete all images failed:', error);
      return false;
    }
  }

  async storeImage(imageBlob) {
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const image = {
        timestamp: Date.now() + performance.now() % 1,
        data: imageBlob
      };
      
      await new Promise((resolve, reject) => {
        const request = store.add(image);
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
      });
      return true;
    } catch (error) {
      console.error('Store image failed:', error);
      return false;
    }
  }

  async calculateStorageUsage() {
    const images = await this.getImages();
    return images.reduce((total, image) => total + image.data.size, 0);
  }
}

// Camera Manager
class CameraManager {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
  }

  async init(video, canvas) {
    this.video = video;
    this.canvas = canvas;
    
    // iOS 14 compatibility settings
    this.video.setAttribute('playsinline', true);
    this.video.setAttribute('webkit-playsinline', true);
    this.video.muted = true;
    this.video.autoplay = true;
  }

  async start() {
    try {
      const constraints = {
        video: {
          facingMode: 'environment'
        }
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await new Promise(resolve => this.video.onloadedmetadata = resolve);
      await this.video.play();
      return true;
    } catch (error) {
      console.error('Camera start failed:', error);
      return false;
    }
  }

  async stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.video.srcObject = null;
      this.stream = null;
    }
  }

  async captureImage() {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        const context = this.canvas.getContext('2d');
        context.drawImage(this.video, 0, 0);
        
        this.canvas.toBlob(
          blob => resolve(blob),
          'image/jpeg',
          CONFIG.IMAGE_QUALITY
        );
      });
    });
  }
}

// UI Manager
class UIManager {
  constructor(dbManager, cameraManager) {
    this.dbManager = dbManager;
    this.cameraManager = cameraManager;
    this.elements = {};
    this.initializeUI();
  }

  createIcon(type) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `${type}-icon`);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    if (type === 'trash') {
      const paths = [
        'M3 6h18',
        'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
        'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'
      ];
      paths.forEach(d => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        svg.appendChild(path);
      });
    } else if (type === 'expand') {
      const paths = [
        'M15 3h6v6',
        'M9 21H3v-6',
        'M21 3l-7 7',
        'M3 21l7-7'
      ];
      paths.forEach(d => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        svg.appendChild(path);
      });
    }

    return svg;
  }

  formatTimestamp(timestamp) {
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
  }

  async createThumbnail(blob) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const aspectRatio = img.width / img.height;
        const thumbnailHeight = CONFIG.THUMBNAIL_WIDTH / aspectRatio;
        
        canvas.width = CONFIG.THUMBNAIL_WIDTH;
        canvas.height = thumbnailHeight;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, CONFIG.THUMBNAIL_WIDTH, thumbnailHeight);
        
        canvas.toBlob((thumbnailBlob) => {
          URL.revokeObjectURL(img.src);
          resolve(URL.createObjectURL(thumbnailBlob));
        }, 'image/jpeg', CONFIG.THUMBNAIL_QUALITY);
      };
      img.src = URL.createObjectURL(blob);
    });
  }

  showFullscreen(imgSrc) {
    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-overlay';
    
    const img = document.createElement('img');
    img.className = 'fullscreen-image';
    img.src = imgSrc;
    
    overlay.appendChild(img);
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  }

  async updateStorageInfo() {
    const usageInBytes = await this.dbManager.calculateStorageUsage();
    const usageInMB = (usageInBytes / (1024 * 1024)).toFixed(2);
    const imageCount = (await this.dbManager.getImages()).length;
    
    this.elements.storageSize.textContent = `${usageInMB} MB`;
    this.elements.imageCount.textContent = `${imageCount} images`;
    
    const usagePercentage = (usageInBytes / (CONFIG.MAX_STORAGE_MB * 1024 * 1024)) * 100;
    this.elements.usageBar.style.width = `${Math.min(usagePercentage, 100)}%`;
  }

  async displayImages() {
    const images = await this.dbManager.getImages();
    this.elements.gallery.innerHTML = '';

    for (const image of images.sort((a, b) => b.timestamp - a.timestamp)) {
      const card = this.createImageCard(image);
      this.elements.gallery.appendChild(card);
    }
    
    await this.updateStorageInfo();
  }

  createImageCard(image) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-lg p-4';
    
    const timeContainer = document.createElement('div');
    timeContainer.className = 'flex items-center justify-between space-x-2 text-sm text-gray-500';
    
    const timestamp = document.createElement('span');
    timestamp.textContent = this.formatTimestamp(image.timestamp);
    
    const imageAndControlsContainer = document.createElement('div');
    imageAndControlsContainer.className = 'flex items-center space-x-2';
    
    const img = document.createElement('img');
    img.className = 'w-16 h-auto object-contain';
    
    // Create and append thumbnail asynchronously
    this.createThumbnail(image.data).then(thumbnailUrl => {
      img.src = thumbnailUrl;
    });
    
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'flex items-center space-x-2';
    
    // Create expand icon
    const expandIcon = this.createIcon('expand');
    expandIcon.addEventListener('click', () => {
      this.showFullscreen(URL.createObjectURL(image.data));
    });
    
    // Create delete icon
    const deleteIcon = this.createIcon('trash');
    deleteIcon.className = 'trash-icon text-red-500 hover:text-red-700';
    deleteIcon.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this image?')) {
        const transaction = this.dbManager.db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        await store.delete(image.timestamp);
        await this.displayImages();
        await this.updateStorageInfo();
      }
    });
    
    // Assemble the card components
    timeContainer.appendChild(timestamp);
    imageAndControlsContainer.appendChild(img);
    controlsContainer.appendChild(expandIcon);
    controlsContainer.appendChild(deleteIcon);
    imageAndControlsContainer.appendChild(controlsContainer);
    timeContainer.appendChild(imageAndControlsContainer);
    
    card.appendChild(timeContainer);
    
    return card;
  }

  createVideoElement() {
    const video = document.createElement('video');
    video.className = 'w-full max-w-full h-auto border-2 border-gray-300 rounded-lg shadow-lg mb-4';
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    return video;
  }

  createCanvasElement() {
    const canvas = document.createElement('canvas');
    canvas.style.display = 'none';
    return canvas;
  }

  createGalleryElement() {
    const gallery = document.createElement('div');
    gallery.className = 'w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4';
    return gallery;
  }

  createStorageCard() {
    const card = document.createElement('div');
    card.className = 'w-full max-w-full bg-white rounded-lg shadow-lg p-4 mb-4';
    
    const content = document.createElement('div');
    content.className = 'flex justify-between items-center mb-2';
    
    const info = document.createElement('div');
    
    const title = document.createElement('h3');
    title.id = 'usage-bar-title';
    title.className = 'text-lg font-semibold';
    title.textContent = 'Storage Usage';
    
    const stats = document.createElement('div');
    stats.className = 'flex space-x-4 text-sm text-gray-500';
    
    this.elements.storageSize = document.createElement('span');
    this.elements.storageSize.textContent = '0 MB';
    
    this.elements.imageCount = document.createElement('span');
    this.elements.imageCount.textContent = '0 images';
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'text-red-500 hover:text-red-700 focus:outline-none';
    deleteButton.appendChild(this.createIcon('trash'));
    deleteButton.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete all images? This action cannot be undone.')) {
        await this.dbManager.deleteAllImages();
        await this.displayImages();
      }
    });
    
    const usageBarContainer = document.createElement('div');
    usageBarContainer.className = 'usage-bar';
    
    this.elements.usageBar = document.createElement('div');
    this.elements.usageBar.className = 'usage-fill';
    this.elements.usageBar.style.width = '0%';
    
    stats.appendChild(this.elements.storageSize);
    stats.appendChild(this.elements.imageCount);
    info.appendChild(title);
    info.appendChild(stats);
    content.appendChild(info);
    content.appendChild(deleteButton);
    usageBarContainer.appendChild(this.elements.usageBar);
    card.appendChild(content);
    card.appendChild(usageBarContainer);
    
    return card;
  }

  createCameraToggle() {
    const label = document.createElement('label');
    label.className = 'flex items-center cursor-pointer fixed bottom-10 right-6';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'hidden';
    
    const switchDiv = document.createElement('div');
    switchDiv.className = 'relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out';
    
    const knob = document.createElement('span');
    knob.className = 'absolute w-6 h-6 bg-white rounded-full shadow transform transition duration-200 ease-in-out';
    
    checkbox.addEventListener('change', async () => {
      if (checkbox.checked) {
        console.log('Turning camera on');
        await this.cameraManager.start();
        knob.style.transform = 'translateX(100%)';
        switchDiv.className = 'relative w-14 h-8 bg-green-500 rounded-full shadow-inner transition duration-200 ease-in-out';
      } else {
        console.log('Turning camera off');
        try {
          const imageBlob = await this.cameraManager.captureImage();
          await this.dbManager.storeImage(imageBlob);
          await this.cameraManager.stop();
          await this.displayImages();
        } catch (error) {
          console.error('Error during camera shutdown:', error);
        }
        knob.style.transform = 'translateX(0)';
        switchDiv.className = 'relative w-14 h-8 bg-red-500 rounded-full shadow-inner transition duration-200 ease-in-out';
      }
    });
    
    switchDiv.appendChild(knob);
    label.appendChild(checkbox);
    label.appendChild(switchDiv);
    
    return label;
  }

  initializeUI() {
    // Create main container
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4';
    
    // Create and store UI elements
    this.elements = {
      container,
      video: this.createVideoElement(),
      canvas: this.createCanvasElement(),
      gallery: this.createGalleryElement(),
      storageCard: this.createStorageCard(),
      cameraToggle: this.createCameraToggle()
    };

    // Append elements to container
    Object.values(this.elements).forEach(element => {
      if (element !== this.elements.canvas) { // Keep canvas hidden
        container.appendChild(element);
      }
    });

    document.body.appendChild(container);
  }
}

// Main Application
class CameraApp {
  constructor() {
    this.dbManager = new DatabaseManager();
    this.cameraManager = new CameraManager();
    this.uiManager = null;
  }

  async init() {
    if (await this.dbManager.init()) {
      this.uiManager = new UIManager(this.dbManager, this.cameraManager);
      return true;
    }
    return false;
  }
}

// Initialize application
const app = new CameraApp();
app.init().catch(console.error);