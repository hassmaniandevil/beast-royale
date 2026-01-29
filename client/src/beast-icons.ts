// ============================================
// BEAST ROYALE - BEAST ICON RENDERER
// Canvas-based rendering for character selection
// ============================================

import { getBeast, STARTER_BEASTS } from '@beast-royale/shared';

// Color palettes matching renderer.ts
const BEAST_PALETTES: Record<string, { primary: string; secondary: string; accent: string; eye: string }> = {
  rock_tortoise: { primary: '#50ef39', secondary: '#3d8b2f', accent: '#90EE90', eye: '#000000' },
  honk_goose: { primary: '#f5f557', secondary: '#e0e050', accent: '#FFFACD', eye: '#000000' },
  stretchy_ferret: { primary: '#ed54ba', secondary: '#c44a9e', accent: '#FFB6C1', eye: '#000000' },
  boom_frog: { primary: '#117f2d', secondary: '#0d5f22', accent: '#90EE90', eye: '#000000' },
  punch_crab: { primary: '#c51111', secondary: '#8b0000', accent: '#FF6B6B', eye: '#000000' },
  sleepy_bear: { primary: '#8B4513', secondary: '#654321', accent: '#DEB887', eye: '#000000' },
  mirror_monkey: { primary: '#9932CC', secondary: '#7B68EE', accent: '#E6E6FA', eye: '#000000' },
  glass_rhino: { primary: '#87CEEB', secondary: '#B0E0E6', accent: '#F0F8FF', eye: '#4169E1' },
  panic_octopus: { primary: '#FF69B4', secondary: '#DB7093', accent: '#FFC0CB', eye: '#000000' },
  unicycle_giraffe: { primary: '#FFD700', secondary: '#CD853F', accent: '#FAFAD2', eye: '#000000' },
  electric_eel: { primary: '#00CED1', secondary: '#20B2AA', accent: '#FFFF00', eye: '#000000' },
  pigeon_king: { primary: '#708090', secondary: '#778899', accent: '#FFD700', eye: '#000000' },
  screaming_goat: { primary: '#F5F5DC', secondary: '#D2B48C', accent: '#FFFFFF', eye: '#000000' },
  slime_cow: { primary: '#32CD32', secondary: '#228B22', accent: '#98FB98', eye: '#000000' },
  cactus_cat: { primary: '#2E8B57', secondary: '#3CB371', accent: '#98FB98', eye: '#000000' },
  time_hamster: { primary: '#FFB347', secondary: '#F4A460', accent: '#FFDAB9', eye: '#000000' },
  tax_raccoon: { primary: '#696969', secondary: '#2F4F4F', accent: '#D3D3D3', eye: '#000000' },
  cosmic_duck: { primary: '#9370DB', secondary: '#8A2BE2', accent: '#E6E6FA', eye: '#FFD700' },
  reality_dog: { primary: '#4682B4', secondary: '#5F9EA0', accent: '#B0C4DE', eye: '#00BFFF' },
  the_human: { primary: '#FFDAB9', secondary: '#DEB887', accent: '#FFE4C4', eye: '#8B4513' },
  laser_cat: { primary: '#FF4500', secondary: '#FF6347', accent: '#FFA07A', eye: '#00FF00' },
  bouncy_bunny: { primary: '#FFC0CB', secondary: '#FFB6C1', accent: '#FFFFFF', eye: '#000000' },
  thunder_bear: { primary: '#4B0082', secondary: '#8B008B', accent: '#FFD700', eye: '#FFFF00' },
  ninja_squirrel: { primary: '#2F4F4F', secondary: '#1C1C1C', accent: '#A0522D', eye: '#FF0000' },
  rocket_penguin: { primary: '#1C1C1C', secondary: '#FFFFFF', accent: '#FF4500', eye: '#000000' },
  sonic_bat: { primary: '#483D8B', secondary: '#6A5ACD', accent: '#9370DB', eye: '#FF69B4' },
  bubble_fish: { primary: '#00BFFF', secondary: '#87CEEB', accent: '#E0FFFF', eye: '#000000' },
  ghost_fox: { primary: '#E6E6FA', secondary: '#D8BFD8', accent: '#FFFFFF', eye: '#9370DB' },
  magnet_mole: { primary: '#8B4513', secondary: '#A0522D', accent: '#FFD700', eye: '#000000' },
  disco_peacock: { primary: '#00CED1', secondary: '#FF1493', accent: '#FFD700', eye: '#FF00FF' },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

export function drawBeastIcon(canvas: HTMLCanvasElement, beastId: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = canvas.width;
  const scale = size / 100; // Base size is 100

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(scale, scale);

  const p = BEAST_PALETTES[beastId] || { primary: '#6b2fbb', secondary: '#5a2599', accent: '#9966cc', eye: '#000000' };

  // Draw based on beast type
  switch (beastId) {
    case 'rock_tortoise': drawTortoise(ctx, p); break;
    case 'honk_goose': drawGoose(ctx, p); break;
    case 'stretchy_ferret': drawFerret(ctx, p); break;
    case 'boom_frog': drawFrog(ctx, p); break;
    case 'punch_crab': drawCrab(ctx, p); break;
    case 'sleepy_bear': drawBear(ctx, p); break;
    case 'mirror_monkey': drawMonkey(ctx, p); break;
    case 'glass_rhino': drawRhino(ctx, p); break;
    case 'panic_octopus': drawOctopus(ctx, p); break;
    case 'unicycle_giraffe': drawGiraffe(ctx, p); break;
    case 'electric_eel': drawEel(ctx, p); break;
    case 'pigeon_king': drawPigeon(ctx, p); break;
    case 'screaming_goat': drawGoat(ctx, p); break;
    case 'slime_cow': drawCow(ctx, p); break;
    case 'cactus_cat': drawCat(ctx, p); break;
    case 'time_hamster': drawHamster(ctx, p); break;
    case 'tax_raccoon': drawRaccoon(ctx, p); break;
    case 'cosmic_duck': drawDuck(ctx, p); break;
    case 'reality_dog': drawDog(ctx, p); break;
    case 'the_human': drawHuman(ctx, p); break;
    case 'laser_cat': drawLaserCat(ctx, p); break;
    case 'bouncy_bunny': drawBunny(ctx, p); break;
    case 'thunder_bear': drawThunderBear(ctx, p); break;
    case 'ninja_squirrel': drawSquirrel(ctx, p); break;
    case 'rocket_penguin': drawPenguin(ctx, p); break;
    case 'sonic_bat': drawBat(ctx, p); break;
    case 'bubble_fish': drawFish(ctx, p); break;
    case 'ghost_fox': drawFox(ctx, p); break;
    case 'magnet_mole': drawMole(ctx, p); break;
    case 'disco_peacock': drawPeacock(ctx, p); break;
    default: drawDefaultBlob(ctx, p); break;
  }

  ctx.restore();
}

type Palette = { primary: string; secondary: string; accent: string; eye: string };

function drawEllipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill?: string, stroke?: string, lineWidth = 2) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill?: string, stroke?: string, lineWidth = 2) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, lineWidth = 2) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function drawCuteEyes(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, eyeColor: string) {
  // Left eye
  drawCircle(ctx, x - size * 1.2, y, size, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, x - size * 1.2 + size * 0.2, y, size * 0.5, eyeColor);
  // Right eye
  drawCircle(ctx, x + size * 1.2, y, size, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, x + size * 1.2 + size * 0.2, y, size * 0.5, eyeColor);
}

