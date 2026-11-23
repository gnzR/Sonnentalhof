import React, { useEffect, useRef } from 'react';
import { drawToolCursorIcon } from '../graphics/pixelSprites';
import { ToolType } from '../types/game';

interface PixelToolIconProps {
  tool: ToolType;
  size?: number;
  seedColor?: string;
  wateringCanTier?: 1 | 2 | 3 | 4;
}

export const PixelToolIcon: React.FC<PixelToolIconProps> = ({
  tool,
  size = 18,
  seedColor = '#4ade80',
  wateringCanTier = 1,
}) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / 16;
    drawToolCursorIcon(ctx, 0, 0, tool, scale, 0, false, seedColor, wateringCanTier);
  }, [tool, seedColor, wateringCanTier]);

  return (
    <canvas
      ref={ref}
      width={32}
      height={32}
      style={{ width: size, height: size }}
      className="pixelated shrink-0"
    />
  );
};
