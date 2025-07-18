"use client";

import { useRef, useEffect, useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Settings, ChevronDown, Palette, Zap, Grid3X3 } from "lucide-react";

interface ReactFlowGridBackgroundProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: any;
  numSquares?: number;
  className?: string;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
  gridColor?: string;
  flowDirection?: "right" | "left" | "up" | "down" | "diagonal";
  speed?: number;
}

function ReactFlowGridBackground({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 30,
  className,
  maxOpacity = 0.3,
  duration = 4,
  repeatDelay = 0.5,
  gridColor = "rgba(20, 184, 166, 0.3)",
  flowDirection = "diagonal",
  speed = 1,
  ...props
}: ReactFlowGridBackgroundProps) {
  const id = useId();
  const containerRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [squares, setSquares] = useState(() => generateSquares(numSquares));
  const [gridOffset, setGridOffset] = useState({ x: 0, y: 0 });

  function getPos() {
    return [
      Math.floor((Math.random() * dimensions.width) / width),
      Math.floor((Math.random() * dimensions.height) / height),
    ];
  }

  function generateSquares(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      pos: getPos(),
    }));
  }

  const updateSquarePosition = (id: number) => {
    setSquares((currentSquares) =>
      currentSquares.map((sq) =>
        sq.id === id
          ? {
              ...sq,
              pos: getPos(),
            }
          : sq,
      ),
    );
  };

  useEffect(() => {
    if (dimensions.width && dimensions.height) {
      setSquares(generateSquares(numSquares));
    }
  }, [dimensions, numSquares]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [containerRef]);

  useEffect(() => {
    const interval = setInterval(() => {
      const effectiveSpeed = Math.max(speed, 0.1);

      setGridOffset((prev) => {
        switch (flowDirection) {
          case "right":
            return {
              ...prev,
              x: (prev.x - effectiveSpeed + width) % width,
            };
          case "left":
            return {
              ...prev,
              x: (prev.x + effectiveSpeed + width) % width,
            };
          case "up":
            return {
              ...prev,
              y: (prev.y + effectiveSpeed + height) % height,
            };
          case "down":
            return {
              ...prev,
              y: (prev.y - effectiveSpeed + height) % height,
            };
          case "diagonal":
            return {
              x: (prev.x - effectiveSpeed + width) % width,
              y: (prev.y - effectiveSpeed + height) % height,
            };
          default:
            return prev;
        }
      });
    }, 50);

    return () => clearInterval(interval);
  }, [flowDirection, speed, width, height]);

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className,
      )}
      style={{
        fill: gridColor,
        stroke: gridColor,
      }}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x + gridOffset.x}
          y={y + gridOffset.y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeWidth="0.5"
          />
        </pattern>
        <pattern
          id={`${id}-dots`}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x + gridOffset.x}
          y={y + gridOffset.y}
        >
          <circle
            cx={width / 2}
            cy={height / 2}
            r="1"
            fill="currentColor"
            opacity="0.4"
          />
        </pattern>
        <linearGradient id={`${id}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gridColor.replace(/[\d\.]+\)$/, '0.1)')} />
          <stop offset="50%" stopColor={gridColor} />
          <stop offset="100%" stopColor={gridColor.replace(/[\d\.]+\)$/, '0.1)')} />
        </linearGradient>
      </defs>
      
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <rect width="100%" height="100%" fill={`url(#${id}-dots)`} />
      
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ pos: [x, y], id }, index) => (
          <motion.rect
            initial={{ opacity: 0 }}
            animate={{ opacity: maxOpacity }}
            transition={{
              duration,
              repeat: Infinity,
              delay: index * 0.1,
              repeatType: "reverse",
            }}
            onAnimationComplete={() => updateSquarePosition(id)}
            key={`${x}-${y}-${index}`}
            width={width - 1}
            height={height - 1}
            x={x * width + 1}
            y={y * height + 1}
            fill={`url(#${id}-gradient)`}
            strokeWidth="0"
            rx="2"
          />
        ))}
      </svg>

      <rect
        width="100%"
        height="100%"
        fill="url(#fade-gradient)"
        className="pointer-events-none"
      />
      
      <defs>
        <radialGradient id="fade-gradient">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="70%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