function drawTortoise(ctx: CanvasRenderingContext2D, p: Palette) {
  // Shell
  drawEllipse(ctx, 0, 8, 28, 22, p.secondary, '#000000', 3);
  // Shell pattern
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 3, 14, 10, 0, 0, Math.PI * 2); ctx.stroke();
  // Head
  drawCircle(ctx, 0, -20, 15, p.primary, '#000000', 3);
  drawCuteEyes(ctx, 0, -23, 4, p.eye);
  // Smile
  ctx.beginPath(); ctx.arc(0, -16, 6, 0.2, Math.PI - 0.2); ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();
  // Feet
  drawEllipse(ctx, -18, 22, 8, 5, p.primary, '#000000', 2);
  drawEllipse(ctx, 18, 22, 8, 5, p.primary, '#000000', 2);
}

function drawGoose(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 12, 22, 18, p.primary, '#000000', 3);
  // Neck
  drawRoundRect(ctx, -7, -32, 14, 40, 7, p.primary, '#000000', 3);
  // Head
  drawCircle(ctx, 0, -38, 12, p.primary, '#000000', 3);
  // Orange beak
  ctx.beginPath();
  ctx.moveTo(12, -40); ctx.lineTo(24, -36); ctx.lineTo(12, -32); ctx.closePath();
  ctx.fillStyle = '#f97316'; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  // Angry eyes
  drawCircle(ctx, -4, -42, 4, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, -3, -41, 2, p.eye);
  drawCircle(ctx, 6, -42, 4, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, 7, -41, 2, p.eye);
  // Angry eyebrows
  ctx.beginPath(); ctx.moveTo(-10, -48); ctx.lineTo(0, -45); ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12, -48); ctx.lineTo(2, -45); ctx.stroke();
}

