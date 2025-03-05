import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [tag, setTag] = useState("");
  const [, navigate] = useLocation();

  const handleJoin = () => {
    if (tag.trim()) {
      navigate(`/game?tag=${encodeURIComponent(tag)}`);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">
            Goat Simulator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter your tag name"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleJoin}
            disabled={!tag.trim()}
          >
            Join Game
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