interface BackgroundPreset {
  id: string;
  name: string;
  description: string;
  config: ReactFlowGridBackgroundProps;
  bgColor: string;
  textColor: string;
  maskImage: string;
}

const backgroundPresets: BackgroundPreset[] = [
  {
    id: "subtle-blue",
    name: "Subtle Blue Flow",
    description: "Gentle diagonal movement with blue tones",
    config: {
      width: 40,
      height: 40,
      numSquares: 20,
      maxOpacity: 0.3,
      duration: 4,
      flowDirection: "diagonal",
      speed: 0.5,
      gridColor: "rgba(59, 130, 246, 0.15)",
    },
    bgColor: "bg-slate-50",
    textColor: "text-slate-800",
    maskImage: "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
  },
  {
    id: "fast-rightward",
    name: "Fast Rightward Flow",
    description: "High-speed horizontal movement with emerald grid",
    config: {
      width: 30,
      height: 30,
      numSquares: 35,
      maxOpacity: 0.5,
      duration: 2,
      flowDirection: "right",
      speed: 1.5,
      gridColor: "rgba(16, 185, 129, 0.2)",
    },
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-800",
    maskImage: "[mask-image:linear-gradient(90deg,transparent,white_20%,white_80%,transparent)]",
  },
  {
    id: "purple-upward",
    name: "Purple Upward Flow",
    description: "Vertical movement with purple gradient effects",
    config: {
      width: 45,
      height: 45,
      numSquares: 25,
      maxOpacity: 0.4,
      duration: 3.5,
      flowDirection: "up",
      speed: 1.0,
      gridColor: "rgba(147, 51, 234, 0.18)",
    },
    bgColor: "bg-purple-50",
    textColor: "text-purple-800",
    maskImage: "[mask-image:linear-gradient(180deg,transparent,white_30%,white_70%,transparent)]",
  },
  {
    id: "dense-orange",
    name: "Dense Orange Grid",
    description: "Small grid cells with leftward flow",
    config: {
      width: 25,
      height: 25,
      numSquares: 40,
      maxOpacity: 0.35,
      duration: 2.5,
      flowDirection: "left",
      speed: 1.2,
      gridColor: "rgba(249, 115, 22, 0.2)",
    },
    bgColor: "bg-orange-50",
    textColor: "text-orange-800",
    maskImage: "[mask-image:radial-gradient(ellipse_800px_400px_at_center,white,transparent)]",
  },
  {
    id: "slow-downward",
    name: "Slow Downward Flow",
    description: "Relaxed downward movement with rose tones",
    config: {
      width: 60,
      height: 60,
      numSquares: 15,
      maxOpacity: 0.25,
      duration: 5,
      flowDirection: "down",
      speed: 0.3,
      gridColor: "rgba(244, 63, 94, 0.15)",
    },
    bgColor: "bg-rose-50",
    textColor: "text-rose-800",
    maskImage: "[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]",
  },
  {
    id: "high-energy-diagonal",
    name: "High-Energy Diagonal",
    description: "Fast diagonal flow with cyan highlights",
    config: {
      width: 35,
      height: 35,
      numSquares: 45,
      maxOpacity: 0.6,
      duration: 1.5,
      flowDirection: "diagonal",
      speed: 2.0,
      gridColor: "rgba(6, 182, 212, 0.25)",
    },
    bgColor: "bg-cyan-50",
    textColor: "text-cyan-800",
    maskImage: "[mask-image:conic-gradient(from_0deg_at_center,transparent,white_45deg,white_315deg,transparent)]",
  },
  {
    id: "neon-pulse",
    name: "Neon Pulse",
    description: "Electric green with pulsing animation",
    config: {
      width: 50,
      height: 50,
      numSquares: 30,
      maxOpacity: 0.7,
      duration: 1,
      flowDirection: "diagonal",
      speed: 1.8,
      gridColor: "rgba(34, 197, 94, 0.3)",
    },
    bgColor: "bg-gray-900",
    textColor: "text-green-400",
    maskImage: "[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]",
  },
  {
    id: "matrix-rain",
    name: "Matrix Rain",
    description: "Vertical flowing grid like digital rain",
    config: {
      width: 20,
      height: 20,
      numSquares: 60,
      maxOpacity: 0.8,
      duration: 0.8,
      flowDirection: "down",
      speed: 2.5,
      gridColor: "rgba(20, 184, 166, 0.4)",
    },
    bgColor: "bg-black",
    textColor: "text-teal-300",
    maskImage: "[mask-image:linear-gradient(180deg,transparent,white_10%,white_90%,transparent)]",
  },
];

