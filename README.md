# FullBody Fitness

A web app that helps you find exercises by movement name or target muscle group, using the wger Workout Manager REST API. Built as a course project for CSCI 2170 at Dalhousie University.

## What it does

- Search exercises by name or muscle group, with a detail popup for each exercise showing its muscles worked and equipment needed
- Responsive layouts for computer, tablet, and phone
- Save favourite exercises and manage them in a Favourites section. Favourites are saved in your browser, so they are still there after you reload the page
- Build a routine from any exercise or favourite: set sets, reps and rest per exercise, reorder it, assign it a day, save it, and start a workout set by set with a progress bar and a 90-second rest timer between sets. Routines are saved in your browser too
- Start from a template: Full Body Beginner, Push / Pull / Legs, or Upper / Lower, or create a Push / Pull / Legs split as three separate day routines at once
- Log each set as you go: enter the weight (kg) and reps you actually did. Finished workouts are saved to Your Progress, with best lifts, weight over time, and recent sessions, so you can see your growth
- An About section explaining what the app is, how it works, live stats from the loaded exercises, and the data source
- Shows a visible error message when the exercise data fails to load

## Pages

- `index.html` — Exercises: search, exercise cards, details, favourites
- `routine.html` — Routine builder, templates, saved routines, workout mode
- `progress.html` — Your Progress: logged workouts, best lifts, history
- `about.html` — About the app, how it works, live stats, data source

Use the top navigation to move between pages. Dark mode / light mode is in the top bar and is remembered in your browser.

## Built with

- HTML, CSS, and vanilla JavaScript
- Bootstrap 5.3.3
- wger Workout Manager REST API (https://wger.de/api/v2/exerciseinfo/)

## How to run it

1. Clone this repository or download it.
2. Open the folder in your editor of choice.
3. Open index.html in a browser, or use the Live Server extension in VS Code.
4. Make sure you are connected to the internet, the exercise data loads from the wger API.
