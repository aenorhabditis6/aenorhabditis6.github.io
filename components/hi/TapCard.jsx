"use client";

import { useState, useSyncExternalStore } from "react";
import { eventAt } from "./events";
import "./hi.css";

const EMAIL = "tinashen@stanford.edu";

const LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/tinashen26/" },
  { label: "GitHub", href: "https://github.com/aenorhabditis6" },
  { label: "All my work", href: "/" },
];

const WORK = [
  {
    year: "2026",
    title: "Flow matching for physics simulation",
    line: "Google Summer of Code, ML4SCI. Upgraded a physics-informed surrogate for particle-shower simulation; its flow-matching mode samples 25× faster, checked by an evaluation suite calibrated against real-vs-real noise floors.",
  },
  {
    year: "2026",
    title: "RLVR vs RLHF",
    line: "Sample complexity of verifiable rewards versus learned reward models, with GRPO-style post-training on Qwen2.5 (GSM8K, MATH).",
  },
  {
    year: "2025",
    title: "Physics-informed diffusion for sparse-view CT",
    line: "Stanford Radiological Sciences Lab. A diffusion prior guided by the sparse-view data, judged by whether the spine still segments.",
  },
  {
    year: "2026",
    title: "StudyPet",
    line: "A macOS desktop pet that knows your class schedule and Canvas deadlines.",
    href: "https://github.com/aenorhabditis6/studypet-releases",
  },
  {
    year: "2026",
    title: "May You Be Recognized",
    line: "AI short film made in 12 hours with Runway. 2nd place, Discovery track, Valley101 hackathon.",
    href: "https://lnkd.in/gB84CycP",
  },
];

// The page is exported statically, so the greeting can only be decided on the
// phone that opened it. The server snapshot is null, which keeps the first
// paint identical to the exported HTML; eventAt returns the same EVENTS entry
// each call, so the snapshot is stable between renders.
const noSubscribe = () => () => {};
function Greeting() {
  const event = useSyncExternalStore(
    noSubscribe,
    () => eventAt(new Date()),
    () => null,
  );
  if (!event) return null;
  return <p className="hi-event">Nice to meet you at {event.name}</p>;
}

// Drawn inline rather than loaded as the ring's arrow file, so it takes the
// button's colour, white on the filled one.
function Arrow() {
  return (
    <svg className="hi-arrow" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M4.5 11.5l7-7M5.5 4.5h6v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export default function TapCard() {
  const [copied, setCopied] = useState(false);
  const copyEmail = () => {
    navigator.clipboard
      ?.writeText(EMAIL)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <main className="hi">
      <div className="hi-card">
        <header className="hi-head">
          <Greeting />
          <h1 className="hi-name">Xinming (Tina) Shen</h1>
          <p className="hi-lede">
            Stanford ICME MS ’28. Scientific ML and generative models: diffusion
            and flow matching, physics-informed networks, CT reconstruction.
          </p>
          <p className="hi-lede">
            Looking for Summer 2027 research and ML engineering internships.
          </p>
        </header>

        <nav className="hi-actions" aria-label="Contact">
          <a className="hi-btn hi-btn-primary" href="/tina.vcf">
            Save my contact
            <span className="hi-btn-note">adds me to Contacts</span>
          </a>
          {LINKS.map((l) => (
            <a
              key={l.label}
              className="hi-btn"
              href={l.href}
              {...(l.href.startsWith("http")
                ? { target: "_blank", rel: "noopener" }
                : {})}
            >
              {l.label}
              <Arrow />
            </a>
          ))}
          <div className="hi-email">
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            <button type="button" onClick={copyEmail}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </nav>

        <section className="hi-work" aria-labelledby="hi-work-title">
          <h2 id="hi-work-title" className="hi-label">
            Recent work
          </h2>
          <ul>
            {WORK.map((w) => (
              <li key={w.title}>
                <span className="hi-year">{w.year}</span>
                <div>
                  {w.href ? (
                    <a
                      className="hi-work-title"
                      href={w.href}
                      target="_blank"
                      rel="noopener"
                    >
                      {w.title}
                      <Arrow />
                    </a>
                  ) : (
                    <span className="hi-work-title">{w.title}</span>
                  )}
                  <p>{w.line}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
