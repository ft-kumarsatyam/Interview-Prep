"use client";

import { useMemo, useState } from "react";
import { Brain, Coffee, History, Lightbulb, RefreshCw, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/core/utils";
import { JOKES, PUZZLES, type FunCategory, type Puzzle } from "@/modules/fun/domain/fun-content";

const categories: Array<{ id: FunCategory | "all"; label: string; icon: typeof Brain }> = [
  { id: "all", label: "All", icon: Lightbulb },
  { id: "software", label: "Software", icon: Brain },
  { id: "general", label: "General", icon: Smile },
  { id: "history", label: "History", icon: History },
];

export function FunShelf() {
  const [category, setCategory] = useState<FunCategory | "all">("all");
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [jokeIndex, setJokeIndex] = useState(0);
  const puzzles = useMemo(() => PUZZLES.filter((p) => category === "all" || p.category === category), [category]);
  const puzzle: Puzzle = puzzles[puzzleIndex % Math.max(1, puzzles.length)] ?? PUZZLES[0]!;
  const joke = JOKES[jokeIndex % JOKES.length]!;

  const nextPuzzle = () => {
    setPuzzleIndex((i) => (i + 1) % Math.max(1, puzzles.length));
    setShowAnswer(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map(({ id, label, icon: Icon }) => (
          <Button key={id} variant={category === id ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => { setCategory(id); setPuzzleIndex(0); setShowAnswer(false); }}>
            <Icon className="mr-1.5 size-3.5" aria-hidden /> {label}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="size-4 text-primary" aria-hidden /> Puzzle break</CardTitle>
            <CardDescription>{puzzles.length} puzzles in this shelf · solve one, then get back to the plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-base leading-7">{puzzle.question}</p>
            <p className="mt-3 text-xs text-muted-foreground">Hint: {puzzle.hint}</p>
            {showAnswer && <div className="mt-4 rounded-xl bg-success/10 p-4 text-sm text-success"><span className="font-medium">Answer: </span>{puzzle.answer}</div>}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => setShowAnswer(true)} disabled={showAnswer}>Reveal answer</Button>
              <Button variant="outline" onClick={nextPuzzle}><RefreshCw className="mr-2 size-4" /> Next puzzle</Button>
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-primary/20 bg-primary/[0.03]")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Coffee className="size-4 text-primary" aria-hidden /> Hourly smile</CardTitle>
            <CardDescription>After an hour, take five minutes away from the screen.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-base leading-7">{joke.text}</p>
            <p className="mt-4 text-xs text-muted-foreground">Break suggestion: {joke.breakMinutes} minutes</p>
            <Button variant="outline" className="mt-4" onClick={() => setJokeIndex((i) => (i + 1) % JOKES.length)}>Another one</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