function drawFerret(ctx: CanvasRenderingContext2D, p: Palette) {
  // Long body
  drawRoundRect(ctx, -28, -4, 56, 24, 12, p.primary, '#000000', 3);
  // Head
  drawEllipse(ctx, 20, -4, 14, 12, p.primary, '#000000', 3);
  // Mask
  drawEllipse(ctx, 24, -4, 8, 6, p.secondary);
  // Ears
  drawEllipse(ctx, 14, -14, 5, 6, p.primary, '#000000', 1.5);
  drawEllipse(ctx, 26, -14, 5, 6, p.primary, '#000000', 1.5);
  // Eyes
  drawCuteEyes(ctx, 24, -6, 3.5, p.eye);
  // Nose
  drawCircle(ctx, 32, -2, 3, '#000000');
  // Tail
  drawRoundRect(ctx, -40, 4, 16, 10, 5, p.primary, '#000000', 2);
}

function drawFrog(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 10, 24, 18, p.primary, '#000000', 3);
  // Big eyes
  drawCircle(ctx, -10, -12, 12, p.primary, '#000000', 2);
  drawCircle(ctx, 10, -12, 12, p.primary, '#000000', 2);
  drawCircle(ctx, -10, -14, 8, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, -8, -13, 4, p.eye);
  drawCircle(ctx, 10, -14, 8, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, 12, -13, 4, p.eye);
  // Belly
  drawEllipse(ctx, 0, 14, 14, 10, p.accent);
  // Mouth
  ctx.beginPath(); ctx.arc(0, 12, 16, 0, Math.PI); ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  // Legs
  drawEllipse(ctx, -22, 22, 10, 6, p.primary, '#000000', 2);
  drawEllipse(ctx, 22, 22, 10, 6, p.primary, '#000000', 2);
}

function drawCrab(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 5, 22, 16, p.primary, '#000000', 3);
  // Eye stalks
  drawRoundRect(ctx, -8, -20, 5, 12, 2, p.primary, '#000000', 1.5);
  drawRoundRect(ctx, 3, -20, 5, 12, 2, p.primary, '#000000', 1.5);
  drawCircle(ctx, -5.5, -22, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, -4.5, -21, 2.5, p.eye);
  drawCircle(ctx, 5.5, -22, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, 6.5, -21, 2.5, p.eye);
  // Claws
  drawEllipse(ctx, -34, -4, 13, 10, p.primary, '#000000', 3);
  drawEllipse(ctx, -38, -10, 6, 8, p.primary, '#000000', 2);
  drawEllipse(ctx, 34, -4, 13, 10, p.primary, '#000000', 3);
  drawEllipse(ctx, 38, -10, 6, 8, p.primary, '#000000', 2);
}

function drawBear(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawCircle(ctx, 0, 8, 24, p.primary, '#000000', 3);
  // Head
  drawCircle(ctx, 0, -20, 18, p.primary, '#000000', 3);
  // Ears
  drawCircle(ctx, -15, -35, 8, p.primary, '#000000', 2);
  drawCircle(ctx, -15, -35, 4, p.secondary);
  drawCircle(ctx, 15, -35, 8, p.primary, '#000000', 2);
  drawCircle(ctx, 15, -35, 4, p.secondary);
  // Snout
  drawEllipse(ctx, 0, -14, 10, 8, p.accent, '#000000', 1.5);
  drawEllipse(ctx, 0, -16, 5, 3, '#000000');
  // Eyes
  drawCuteEyes(ctx, 0, -25, 4, p.eye);
  // Belly
  drawEllipse(ctx, 0, 12, 14, 12, p.accent);
}

function drawMonkey(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 8, 20, 18, p.primary, '#000000', 3);
  // Head
  drawCircle(ctx, 0, -18, 16, p.primary, '#000000', 3);
  // Face
  drawEllipse(ctx, 0, -14, 11, 10, p.accent);
  // Ears
  drawCircle(ctx, -18, -18, 8, p.primary, '#000000', 2);
  drawCircle(ctx, -18, -18, 4, p.accent);
  drawCircle(ctx, 18, -18, 8, p.primary, '#000000', 2);
  drawCircle(ctx, 18, -18, 4, p.accent);
  // Eyes
  drawCuteEyes(ctx, 0, -20, 4, p.eye);
  // Smile
  ctx.beginPath(); ctx.arc(0, -10, 6, 0.2, Math.PI - 0.2); ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();
}

function drawRhino(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 8, 24, 20, p.primary, '#000000', 3);
  // Head
  drawEllipse(ctx, 16, -8, 18, 14, p.primary, '#000000', 3);
  // Horn
  ctx.beginPath();
  ctx.moveTo(32, -16); ctx.lineTo(40, -28); ctx.lineTo(30, -12); ctx.closePath();
  ctx.fillStyle = p.accent; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  // Ears
  drawEllipse(ctx, 6, -20, 5, 8, p.primary, '#000000', 1.5);
  // Eye
  drawCircle(ctx, 22, -12, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, 23, -11, 2.5, p.eye);
  // Legs
  drawRoundRect(ctx, -16, 22, 11, 10, 4, p.primary, '#000000', 2);
  drawRoundRect(ctx, 5, 22, 11, 10, 4, p.primary, '#000000', 2);
}

