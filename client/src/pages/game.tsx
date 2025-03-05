import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { GameEngine } from "@/game/engine";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [, navigate] = useLocation();
  
  useEffect(() => {
    const tag = new URLSearchParams(window.location.search).get("tag");
    if (!tag) {
      navigate("/");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Setup canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize game engine
    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.join(tag);

    // Handle keyboard input
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case " ":
          engine.charge(true);
          break;
        case "ArrowLeft":
        case "ArrowRight":
        case "ArrowUp":
        case "ArrowDown":
          // Handle movement
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        engine.charge(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      engine.destroy();
    };
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden bg-background">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  );
}
