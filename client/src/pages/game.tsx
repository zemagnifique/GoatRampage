import React, { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { GameEngine } from "@/game/engine";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [, navigate] = useLocation();
  const playerTag = new URLSearchParams(window.location.search).get("tag") || "";
  const [playerStats, setPlayerStats] = React.useState(null);

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

    // Use window event for player stats
    const handlePlayerStats = (event: CustomEvent) => {
      const { player } = event.detail;
      if (player) {
        setPlayerStats({...player, distanceWalked: player.distanceWalked})
      }
    };

    // Add event listener for player stats
    window.addEventListener('playerStatsUpdated', handlePlayerStats as EventListener);

    // Join game with the tag
    engine.join(tag || 'anonymous');

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
      window.removeEventListener('playerStatsUpdated', handlePlayerStats as EventListener);
      engine.destroy();
    };
  }, [playerTag]);

  return (
    <div className="h-screen w-full relative">
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Player stats UI */}
      <div className="absolute top-4 left-4 bg-black/50 p-4 rounded-lg text-white">
        <h2 className="text-xl font-bold mb-2">{playerTag}'s Goat</h2>
        {playerStats && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Health:</span>
              <div className="w-32 h-4 bg-gray-700 rounded overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${playerStats.health}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between">
              <span>Score:</span>
              <span>{playerStats.score}</span>
            </div>
            <div className="flex justify-between">
              <span>Damage Dealt:</span>
              <span>{playerStats.damageDealt || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Distance Walked:</span>
              <span>{Math.floor((playerStats.distanceWalked || 0) * 10) / 10} m</span>
            </div>
          </div>
        )}
        <div className="mt-4">
          <p className="text-xs">Space: Charge | Arrow Keys: Move</p>
        </div>
      </div>
    </div>
  );
}