function drawOctopus(ctx: CanvasRenderingContext2D, p: Palette) {
  // Tentacles
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI + Math.PI / 5;
    const x = Math.cos(angle) * 20;
    const y = 12 + Math.sin(angle) * 12;
    drawRoundRect(ctx, x - 4, y, 8, 20, 4, p.secondary, '#000000', 1.5);
  }
  // Body
  drawEllipse(ctx, 0, -4, 22, 26, p.primary, '#000000', 3);
  // Eyes
  drawCircle(ctx, -8, -10, 8, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, -6, -8, 4, p.eye);
  drawCircle(ctx, 8, -10, 8, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, 10, -8, 4, p.eye);
  // Worried eyebrows
  ctx.beginPath(); ctx.moveTo(-15, -18); ctx.lineTo(-4, -15); ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(15, -18); ctx.lineTo(4, -15); ctx.stroke();
  // O mouth
  drawCircle(ctx, 0, 5, 5, p.secondary, '#000000', 1.5);
}

function drawGiraffe(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 15, 18, 14, p.primary, '#000000', 3);
  // Spots
  drawCircle(ctx, -6, 12, 4, p.secondary);
  drawCircle(ctx, 6, 16, 3, p.secondary);
  // Long neck
  drawRoundRect(ctx, -6, -36, 12, 46, 6, p.primary, '#000000', 3);
  // Spots on neck
  drawCircle(ctx, -1, -16, 3, p.secondary);
  drawCircle(ctx, 2, -28, 2.5, p.secondary);
  // Head
  drawEllipse(ctx, 0, -44, 11, 10, p.primary, '#000000', 3);
  // Ossicones
  drawRoundRect(ctx, -8, -58, 5, 11, 2, p.secondary, '#000000', 1.5);
  drawRoundRect(ctx, 3, -58, 5, 11, 2, p.secondary, '#000000', 1.5);
  // Eyes
  drawCuteEyes(ctx, 0, -46, 3, p.eye);
}

function drawEel(ctx: CanvasRenderingContext2D, p: Palette) {
  // Long body
  ctx.beginPath();
  ctx.moveTo(-35, 0);
  ctx.quadraticCurveTo(-20, -15, 0, 0);
  ctx.quadraticCurveTo(20, 15, 35, 0);
  ctx.lineTo(35, 10);
  ctx.quadraticCurveTo(20, 25, 0, 10);
  ctx.quadraticCurveTo(-20, -5, -35, 10);
  ctx.closePath();
  ctx.fillStyle = p.primary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 3; ctx.stroke();
  // Electric glow
  drawEllipse(ctx, 10, 2, 8, 10, p.accent + '80');
  // Fin
  drawEllipse(ctx, 0, -10, 20, 6, p.secondary, '#000000', 1.5);
  // Head
  drawCircle(ctx, -28, 5, 10, p.primary, '#000000', 2);
  // Eyes
  drawCircle(ctx, -30, 2, 4, '#ffffff', '#000000', 1);
  drawCircle(ctx, -29, 3, 2, p.eye);
}

function drawPigeon(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 8, 20, 16, p.primary, '#000000', 3);
  // Head
  drawCircle(ctx, 0, -14, 14, p.primary, '#000000', 3);
  // Crown
  ctx.beginPath();
  ctx.moveTo(-8, -28); ctx.lineTo(-4, -20); ctx.lineTo(0, -32);
  ctx.lineTo(4, -20); ctx.lineTo(8, -28); ctx.closePath();
  ctx.fillStyle = p.accent; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  // Beak
  ctx.beginPath();
  ctx.moveTo(10, -15); ctx.lineTo(20, -12); ctx.lineTo(10, -9); ctx.closePath();
  ctx.fillStyle = '#f97316'; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();
  // Eyes
  drawCuteEyes(ctx, 0, -17, 3.5, p.eye);
  // Wings
  drawEllipse(ctx, -14, 6, 10, 14, p.secondary, '#000000', 2);
  drawEllipse(ctx, 14, 6, 10, 14, p.secondary, '#000000', 2);
}

function drawGoat(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 10, 22, 16, p.primary, '#000000', 3);
  // Head
  drawEllipse(ctx, 0, -15, 16, 14, p.primary, '#000000', 3);
  // Horns
  ctx.beginPath(); ctx.arc(-12, -30, 8, Math.PI / 2, Math.PI * 1.5); ctx.strokeStyle = p.secondary; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); ctx.arc(-12, -30, 8, Math.PI / 2, Math.PI * 1.5); ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(12, -30, 8, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = p.secondary; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); ctx.arc(12, -30, 8, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();
  // Eyes (screaming)
  drawCircle(ctx, -6, -18, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, -5, -17, 2.5, p.eye);
  drawCircle(ctx, 6, -18, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, 7, -17, 2.5, p.eye);
  // Open mouth
  drawEllipse(ctx, 0, -6, 8, 6, '#000000');
  // Beard
  drawEllipse(ctx, 0, 2, 4, 8, p.secondary, '#000000', 1);
}

