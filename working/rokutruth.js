// Clear the existing content of the page
document.body.innerHTML = '';

// Create a style element for Tailwind CSS and custom styles
const style = document.createElement('style');
style.innerHTML = `
@import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');

/* Add any custom styles here */
body {
    background-color: black; /* Example custom style */
    color: white; /* Example custom style */
}
`;
document.head.appendChild(style);

// Import React and other necessary components at the top level
import React, { useState } from 'https://cdn.skypack.dev/react';
import ReactDOM from 'https://cdn.skypack.dev/react-dom';
import { Slider } from 'https://your-slider-library-url'; // Update with the correct URL for your Slider component

const Article = () => {
  const [fontSize, setFontSize] = useState(16);

  const handleSliderChange = (value) => {
    setFontSize(value[0]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 bg-white rounded-lg shadow">
      <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 rounded">
        <label className="font-medium text-gray-700">Text Size:</label>
        <Slider 
          defaultValue={[16]}
          max={24}
          min={12}
          step={1}
          className="w-48"
          onValueChange={handleSliderChange}
        />
        <span className="text-sm text-gray-500">{fontSize}px</span>
      </div>

      <article style={{ fontSize: `${fontSize}px` }} className="prose max-w-none space-y-4">
        <p className="leading-relaxed">
          The central irony here revolves around U.S. patent law and the Digital Millennium Copyright Act (DMCA), 
          particularly how they interact with consumer electronics. The key absurdity comes from several angles:
        </p>

        <div className="pl-4">
          <h3 className="font-bold mt-6 mb-2">1. Remote Control Patents</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>UEI held broad patents on basic remote control functionality</li>
            <li>These patents covered seemingly obvious implementations</li>
            <li>Led Roku to create bizarre workarounds for basic features</li>
            <li>Meanwhile, companies in other countries freely implemented these features</li>
          </ul>

          <h3 className="font-bold mt-6 mb-2">2. Content Protection Requirements</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>DMCA's anti-circumvention provisions forced complex DRM implementations</li>
            <li>Required Roku to maintain strict hardware/software security</li>
            <li>Led to fragmented implementations and poor integration</li>
            <li>Yet these same protections are routinely bypassed by foreign manufacturers</li>
          </ul>
        </div>

        <div className="mt-6">
          <p className="font-semibold mb-2">The real kicker is how this created a market disadvantage:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>U.S. companies like Roku have to carefully navigate patent/DMCA compliance</li>
            <li>Foreign manufacturers often ignore these constraints entirely</li>
            <li>Results in U.S. products with worse functionality despite better engineering capability</li>
            <li>Creates an environment where technical innovation is stifled by legal compliance</li>
          </ul>
        </div>

        <p className="mt-6 leading-relaxed">
          So you end up with situations like we're seeing with the network stack - where avoiding certain 
          implementations for legal reasons leads to technically inferior solutions, while competitors simply 
          ignore these constraints entirely. It's a perfect example
 of how IP law can actually hinder 
          innovation rather than protect it.
        </p>

        <p className="leading-relaxed">
          The deep irony is that these laws, intended to protect intellectual property and innovation, 
          ended up forcing companies like Roku to produce technically inferior products while doing little 
          to prevent actual copying of their technology.
        </p>
      </article>
    </div>
  );
};

export default Article;
