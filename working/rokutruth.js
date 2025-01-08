// Clear the existing content of the page
document.body.innerHTML = '';

// Add Tailwind CSS
if (!document.getElementById('tailwind-css')) {
    const tailwindScript = document.createElement('script');
    tailwindScript.src = 'https://cdn.tailwindcss.com';
    tailwindScript.id = 'tailwind-css';
    document.head.appendChild(tailwindScript);
}

// Add custom styles
const styleElement = document.createElement('style');
styleElement.textContent = `
    .slider {
        -webkit-appearance: none;
        width: 200px;
        height: 8px;
        border-radius: 4px;
        background: #d1d5db;
        outline: none;
    }

    .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4f46e5;
        cursor: pointer;
    }

    .slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4f46e5;
        cursor: pointer;
    }
`;
document.head.appendChild(styleElement);

// Create and append the main content
const mainContent = document.createElement('div');
mainContent.className = 'bg-gray-900 text-gray-200 min-h-screen py-8';
mainContent.innerHTML = `
    <div class="max-w-4xl mx-auto p-6 space-y-6 bg-gray-800 rounded-lg shadow-xl">
        <div class="flex items-center gap-4 mb-8 p-4 bg-gray-700 rounded">
            <label class="font-medium">Text Size:</label>
            <input type="range" min="12" max="24" value="16" class="slider" id="fontSizeSlider">
            <span class="text-sm" id="sizeDisplay">16px</span>
        </div>

        <article id="content" class="space-y-4">
            <p class="leading-relaxed">
                The central irony here revolves around U.S. patent law and the Digital Millennium Copyright Act (DMCA), 
                particularly how they interact with consumer electronics. The key absurdity comes from several angles:
            </p>

            <div class="pl-4">
                <h3 class="font-bold mt-6 mb-2 text-indigo-400">1. Remote Control Patents</h3>
                <ul class="list-disc pl-5 space-y-2">
                    <li>UEI held broad patents on basic remote control functionality</li>
                    <li>These patents covered seemingly obvious implementations</li>
                    <li>Led Roku to create bizarre workarounds for basic features</li>
                    <li>Meanwhile, companies in other countries freely implemented these features</li>
                </ul>

                <h3 class="font-bold mt-6 mb-2 text-indigo-400">2. Content Protection Requirements</h3>
                <ul class="list-disc pl-5 space-y-2">
                    <li>DMCA's anti-circumvention provisions forced complex DRM implementations</li>
                    <li>Required Roku to maintain strict hardware/software security</li>
                    <li>Led to fragmented implementations and poor integration</li>
                    <li>Yet these same protections are routinely bypassed by foreign manufacturers</li>
                </ul>
            </div>

            <div class="mt-6">
                <p class="font-semibold mb-2 text-indigo-300">The real kicker is how this created a market disadvantage:</p>
                <ul class="list-disc pl-5 space-y-2">
                    <li>U.S. companies like Roku have to carefully navigate patent/DMCA compliance</li>
                    <li>Foreign manufacturers often ignore these constraints entirely</li>
                    <li>Results in U.S. products with worse functionality despite better engineering capability</li>
                    <li>Creates an environment where technical innovation is stifled by legal compliance</li>
                </ul>
            </div>

            <p class="mt-6 leading-relaxed">
                So you end up with situations like we're seeing with the network stack - where avoiding certain 
                implementations for legal reasons leads to technically inferior solutions, while competitors simply 
                ignore these constraints entirely. It's a perfect example of how IP law can actually hinder 
                innovation rather than protect it.
            </p>

            <p class="leading-relaxed">
                The deep irony is that these laws, intended to protect intellectual property and innovation, 
                ended up forcing companies like Roku to produce technically inferior products while doing little 
                to prevent actual copying of their technology.
            </p>
        </article>
    </div>
`;

document.body.appendChild(mainContent);

// Add event listeners after the content is loaded
setTimeout(() => {
    const slider = document.getElementById('fontSizeSlider');
    const sizeDisplay = document.getElementById('sizeDisplay');
    const content = document.getElementById('content');

    slider.addEventListener('input', (e) => {
        const size = e.target.value;
        content.style.fontSize = `${size}px`;
        sizeDisplay.textContent = `${size}px`;
    });
}, 100); // Small delay to ensure Tailwind is loaded