function ReactFlowGridDemo() {
  const [selectedPreset, setSelectedPreset] = useState<BackgroundPreset>(backgroundPresets[0]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customConfig, setCustomConfig] = useState<ReactFlowGridBackgroundProps>(selectedPreset.config);

  const updateCustomConfig = (key: keyof ReactFlowGridBackgroundProps, value: any) => {
    setCustomConfig(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: BackgroundPreset) => {
    setSelectedPreset(preset);
    setCustomConfig(preset.config);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Main Background Display */}
      <div className={cn("relative h-full w-full transition-colors duration-500", selectedPreset.bgColor)}>

        {/* Animated Background */}
        <ReactFlowGridBackground
          {...customConfig}
          className={cn("transition-all duration-500", selectedPreset.maskImage)}
        />
      </div>

      {/* Settings Panel */}
      <div className="absolute top-4 right-4 z-20">
        <motion.div
          initial={false}
          animate={{ width: isSettingsOpen ? 320 : 48 }}
          className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden"
        >
          {/* Settings Toggle Button */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>

          {/* Settings Content */}
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t"
              >
                <div className="p-4 max-h-[80vh] overflow-y-auto">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Background Presets
                  </h3>

                  {/* Preset Grid */}
                  <div className="grid grid-cols-1 gap-2 mb-6">
                    {backgroundPresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(preset)}
                        className={cn(
                          "text-left p-3 rounded-lg border transition-all hover:shadow-md",
                          selectedPreset.id === preset.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="font-medium text-sm text-gray-800">
                          {preset.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {preset.description}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Controls */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Custom Settings
                    </h4>

                    <div className="space-y-3">
                      {/* Speed Control */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Speed: {customConfig.speed}
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="3"
                          step="0.1"
                          value={customConfig.speed}
                          onChange={(e) => updateCustomConfig('speed', parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Opacity Control */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Opacity: {customConfig.maxOpacity}
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={customConfig.maxOpacity}
                          onChange={(e) => updateCustomConfig('maxOpacity', parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Grid Size */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Grid Size: {customConfig.width}px
                        </label>
                        <input
                          type="range"
                          min="20"
                          max="80"
                          step="5"
                          value={customConfig.width}
                          onChange={(e) => {
                            const size = parseInt(e.target.value);
                            updateCustomConfig('width', size);
                            updateCustomConfig('height', size);
                          }}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Number of Squares */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Squares: {customConfig.numSquares}
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="80"
                          step="5"
                          value={customConfig.numSquares}
                          onChange={(e) => updateCustomConfig('numSquares', parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Flow Direction */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Flow Direction
                        </label>
                        <select
                          value={customConfig.flowDirection}
                          onChange={(e) => updateCustomConfig('flowDirection', e.target.value)}
                          className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="right">Right →</option>
                          <option value="left">Left ←</option>
                          <option value="up">Up ↑</option>
                          <option value="down">Down ↓</option>
                          <option value="diagonal">Diagonal ↗</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export { ReactFlowGridBackground, ReactFlowGridDemo };
export default ReactFlowGridDemo;
