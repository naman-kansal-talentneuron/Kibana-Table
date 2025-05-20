// This is a script to generate the icon files
// In a real-world scenario, you'd use actual image files
// For now, we're creating a data URL that can be used as a placeholder

// Create a canvas and draw a simple icon
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

function createIcon(size) {
  canvas.width = size;
  canvas.height = size;
  
  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  
  // Draw blue background
  ctx.fillStyle = '#0078d7';
  ctx.fillRect(0, 0, size, size);
  
  // Draw table-like grid
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, size / 16);
  
  // Horizontal lines
  const step = size / 3;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }
  
  // Vertical lines
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.stroke();
  }
  
  // Return data URL
  return canvas.toDataURL();
}

// Create icon files
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const dataUrl = createIcon(size);
  const link = document.createElement('a');
  link.download = `icon${size}.png`;
  link.href = dataUrl;
  link.click();
  console.log(`Generated icon${size}.png`);
});