function drawCow(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 10, 24, 18, p.primary, '#000000', 3);
  // Spots
  drawCircle(ctx, -8, 8, 6, p.secondary);
  drawCircle(ctx, 10, 14, 5, p.secondary);
  // Head
  drawCircle(ctx, 0, -16, 16, p.primary, '#000000', 3);
  // Ears
  drawEllipse(ctx, -18, -18, 8, 5, p.primary, '#000000', 2);
  drawEllipse(ctx, 18, -18, 8, 5, p.primary, '#000000', 2);
  // Snout
  drawEllipse(ctx, 0, -8, 10, 7, p.accent, '#000000', 1.5);
  // Nostrils
  drawEllipse(ctx, -4, -7, 2, 3, '#000000');
  drawEllipse(ctx, 4, -7, 2, 3, '#000000');
  // Eyes
  drawCuteEyes(ctx, 0, -22, 4, p.eye);
}

function drawCat(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body (cactus-like)
  drawEllipse(ctx, 0, 8, 20, 22, p.primary, '#000000', 3);
  // Arms like cactus
  drawRoundRect(ctx, -28, -5, 12, 20, 6, p.primary, '#000000', 2);
  drawRoundRect(ctx, 16, 0, 12, 18, 6, p.primary, '#000000', 2);
  // Head
  drawCircle(ctx, 0, -18, 14, p.primary, '#000000', 3);
  // Ears
  ctx.beginPath();
  ctx.moveTo(-10, -28); ctx.lineTo(-14, -42); ctx.lineTo(-4, -30); ctx.closePath();
  ctx.fillStyle = p.primary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10, -28); ctx.lineTo(14, -42); ctx.lineTo(4, -30); ctx.closePath();
  ctx.fillStyle = p.primary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  // Eyes
  drawCuteEyes(ctx, 0, -20, 4, p.eye);
  // Nose
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(-3, -10); ctx.lineTo(3, -10); ctx.closePath();
  ctx.fillStyle = '#FF69B4'; ctx.fill();
}

function drawHamster(ctx: CanvasRenderingContext2D, p: Palette) {
  // Chubby body
  drawCircle(ctx, 0, 5, 24, p.primary, '#000000', 3);
  // Head
  drawCircle(ctx, 0, -18, 18, p.primary, '#000000', 3);
  // Ears
  drawCircle(ctx, -16, -32, 8, p.primary, '#000000', 2);
  drawCircle(ctx, -16, -32, 4, p.secondary);
  drawCircle(ctx, 16, -32, 8, p.primary, '#000000', 2);
  drawCircle(ctx, 16, -32, 4, p.secondary);
  // Cheeks
  drawCircle(ctx, -12, -12, 8, p.accent);
  drawCircle(ctx, 12, -12, 8, p.accent);
  // Eyes
  drawCuteEyes(ctx, 0, -22, 4, p.eye);
  // Nose
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(-2, -11); ctx.lineTo(2, -11); ctx.closePath();
  ctx.fillStyle = '#FF69B4'; ctx.fill();
  // Belly
  drawEllipse(ctx, 0, 10, 12, 10, p.accent);
}

function drawRaccoon(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 8, 22, 18, p.primary, '#000000', 3);
  // Striped tail
  drawRoundRect(ctx, -35, 5, 18, 10, 5, p.primary, '#000000', 2);
  drawRoundRect(ctx, -32, 6, 4, 8, 2, '#000000');
  drawRoundRect(ctx, -24, 6, 4, 8, 2, '#000000');
  // Head
  drawCircle(ctx, 0, -16, 16, p.primary, '#000000', 3);
  // Mask
  drawEllipse(ctx, -8, -18, 8, 6, p.secondary);
  drawEllipse(ctx, 8, -18, 8, 6, p.secondary);
  // Eyes in mask
  drawCircle(ctx, -8, -18, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, -7, -17, 2.5, p.eye);
  drawCircle(ctx, 8, -18, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, 9, -17, 2.5, p.eye);
  // Ears
  drawCircle(ctx, -14, -30, 6, p.primary, '#000000', 1.5);
  drawCircle(ctx, 14, -30, 6, p.primary, '#000000', 1.5);
  // Snout
  drawEllipse(ctx, 0, -8, 6, 4, p.accent, '#000000', 1);
  drawCircle(ctx, 0, -9, 3, '#000000');
}

