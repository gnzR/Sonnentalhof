import { AvatarConfig } from '../types/game';

function px(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  scale = 3
) {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.floor(ox + x * scale),
    Math.floor(oy + y * scale),
    Math.ceil(w * scale),
    Math.ceil(h * scale)
  );
}

export function drawPixelAvatar(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  avatar: AvatarConfig,
  scale = 3,
  animTick = 0,
  moving = false,
  jumpProgress = 0,
  nightFactor = 0,
  shadowDx = 0,
  shadowDy = 0,
  shadowAlpha = 0.22
) {
  const isJumping = jumpProgress > 0 && jumpProgress < 1;
  const arc = isJumping ? Math.sin(jumpProgress * Math.PI) : 0;
  const jumpOffsetPx = isJumping ? -arc * 8.5 * scale : 0;
  const bob = isJumping ? 0 : moving ? (Math.sin(animTick * 0.35) > 0 ? -1 : 0) : 0;
  const stepOffset = isJumping ? 0 : moving ? Math.sin(animTick * 0.4) * 1.2 : 0;
  const armSwing = isJumping ? 0 : moving ? Math.sin(animTick * 0.4) * 0.9 : 0;

  const shadowScale = isJumping ? Math.max(0.45, 1 - arc * 0.5) : 1;
  const sw = Math.round(10 * scale * shadowScale);
  const sx = Math.floor(ox + (16 * scale - sw) / 2 + shadowDx * scale);
  const sy = Math.floor(oy + 14 * scale + shadowDy * scale);
  ctx.fillStyle = `rgba(0,0,0,${(shadowAlpha * shadowScale).toFixed(2)})`;
  ctx.fillRect(sx, sy, sw, Math.max(2, Math.round(2 * scale * shadowScale)));

  const bodyOy = oy + jumpOffsetPx + bob * scale;

  if (isJumping) {
    px(ctx, ox, oy + jumpOffsetPx, 4, 11, 2, 3, '#3f2e21', scale);
    px(ctx, ox, oy + jumpOffsetPx, 10, 11, 2, 3, '#3f2e21', scale);
  } else {
    px(ctx, ox, oy, 5, 12 + Math.max(0, stepOffset), 2, 3, '#3f2e21', scale);
    px(ctx, ox, oy, 9, 12 + Math.max(0, -stepOffset), 2, 3, '#3f2e21', scale);
  }

  px(ctx, ox, bodyOy, 4, 8, 8, 4, avatar.outfitColor, scale);
  // Subtle shoulder highlight & hem depth
  px(ctx, ox, bodyOy, 4, 8, 8, 1, 'rgba(255,255,255,0.16)', scale);
  px(ctx, ox, bodyOy, 5, 9, 6, 4, avatar.overallsColor, scale);
  px(ctx, ox, bodyOy, 5, 12, 6, 1, 'rgba(0,0,0,0.18)', scale);
  px(ctx, ox, bodyOy, 5, 8, 1, 2, avatar.overallsColor, scale);
  px(ctx, ox, bodyOy, 10, 8, 1, 2, avatar.overallsColor, scale);

  if (isJumping) {
    px(ctx, ox, bodyOy, 2, 5, 2, 4, avatar.skinTone, scale);
    px(ctx, ox, bodyOy, 12, 5, 2, 4, avatar.skinTone, scale);
  } else {
    px(ctx, ox, bodyOy, 3, 8 - armSwing * 0.7, 1, 3, avatar.skinTone, scale);
    px(ctx, ox, bodyOy, 12, 8 + armSwing * 0.7, 1, 3, avatar.skinTone, scale);
  }

  px(ctx, ox, bodyOy, 5, 3, 6, 5, avatar.skinTone, scale);
  px(ctx, ox, bodyOy, 5, 7, 6, 1, 'rgba(0,0,0,0.08)', scale);

  if (avatar.hairStyle !== 'bald') {
    px(ctx, ox, bodyOy, 4, 2, 8, 2, avatar.hairColor, scale);
    px(ctx, ox, bodyOy, 5, 2, 6, 1, 'rgba(255,255,255,0.14)', scale);
    if (avatar.hairStyle === 'long' || avatar.hairStyle === 'braids') {
      px(ctx, ox, bodyOy, 4, 4, 1, 5, avatar.hairColor, scale);
      px(ctx, ox, bodyOy, 11, 4, 1, 5, avatar.hairColor, scale);
    } else if (avatar.hairStyle === 'bob') {
      px(ctx, ox, bodyOy, 4, 4, 1, 3, avatar.hairColor, scale);
      px(ctx, ox, bodyOy, 11, 4, 1, 3, avatar.hairColor, scale);
    } else if (avatar.hairStyle === 'curly') {
      px(ctx, ox, bodyOy, 4, 1, 8, 2, avatar.hairColor, scale);
      px(ctx, ox, bodyOy, 3, 3, 1, 3, avatar.hairColor, scale);
      px(ctx, ox, bodyOy, 12, 3, 1, 3, avatar.hairColor, scale);
    }
  }

  px(ctx, ox, bodyOy, 6, 5, 1, 1, avatar.eyeColor, scale);
  px(ctx, ox, bodyOy, 9, 5, 1, 1, avatar.eyeColor, scale);

  if (avatar.glasses) {
    px(ctx, ox, bodyOy, 5, 5, 3, 1, 'rgba(15,23,42,0.75)', scale);
    px(ctx, ox, bodyOy, 8, 5, 3, 1, 'rgba(15,23,42,0.75)', scale);
  }

  if (avatar.beard) {
    px(ctx, ox, bodyOy, 6, 7, 4, 2, avatar.hairColor, scale);
  }

  if (avatar.hat === 'straw') {
    px(ctx, ox, bodyOy, 2, 2, 12, 1, '#eab308', scale);
    px(ctx, ox, bodyOy, 4, 0, 8, 2, '#facc15', scale);
    px(ctx, ox, bodyOy, 5, 0, 6, 1, '#fef08a', scale);
    px(ctx, ox, bodyOy, 4, 1, 8, 1, '#dc2626', scale);
  } else if (avatar.hat === 'cap') {
    px(ctx, ox, bodyOy, 4, 1, 8, 2, '#2563eb', scale);
    px(ctx, ox, bodyOy, 5, 1, 6, 1, '#60a5fa', scale);
    px(ctx, ox, bodyOy, 4, 2, 10, 1, '#1d4ed8', scale);
  } else if (avatar.hat === 'beret') {
    px(ctx, ox, bodyOy, 3, 1, 9, 2, '#0f766e', scale);
    px(ctx, ox, bodyOy, 4, 1, 6, 1, '#14b8a6', scale);
    px(ctx, ox, bodyOy, 7, 0, 2, 1, '#115e59', scale);
  } else if (avatar.hat === 'flower') {
    px(ctx, ox, bodyOy, 4, 2, 8, 1, '#22c55e', scale);
    px(ctx, ox, bodyOy, 5, 1, 2, 2, '#f43f5e', scale);
    px(ctx, ox, bodyOy, 9, 1, 2, 2, '#facc15', scale);
  } else if (avatar.hat === 'beanie') {
    px(ctx, ox, bodyOy, 4, 0, 8, 3, '#b91c1c', scale);
    px(ctx, ox, bodyOy, 5, 0, 6, 1, '#ef4444', scale);
    px(ctx, ox, bodyOy, 6, -1, 4, 1, '#fef2f2', scale);
  }

  if (nightFactor > 0.25) {
    const swing = moving ? Math.round(Math.sin(animTick * 0.35)) : 0;
    const lx = 13 + swing * 0.4;
    const ly = isJumping ? 6 : 9;
    px(ctx, ox, bodyOy, lx, ly - 1, 2, 1, '#334155', scale);
    px(ctx, ox, bodyOy, lx - 0.5, ly, 3, 3, '#475569', scale);
    px(ctx, ox, bodyOy, lx, ly + 0.5, 2, 2, '#fef08a', scale);
    px(ctx, ox, bodyOy, lx + 0.5, ly + 1, 1, 1, '#ffffff', scale);
  }
}
