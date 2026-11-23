import React, { useEffect, useRef } from 'react';
import { drawPixelAvatar } from '../graphics/avatarSprite';
import { AvatarConfig } from '../types/game';

interface PixelAvatarCanvasProps {
  avatar: AvatarConfig;
  size?: number;
  className?: string;
}

export const PixelAvatarCanvas: React.FC<PixelAvatarCanvasProps> = ({
  avatar,
  size = 64,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);

    // Subtle meadow backdrop behind portrait
    ctx.fillStyle = '#d9f0c7';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#9bd474';
    ctx.fillRect(0, Math.floor(size * 0.72), size, size);

    const scale = Math.max(2, Math.floor(size / 18));
    const spriteSize = 16 * scale;
    const ox = Math.floor((size - spriteSize) / 2);
    const oy = Math.floor((size - spriteSize) / 2);

    drawPixelAvatar(ctx, ox, oy, avatar, scale, 0, false);
  }, [avatar, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`pixelated block ${className}`}
    />
  );
};