function drawDuck(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 10, 22, 16, p.primary, '#000000', 3);
  // Cosmic swirl
  ctx.beginPath(); ctx.arc(0, 10, 12, 0, Math.PI); ctx.strokeStyle = p.accent; ctx.lineWidth = 2; ctx.stroke();
  // Head
  drawCircle(ctx, 0, -14, 14, p.primary, '#000000', 3);
  // Cosmic glow
  drawCircle(ctx, 0, -14, 18, p.secondary + '30');
  // Beak
  ctx.beginPath();
  ctx.moveTo(10, -14); ctx.lineTo(22, -12); ctx.lineTo(10, -8); ctx.closePath();
  ctx.fillStyle = '#f97316'; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  // Glowing eyes
  drawCircle(ctx, -5, -18, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, -4, -17, 3, p.eye);
  drawCircle(ctx, 5, -18, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, 6, -17, 3, p.eye);
}

function drawDog(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 8, 22, 18, p.primary, '#000000', 3);
  // Ghost effect
  drawEllipse(ctx, 0, 8, 26, 22, p.secondary + '40');
  // Head
  drawCircle(ctx, 0, -16, 16, p.primary, '#000000', 3);
  // Floppy ears
  drawEllipse(ctx, -18, -12, 8, 14, p.secondary, '#000000', 2);
  drawEllipse(ctx, 18, -12, 8, 14, p.secondary, '#000000', 2);
  // Snout
  drawEllipse(ctx, 0, -8, 8, 6, p.accent, '#000000', 1.5);
  drawCircle(ctx, 0, -10, 4, '#000000');
  // Eyes
  drawCircle(ctx, -6, -20, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, -5, -19, 3, p.eye);
  drawCircle(ctx, 6, -20, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, 7, -19, 3, p.eye);
}

function drawHuman(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawRoundRect(ctx, -14, 0, 28, 30, 8, p.primary, '#000000', 3);
  // Head
  drawCircle(ctx, 0, -18, 16, p.primary, '#000000', 3);
  // Hair
  ctx.beginPath();
  ctx.arc(0, -22, 14, Math.PI, 0);
  ctx.fillStyle = p.secondary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  // Eyes (confused)
  drawCircle(ctx, -6, -20, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, -5, -19, 2.5, p.eye);
  drawCircle(ctx, 6, -20, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, 7, -19, 2.5, p.eye);
  // Question mark
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText('?', 0, -6);
  // Arms
  drawRoundRect(ctx, -26, 5, 14, 8, 4, p.primary, '#000000', 2);
  drawRoundRect(ctx, 12, 5, 14, 8, 4, p.primary, '#000000', 2);
}

function drawLaserCat(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 8, 20, 18, p.primary, '#000000', 3);
  // Head
  drawCircle(ctx, 0, -16, 15, p.primary, '#000000', 3);
  // Ears
  ctx.beginPath();
  ctx.moveTo(-10, -26); ctx.lineTo(-14, -42); ctx.lineTo(-4, -28); ctx.closePath();
  ctx.fillStyle = p.primary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10, -26); ctx.lineTo(14, -42); ctx.lineTo(4, -28); ctx.closePath();
  ctx.fillStyle = p.primary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  // Laser eyes
  drawCircle(ctx, -6, -18, 5, p.eye);
  drawCircle(ctx, 6, -18, 5, p.eye);
  // Laser beams
  ctx.beginPath();
  ctx.moveTo(-6, -18); ctx.lineTo(-20, -30);
  ctx.strokeStyle = p.eye; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(6, -18); ctx.lineTo(20, -30);
  ctx.stroke();
}

function drawBunny(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawCircle(ctx, 0, 10, 22, p.primary, '#000000', 3);
  // Head
  drawCircle(ctx, 0, -14, 16, p.primary, '#000000', 3);
  // Long ears
  drawRoundRect(ctx, -10, -52, 8, 32, 4, p.primary, '#000000', 2);
  drawRoundRect(ctx, -8, -50, 4, 28, 2, p.secondary);
  drawRoundRect(ctx, 2, -52, 8, 32, 4, p.primary, '#000000', 2);
  drawRoundRect(ctx, 4, -50, 4, 28, 2, p.secondary);
  // Eyes
  drawCuteEyes(ctx, 0, -18, 5, p.eye);
  // Nose
  ctx.beginPath();
  ctx.moveTo(0, -10); ctx.lineTo(-3, -6); ctx.lineTo(3, -6); ctx.closePath();
  ctx.fillStyle = '#FF69B4'; ctx.fill();
  // Tail
  drawCircle(ctx, 0, 28, 8, p.accent, '#000000', 2);
}

