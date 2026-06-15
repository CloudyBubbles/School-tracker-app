# Schoolwork Tracker — Resume Note

Quick catch-up so you can pick this up cold in a fresh chat, even days later.

## What it is
A schoolwork tracker app. Stack: Next.js + TypeScript + Tailwind. Lives in `C:\Users\willd\dev\schoolwork-tracker`. Data is saved in the browser's local storage (no database yet).

## What's built and working (all tested)
- Add an assignment: subject, title, due date, status, notes.
- Saves and survives a refresh.
- Sidebar listing each subject, with dropdowns showing that subject's assignments.
- Overall Progress card: X of Y done, with a progress bar.
- Upcoming / timeline: assignments ordered by due date, overdue ones flagged in red.
- Click an assignment's status badge to cycle it (To do -> In progress -> Done).
- Delete an assignment.
- A visual polish pass for desktop and mobile.

## How to start it again
1. Open a terminal in the project folder (`cd dev\schoolwork-tracker`).
2. Start the dev server: `npm run dev` (or just tell Claude Code "start the dev server").
3. Open `localhost:3000` in your browser.

## Starting a fresh Claude Code chat on it
After `/clear`, the chat has no memory of the project. Orient it with this first line, then add what you want to do:

> This is a Next.js + TypeScript + Tailwind schoolwork tracker in this folder. It has an add-assignment form, browser local-storage saving, a sidebar of subjects with dropdowns, a progress bar, and an upcoming timeline that flags overdue items. [Then say what you want next.]

## Where this sits in the grind
You've cleared Stages 1-2 (the build loop, and a real app with no database). Solid.

## Natural next steps (no rush — pick when you're back)
- **Stage 3 — real database:** swap local storage for Supabase, so your data lives in a real database instead of just this browser. This is the big learning jump and the most useful next thing.
- **Stage 4 — logins:** add a simple login so it's not wide open.
- **Stage 5 — ship it:** deploy to Vercel so it has a real web address (do this one *with Heath* — publishing is a guardrail step).

## Reminder
This is your throwaway practice project — build on it freely. The guardrails only kick in when real client data or a live client app is involved.
