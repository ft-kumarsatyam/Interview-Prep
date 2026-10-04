"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { cn } from "@/core/utils";

const DESI_LINES = [
    "Rukja Bsdk!",
    "10 sec aur de!",
    "Sab tujhe abhi hi chayie lawde!",
    "Bhai ab kya gaand maarke maanega!?",
    "Chill kar, server ko bhi chai chahiye.",
    "Bas aa gaya — itna impatient kyun hai?",
    "Abe saans toh le le bhai!",
    "Tere baap ka server nahi hai, thoda wait kar!",
    "Bsdk, loading hai, shaadi ka mandap nahi!",
    "Itni jaldi toh tera breakup bhi nahi hua tha!",
    "Bhai, NASA ka server nahi hai ye!",
    "Thoda sabr kar, Gandhi ji ka desh hai!",
    "Abe refresh mat maar, maa kasam kuch nahi hoga!",
    "Ek second ruk ja, tera baap bana raha hai!",
    "Bhai, backend mein mazdoor lage hue hain!",
    "Server ko heart attack mat de, ruk ja!",
    "Abe itna kya jaldi hai, rishta thodi toot raha hai!",
    "Loading ho rahi hai, teri zindagi nahi!",
    "Bhai, internet se tez toh tera dimaag bhi nahi chalta!",
    "Aaram se lawde, kahin bhaag nahi raha!",
    "Bas hone wala hai, apni jaan kyun jala raha hai?",
    "Bhai, patience naam ki bhi koi cheez hoti hai!",
    "Abe ruk ja, code ko saans toh lene de!",
    "Itna spam karega toh server teri shakal block kar dega!",
    "Teri impatience dekh ke CPU bhi garam ho gaya!",
    "Bhai, ek chai peeke aa, tab tak ho jayega!",
    "Abe loading hai, teri aukaat ka test nahi!",
    "Server soch raha hai ki tujhe response dena bhi chahiye ya nahi!",
    "Bhai, thoda wait kar, free mein rocket nahi ban raha!",
    "Abe lawde, spinner ko ghuma-ghuma ke thaka diya!",
    "Teri jaldi mein database ne resign kar diya!",
    "Bhai, backend wale ki bhi life hai!",
    "Abe itna mat dekh, sharma jayega!",
    "Thoda ruk, tera data Himalaya se aa raha hai!",
    "Bsdk, quantum computer nahi hai mere paas!",
    "Ek minute mein kya ukhaad lega bhai?",
    "Teri impatience ka alag hi subscription hai!",
    "Bhai, loading screen hai, Tinder match nahi!",
    "Abe wait kar, tera result UPSC se pehle aa jayega!",
    "Server ko gaali mat de, woh bhi apna bhai hai!",
    "Bhai, request bheji hai, baraat nahi!",
    "Abe thoda chill kar, cortisol badh jayega!",
    "Bas bhai, ab toh ho hi gaya samajh le!",
    "Itni jaldi toh tu naha ke bhi nahi nikalta!",
    "Bhai, code compile ho raha hai, biryani nahi pak rahi!",
    "Abe patience rakh, warna loading tujhe load kar degi!",
    "Server bol raha hai: 'Bhai, thoda personal space de!'",
    "Bsdk, har second click karne se speed nahi badhegi!",
    "Abe ruk, teri request VIP line mein hai!",
    "Bhai, bas final touch chal raha hai!",
    "Ho jayega lawde, itna emotional mat ho!",
];

const CLEAN_LINES = [
  "Almost there — setting things up.",
  "A few more seconds, you’ve got this.",
  "The good stuff is loading.",
  "Small pause. Big progress.",
  "Your prep cockpit is warming up.",
  "Hold tight — greatness takes a second.",
  "Getting everything ready for your next big move.",
  "Sharpening your interview skills, one second at a time.",
  "Your future offer letter is loading... almost.",
  "Making the magic happen behind the scenes.",
  "Good things come to those who wait.",
  "Warming up the engines. Let's get to work.",
  "Your next breakthrough is just around the corner.",
  "Building your perfect preparation space.",
  "Almost ready — stay in the zone.",
  "Loading your unfair advantage.",
  "Getting your brain into interview mode.",
  "A little patience, a lot of progress.",
  "Setting the stage for your next career move.",
  "Your dream job prep starts here.",
  "Just a moment — greatness is worth the wait.",
  "Organizing the chaos into a master plan.",
  "Preparing something worth waiting for.",
  "Your next level is almost unlocked.",
  "The setup is temporary. Your skills are forever.",
  "Booting up your personal growth engine.",
  "One step closer to cracking that interview.",
  "Your preparation journey is about to begin.",
  "Loading focus mode. Distractions not invited.",
  "Getting your learning dashboard ready.",
  "Good things are compiling in the background.",
  "Your career upgrade is initializing.",
  "Almost done — time to put in the work.",
  "The cockpit is ready for takeoff.",
  "Turning ambition into action. Just a second.",
  "Your next chapter is loading.",
  "Making room for some serious progress.",
  "Stay focused. Your future self will thank you.",
  "Preparing your daily dose of improvement.",
  "Every expert started somewhere. Let's begin.",
  "The grind is about to get real.",
  "Your interview prep HQ is coming online.",
  "A fresh start is just a moment away.",
  "Loading your next opportunity.",
  "Behind every great session is a little setup time.",
  "Getting your tools ready. Your turn is next.",
  "Your goals aren't going anywhere. Almost ready.",
  "The wait is short. The ambition is big.",
  "Initializing beast mode. Please stand by.",
  "Your comeback story starts in a few seconds.",
  "Ready to learn, build, and level up?",
];

function isDesiModeEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem("prepos:desi-mode") !== "off";
}

/** A friendly streaming fallback shared by route loading states. */
export function PersonalityLoader({ label = "Loading", className }: { label?: string; className?: string }) {
  const [desi, setDesi] = useState(true);
  const [line, setLine] = useState(DESI_LINES[0]);

  useEffect(() => {
    const onStorage = () => setDesi(isDesiModeEnabled());
    window.addEventListener("storage", onStorage);
    window.addEventListener("prepos:desi-mode", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("prepos:desi-mode", onStorage);
    };
  }, []);

  useEffect(() => {
    const lines = desi ? DESI_LINES : CLEAN_LINES;
    const reset = window.setTimeout(() => setLine(lines[0] ?? label), 0);
    const timer = window.setInterval(() => {
      setLine((current) => {
        const index = Math.max(0, lines.indexOf(current));
        return lines[(index + 1) % lines.length] ?? label;
      });
    }, 1800);
    return () => {
      window.clearTimeout(reset);
      window.clearInterval(timer);
    };
  }, [desi, label]);

  return (
    <div aria-busy="true" aria-live="polite" className={cn("grid min-h-52 place-items-center rounded-2xl border bg-card/70 p-6 ring-1 ring-foreground/5", className)}>
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="relative grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <LoaderCircle className="size-7 animate-spin motion-reduce:animate-none" aria-hidden />
          <Sparkles className="absolute -right-1 -top-1 size-4 animate-pulse motion-reduce:animate-none" aria-hidden />
        </div>
        <div>
          <p className="font-medium">{line}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label} · breathe, you’re good</p>
        </div>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-[loading-sweep_1.4s_ease-in-out_infinite] rounded-full bg-primary motion-reduce:animate-none" />
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