function drawThunderBear(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body with electric glow
  drawCircle(ctx, 0, 8, 26, p.accent + '40');
  drawCircle(ctx, 0, 8, 24, p.primary, '#000000', 3);
  // Head
  drawCircle(ctx, 0, -20, 18, p.primary, '#000000', 3);
  // Ears
  drawCircle(ctx, -15, -35, 8, p.primary, '#000000', 2);
  drawCircle(ctx, 15, -35, 8, p.primary, '#000000', 2);
  // Lightning bolt mark
  ctx.beginPath();
  ctx.moveTo(-4, -28); ctx.lineTo(2, -22); ctx.lineTo(-2, -22);
  ctx.lineTo(4, -14); ctx.lineTo(-2, -20); ctx.lineTo(2, -20); ctx.closePath();
  ctx.fillStyle = p.accent; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 1; ctx.stroke();
  // Glowing eyes
  drawCircle(ctx, -6, -22, 5, p.eye);
  drawCircle(ctx, 6, -22, 5, p.eye);
  // Snout
  drawEllipse(ctx, 0, -12, 8, 6, p.secondary, '#000000', 1.5);
}

function drawSquirrel(ctx: CanvasRenderingContext2D, p: Palette) {
  // Big fluffy tail
  drawEllipse(ctx, -20, -5, 16, 28, p.accent, '#000000', 2);
  // Body
  drawEllipse(ctx, 0, 8, 18, 16, p.primary, '#000000', 3);
  // Head
  drawCircle(ctx, 0, -14, 14, p.primary, '#000000', 3);
  // Ears
  ctx.beginPath();
  ctx.moveTo(-8, -24); ctx.lineTo(-10, -36); ctx.lineTo(-4, -26); ctx.closePath();
  ctx.fillStyle = p.primary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, -24); ctx.lineTo(10, -36); ctx.lineTo(4, -26); ctx.closePath();
  ctx.fillStyle = p.primary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();
  // Ninja mask
  drawRoundRect(ctx, -12, -20, 24, 8, 2, p.secondary);
  // Eyes
  drawCircle(ctx, -5, -17, 3, p.eye);
  drawCircle(ctx, 5, -17, 3, p.eye);
}

function drawPenguin(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 8, 22, 24, p.primary, '#000000', 3);
  // Belly
  drawEllipse(ctx, 0, 12, 14, 18, p.secondary);
  // Head
  drawCircle(ctx, 0, -18, 16, p.primary, '#000000', 3);
  // Eyes
  drawCuteEyes(ctx, 0, -20, 4, p.eye);
  // Beak
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(-6, -8); ctx.lineTo(6, -8); ctx.closePath();
  ctx.fillStyle = '#f97316'; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();
  // Rocket pack
  drawRoundRect(ctx, -20, 0, 8, 18, 3, p.accent, '#000000', 2);
  drawRoundRect(ctx, 12, 0, 8, 18, 3, p.accent, '#000000', 2);
  // Flames
  ctx.beginPath();
  ctx.moveTo(-16, 18); ctx.lineTo(-18, 28); ctx.lineTo(-14, 28); ctx.closePath();
  ctx.fillStyle = '#FF4500'; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(16, 18); ctx.lineTo(14, 28); ctx.lineTo(18, 28); ctx.closePath();
  ctx.fillStyle = '#FF4500'; ctx.fill();
}

function drawBat(ctx: CanvasRenderingContext2D, p: Palette) {
  // Wings
  ctx.beginPath();
  ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-35, -20, -40, 10);
  ctx.quadraticCurveTo(-30, 5, -20, 15); ctx.quadraticCurveTo(-10, 5, -8, 10);
  ctx.closePath();
  ctx.fillStyle = p.secondary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, 0); ctx.quadraticCurveTo(35, -20, 40, 10);
  ctx.quadraticCurveTo(30, 5, 20, 15); ctx.quadraticCurveTo(10, 5, 8, 10);
  ctx.closePath();
  ctx.fillStyle = p.secondary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  // Body
  drawEllipse(ctx, 0, 5, 14, 18, p.primary, '#000000', 3);
  // Head
  drawCircle(ctx, 0, -16, 14, p.primary, '#000000', 3);
  // Big ears
  ctx.beginPath();
  ctx.moveTo(-8, -24); ctx.lineTo(-14, -42); ctx.lineTo(-2, -26); ctx.closePath();
  ctx.fillStyle = p.primary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, -24); ctx.lineTo(14, -42); ctx.lineTo(2, -26); ctx.closePath();
  ctx.fillStyle = p.primary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  // Eyes
  drawCuteEyes(ctx, 0, -18, 4, p.eye);
}

function drawFish(ctx: CanvasRenderingContext2D, p: Palette) {
  // Bubbles
  drawCircle(ctx, -25, -25, 4, p.accent + '80');
  drawCircle(ctx, -18, -32, 3, p.accent + '80');
  drawCircle(ctx, -30, -18, 2.5, p.accent + '80');
  // Body
  drawEllipse(ctx, 0, 0, 28, 18, p.primary, '#000000', 3);
  // Tail
  ctx.beginPath();
  ctx.moveTo(-28, 0); ctx.lineTo(-42, -14); ctx.lineTo(-42, 14); ctx.closePath();
  ctx.fillStyle = p.secondary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  // Fins
  drawEllipse(ctx, 0, -16, 10, 8, p.secondary, '#000000', 1.5);
  // Eyes
  drawCircle(ctx, 12, -4, 7, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, 14, -3, 4, p.eye);
  // Mouth
  drawCircle(ctx, 24, 2, 4, p.secondary, '#000000', 1.5);
}

