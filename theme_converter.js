const fs = require('fs');
const filePath = 'src/pages/StartupDetailPage.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// Container Backgrounds
content = content.replace(/bg-\[\#0f0f0f\]/g, 'bg-gray-50/50');
content = content.replace(/bg-\[\#1a1a1a\]/g, 'bg-white');
content = content.replace(/bg-\[\#1A1A1A\]/g, 'bg-white');

// Typography (Careful not to replace text-white inside buttons/badges)
// We'll replace text-white with text-[#1A1A1A] only when preceded by specific structural classes
content = content.replace(/text-white/g, 'text-[#1A1A1A]'); 
// Re-fix text-white for badges/buttons
content = content.replace(/bg-\[\#00D395\] text-\[\#1A1A1A\]/g, 'bg-[#00D395] text-white');
content = content.replace(/bg-\[\#FF4D4F\] text-\[\#1A1A1A\]/g, 'bg-[#FF4D4F] text-white');
content = content.replace(/text-\[\#1A1A1A\] font-bold text-\[10px\]/g, 'text-white font-bold text-[10px]'); // progress ring text

// Secondary text
content = content.replace(/text-gray-400/g, 'text-gray-500');
content = content.replace(/text-gray-300/g, 'text-gray-600');

// Borders
content = content.replace(/border-white\/5/g, 'border-gray-100');
content = content.replace(/border-white\/10/g, 'border-gray-200');
content = content.replace(/border-\[\#333\]/g, 'border-gray-200');
content = content.replace(/border-\[\#222\]/g, 'border-gray-100');

// Hover states
content = content.replace(/hover:bg-\[\#2a2a2a\]/g, 'hover:bg-gray-50');
content = content.replace(/hover:bg-\[\#222\]/g, 'hover:bg-gray-50');

// Charts grid lines
content = content.replace(/stroke="\#333"/g, 'stroke="hsl(var(--border))"');
content = content.replace(/stroke="\#555"/g, 'stroke="hsl(var(--muted-foreground))"');

fs.writeFileSync(filePath, content);
console.log('Theme conversion complete.');
