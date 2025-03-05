import React, { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { GameEngine } from "@/game/engine";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
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

    // Initialize game engine with better error handling
    let engine; // Declare engine at the useEffect scope level
    try {
      engine = new GameEngine(canvas);
      engineRef.current = engine;
    } catch (error) {
      console.error("Failed to initialize game engine:", error);
      
      // Add a user-friendly message to the page
      const errorDiv = document.createElement('div');
      errorDiv.style.position = 'absolute';
      errorDiv.style.top = '10px';
      errorDiv.style.left = '10px';
      errorDiv.style.padding = '10px';
      errorDiv.style.backgroundColor = 'rgba(255,0,0,0.7)';
      errorDiv.style.color = 'white';
      errorDiv.style.borderRadius = '5px';
      errorDiv.style.zIndex = '1000';
      errorDiv.innerHTML = `
        <h3>WebGL Not Available</h3>
        <p>This game requires WebGL which is not available in your current environment.</p>
        <p>Try opening this app in a new tab by clicking the "Open in new tab" button in the upper right.</p>
      `;
      
      canvasContainerRef.current?.appendChild(errorDiv);
      
      // Canvas error message is handled in the renderer
      return;
    }

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
      switch (e.key.toLowerCase()) {
        case " ":
          // Jump
          engine.emit("jump", true);
          break;
        case "shift":
          // Charge
          engine.charge(true);
          break;
        case "w":
          // Move forward
          engine.emit("move", { direction: "forward", active: true });
          break;
        case "s":
          // Move backward
          engine.emit("move", { direction: "backward", active: true });
          break;
        case "a":
          // Move left
          engine.emit("move", { direction: "left", active: true });
          break;
        case "d":
          // Move right
          engine.emit("move", { direction: "right", active: true });
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case " ":
          // Stop jumping
          engine.emit("jump", false);
          break;
        case "shift":
          // Stop charging
          engine.charge(false);
          break;
        case "w":
          // Stop moving forward
          engine.emit("move", { direction: "forward", active: false });
          break;
        case "s":
          // Stop moving backward
          engine.emit("move", { direction: "backward", active: false });
          break;
        case "a":
          // Stop moving left
          engine.emit("move", { direction: "left", active: false });
          break;
        case "d":
          // Stop moving right
          engine.emit("move", { direction: "right", active: false });
          break;
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
    <div className="h-screen w-full relative" ref={canvasContainerRef}>
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 bg-black/50 p-3 rounded text-white text-sm">
        <h3 className="font-bold mb-1">Controls:</h3>
        <ul className="space-y-1">
          <li>W/A/S/D - Movement</li>
          <li>Space - Jump</li>
          <li>Shift - Charge</li>
        </ul>
      </div>

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