function drawFox(ctx: CanvasRenderingContext2D, p: Palette) {
  // Ghost effect
  drawEllipse(ctx, 0, 5, 28, 24, p.secondary + '30');
  // Tail
  drawEllipse(ctx, -25, 10, 14, 20, p.primary, '#000000', 2);
  drawEllipse(ctx, -25, 22, 8, 6, p.accent);
  // Body
  drawEllipse(ctx, 0, 8, 22, 18, p.primary, '#000000', 3);
  // Head
  drawEllipse(ctx, 5, -14, 18, 16, p.primary, '#000000', 3);
  // Big ears
  ctx.beginPath();
  ctx.moveTo(-8, -24); ctx.lineTo(-14, -44); ctx.lineTo(0, -26); ctx.closePath();
  ctx.fillStyle = p.primary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14, -24); ctx.lineTo(22, -44); ctx.lineTo(8, -26); ctx.closePath();
  ctx.fillStyle = p.primary; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  // Snout
  drawEllipse(ctx, 12, -8, 10, 7, p.accent, '#000000', 1.5);
  drawCircle(ctx, 18, -10, 3, '#000000');
  // Eyes
  drawCircle(ctx, 0, -18, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, 1, -17, 3, p.eye);
  drawCircle(ctx, 10, -18, 5, '#ffffff', '#000000', 1.5);
  drawCircle(ctx, 11, -17, 3, p.eye);
}

function drawMole(ctx: CanvasRenderingContext2D, p: Palette) {
  // Body
  drawEllipse(ctx, 0, 8, 24, 20, p.primary, '#000000', 3);
  // Head
  drawCircle(ctx, 0, -14, 16, p.primary, '#000000', 3);
  // Big digging claws
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-30 + i * 4, 20);
    ctx.lineTo(-35 + i * 4, 32);
    ctx.strokeStyle = p.accent; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(30 + i * 4, 20);
    ctx.lineTo(35 + i * 4, 32);
    ctx.strokeStyle = p.accent; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // Tiny eyes
  drawCircle(ctx, -6, -16, 3, '#000000');
  drawCircle(ctx, 6, -16, 3, '#000000');
  // Big nose
  drawEllipse(ctx, 0, -8, 10, 7, '#FF69B4', '#000000', 2);
  // Star mark
  ctx.font = '12px sans-serif';
  ctx.fillStyle = p.accent;
  ctx.textAlign = 'center';
  ctx.fillText('★', 0, -26);
}

function drawPeacock(ctx: CanvasRenderingContext2D, p: Palette) {
  // Tail feathers (fan)
  for (let i = -3; i <= 3; i++) {
    const angle = i * 0.25;
    const x = Math.sin(angle) * 28;
    const y = -Math.cos(angle) * 35 + 10;
    drawEllipse(ctx, x, y, 8, 16, p.secondary, '#000000', 1.5);
    // Eye spots
    drawCircle(ctx, x, y - 8, 4, p.accent);
    drawCircle(ctx, x, y - 8, 2, '#000000');
  }
  // Body
  drawEllipse(ctx, 0, 12, 18, 14, p.primary, '#000000', 3);
  // Neck
  drawRoundRect(ctx, -6, -20, 12, 28, 6, p.primary, '#000000', 3);
  // Head
  drawCircle(ctx, 0, -28, 12, p.primary, '#000000', 3);
  // Crown
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 5, -38); ctx.lineTo(i * 5, -48);
    ctx.strokeStyle = p.accent; ctx.lineWidth = 2; ctx.stroke();
    drawCircle(ctx, i * 5, -50, 3, p.accent, '#000000', 1);
  }
  // Beak
  ctx.beginPath();
  ctx.moveTo(8, -28); ctx.lineTo(16, -26); ctx.lineTo(8, -24); ctx.closePath();
  ctx.fillStyle = '#f97316'; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();
  // Eyes
  drawCuteEyes(ctx, 0, -30, 3, p.eye);
}

function drawDefaultBlob(ctx: CanvasRenderingContext2D, p: Palette) {
  // Simple blob
  drawCircle(ctx, 0, 0, 30, p.primary, '#000000', 3);
  drawCuteEyes(ctx, 0, -5, 6, p.eye);
  ctx.beginPath();
  ctx.arc(0, 8, 10, 0.2, Math.PI - 0.2);
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
}
