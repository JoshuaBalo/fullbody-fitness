
/*
Citation: wger Workout Manager REST API(wger, n.d.)
*/
const apiUrl = "https://wger.de/api/v2/exerciseinfo/?language=2&limit=50";
const input = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const errorAlert = document.getElementById("errorAlert");
const exerciseContainer = document.getElementById("exerciseContainer");
const favouriteContainer = document.getElementById("favouritesContainer");
const emptyFavouritesMsg = document.getElementById("emptyFavouritesMsg");

let allExercises = [];
let favouritesList = [];

// ---- Routine builder state ----
let draftRoutine = [];
let savedRoutines = [];
let currentWorkout = null; // { name, items: [{exerciseId, sets, reps, rest}], done: [bool] }
let restTimerId = null;
let restSecondsLeft = 0;

const routineNameInput = document.getElementById("routineNameInput");
const draftContainer = document.getElementById("draftContainer");
const draftSummary = document.getElementById("draftSummary");
const savedRoutinesContainer = document.getElementById("savedRoutinesContainer");
const workoutSection = document.getElementById("workoutSection");
const workoutContainer = document.getElementById("workoutContainer");
const workoutTitle = document.getElementById("workoutTitle");
const workoutProgressBar = document.getElementById("workoutProgressBar");
const workoutProgressText = document.getElementById("workoutProgressText");
const workoutDoneMsg = document.getElementById("workoutDoneMsg");
const restTimerText = document.getElementById("restTimerText");
const restTimerBtn = document.getElementById("restTimerBtn");

// ---- Small helpers for wger data ----

function exerciseName(exercise) {
  const englishData = exercise.translations.find((t) => t.language === 2) || exercise.translations[0];
  return englishData ? englishData.name : "Unnamed Exercise";
}

function muscleNames(exercise) {
  const primary = (exercise.muscles || []).map((m) => m.name_en || m.name);
  const secondary = (exercise.muscles_secondary || []).map((m) => m.name_en || m.name);
  return { primary, secondary };
}

function equipmentNames(exercise) {
  return (exercise.equipment || []).map((e) => e.name);
}

//trying to fetch exercises
async function getExercises(){

    //if error occurs
    try{

      //if needed, to reset the alert box back
      errorAlert.classList.add("d-none");
      errorAlert.textContent= "";

      const response = await fetch(apiUrl);
      
      if(!response.ok){
        throw new Error(`The server returned status code: ${response.status}`);
      }

      //response might take extra time(await)
      const output = await response.json();

      //Begins with storing the first 50 exercise in the array
      allExercises = output.results;

      //where is renderExercises initialized?
      renderExercises(allExercises);

      //Bring back any favourites saved in the browser from an earlier visit
      loadFavourites();

      //Fill the About stats and rebuild the routine views now that we know the exercises
      updateAboutStats();
      loadRoutines();
      loadDraft();
      renderDraft();
      renderSavedRoutines();

    } catch (error){
  
        errorAlert.textContent = `Not able to load exercises. Please try again later. (${error.message})`;

        // removing d-none is to clear bootstraps display:none class
        errorAlert.classList.remove("d-none");
    }
}

// Live numbers for the About section, from the exercises actually loaded
function updateAboutStats() {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  const categories = new Set(allExercises.map((ex) => ex.category ? ex.category.name : "General"));
  const muscles = new Set();
  allExercises.forEach((ex) => {
    muscleNames(ex).primary.forEach((m) => muscles.add(m));
    muscleNames(ex).secondary.forEach((m) => muscles.add(m));
  });
  const withPhotos = allExercises.filter((ex) => ex.images && ex.images.length > 0).length;
  setText("statExercises", allExercises.length);
  setText("statCategories", categories.size);
  setText("statMuscles", muscles.size);
  setText("statPhotos", withPhotos);
}

//T o display the 50 exercises
function renderExercises(exercisesToDisplay){
  //Starting with a clean slate
  exerciseContainer.innerHTML = "";

  if(exercisesToDisplay.length === 0){
    //if the searched itrem is nonexistent
    exerciseContainer.innerHTML = '<p class="text-center text-muted"> No exercises found matching your search. </p>';
    return;
  }

  exercisesToDisplay.forEach((exercise) =>{
    
    //wger api used tarnsaltion id #2 for english
    const englishData = exercise.translations.find((t) => t.language ===2) || exercise.translations[0];

    //Check if the string/exercise is there
    const exerciseName = englishData ? englishData.name : "Unnamed Exercise";

    const categoryName = exercise.category ? exercise.category.name : "General"

    //Need to check if theers image, not not just use that placeholder
    const imageUrl = (exercise.images && exercise.images.length > 0)
    //Use placehold.co to make fallback image
    ? exercise.images[0].image : "https://placehold.co/400x250/212529/ffffff?text=Exercise";

    //Muscles and equipment, so a card says more than just a name
    const { primary } = muscleNames(exercise);
    const equipment = equipmentNames(exercise);
    const detailLine = [
      primary.length ? primary.slice(0, 2).join(", ") : "",
      equipment.length ? equipment[0] : ""
    ].filter(Boolean).join(" · ");

    //div tag in html to create the 3 distinct views for mobile, tablets n desktop.
    const colDiv = document.createElement("div");

    //screen widths
    colDiv.className = "col-12 col-md-6 col-lg-4";

    //Using alt, more accessible for the visually impaired
    colDiv.innerHTML = `
    <div class="card h-100 shadow-sm">
      <img src="${imageUrl}" class="card-img-top" alt="${exerciseName}" style="height: 200px; object-fit: cover;">
        <div class="card-body d-flex flex-column">
          <span class="badge bg-secondary mb-2 align-self-start">${categoryName}</span>
          <h5 class="card-title fw-bold">${exerciseName}</h5>
          ${detailLine ? `<p class="text-muted small mb-3">${detailLine}</p>` : ""}
            <div class="mt-auto pt-3 d-flex gap-2">
              <button class="btn btn-outline-primary btn-sm flex-grow-1" onclick="showDetails(${exercise.id})">Details</button>
              <button class="btn btn-outline-danger btn-sm" onclick="toggleFavourite(${exercise.id})">Favourite</button>
            </div>
            <div class="pt-2">
              <button class="btn btn-outline-success btn-sm w-100" onclick="addToRoutine(${exercise.id})">Add to Routine</button>
            </div>
        </div>
    </div>
    `;

    exerciseContainer.appendChild(colDiv);
  });


}

getExercises();

//Filtering exercise on what user types.
function handleSearch(){
  const searchItem = input.value.trim().toLowerCase();

  //Rendering the exrecise even when I clear the box/empty
  if(searchItem === "") {
    renderExercises(allExercises);
    return;
  }


  const filtered = allExercises.filter((exercise) => {
    // Look up the English name from translations
    const englishData = exercise.translations.find((t) => t.language === 2) || exercise.translations[0];
    const name = englishData ? englishData.name.toLowerCase() : "";
    const category = exercise.category ? exercise.category.name.toLowerCase() : "";

    // Returning if the exercise name or category has it
    return name.includes(searchItem) || category.includes(searchItem);
  });

  //only the cards that matched filter
  renderExercises(filtered);
}
// Run search beforr we search and also run search live as I type into the input box
searchBtn.addEventListener("click", handleSearch);
input.addEventListener("input", handleSearch);


//Details button on an exercise card
function showDetails(exerciseId) {

  // Find the exact exercise object from main list
  const selectedExercise = allExercises.find((ex) => ex.id === exerciseId);

  if (selectedExercise) {
    const englishData = selectedExercise.translations.find((t) => t.language === 2) || selectedExercise.translations[0];
    const name = englishData ? englishData.name : "Exercise Details";
    
    // Removing all HTML tags like <P> because some wger descriptions contain raw HTML
    const rawDescription = englishData && englishData.description ? englishData.description : "No description provided.";
    const cleanDescription = rawDescription.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ");

    const { primary, secondary } = muscleNames(selectedExercise);
    const equipment = equipmentNames(selectedExercise);
    const musclesText = primary.length
      ? "Muscles: " + primary.join(", ") + (secondary.length ? " (also works: " + secondary.join(", ") + ")" : "")
      : "";
    const equipmentText = equipment.length ? "Equipment: " + equipment.join(", ") : "Equipment: none (bodyweight exercise)";

    document.getElementById("detailsModalLabel").textContent = name;
    document.getElementById("detailsCategory").textContent = "Category: " + (selectedExercise.category?.name || "General");
    document.getElementById("detailsMuscles").textContent = musclesText;
    document.getElementById("detailsEquipment").textContent = equipmentText;
    document.getElementById("detailsDescription").textContent = cleanDescription;
    const detailsModal = new bootstrap.Modal(document.getElementById("detailsModal"));
    detailsModal.show();
  }
}


// Read the saved favourite ids from the browser and rebuild the favourites list
function loadFavourites() {
  try {
    const savedIds = JSON.parse(localStorage.getItem("fullbodyFavourites") || "[]");
    favouritesList = allExercises.filter((ex) => savedIds.includes(ex.id));
  } catch (error) {
    favouritesList = [];
  }
  renderFavourites();
}

// Save the favourite ids in the browser so they survive a reload
function saveFavourites() {
  try {
    localStorage.setItem("fullbodyFavourites", JSON.stringify(favouritesList.map((ex) => ex.id)));
  } catch (error) {
    // If the browser blocks storage, favourites just last for this visit
  }
}

// Function to add or remove an exercise from favourites when "Favourite" is clicked
function toggleFavourite(exerciseId) {
  // Check if this exercise is already in our favourites array
  const alreadyFavourited = favouritesList.some((ex) => ex.id === exerciseId);

  if (alreadyFavourited) {
    // If it is already favorited remove it from the list
    favouritesList = favouritesList.filter((ex) => ex.id !== exerciseId);
  } else {
    const exerciseToAdd = allExercises.find((ex) => ex.id === exerciseId);
    if (exerciseToAdd) {
      favouritesList.push(exerciseToAdd);
    }
  }

  // Refresh them and save them in the browser
  renderFavourites();
  saveFavourites();
}

// thr favourite card in #favouritesContainer 
function renderFavourites() {
  
  favouriteContainer.innerHTML = "";

  // incase list is stil empty
  if (favouritesList.length === 0) {
    favouriteContainer.innerHTML = '<p class="text-muted" id="emptyFavouritesMsg">You have not favorited any exercises yet.</p>';
    return;
  }

  // Loop through each item in the favourites list and draw a compact card
  favouritesList.forEach((exercise) => {
    const englishData = exercise.translations.find((t) => t.language === 2) || exercise.translations[0];
    const exerciseName = englishData ? englishData.name : "Unnamed Exercise";
    const categoryName = exercise.category ? exercise.category.name : "General";

    const favCol = document.createElement("div");
    // Responsive column sizes for the 3 views
    favCol.className = "col-12 col-md-6 col-lg-4";

    favCol.innerHTML = `
      <div class="card border-danger h-100 shadow-sm">
        <div class="card-body d-flex flex-column">
          <span class="badge bg-danger mb-2 align-self-start">${categoryName}</span>
          <h5 class="card-title fw-bold">${exerciseName}</h5>
          <div class="mt-auto pt-3 d-flex flex-column gap-2">
            <button class="btn btn-sm btn-outline-success w-100" onclick="addToRoutine(${exercise.id})">Add to Routine</button>
            <button class="btn btn-sm btn-outline-danger w-100" onclick="toggleFavourite(${exercise.id})">Remove from Favourites</button>
          </div>
        </div>
      </div>
    `;

    favouriteContainer.appendChild(favCol);
  });


}

// ---- Routine builder ----

function saveRoutines() {
  try {
    localStorage.setItem("fullbodyRoutines", JSON.stringify(savedRoutines));
  } catch (error) {
    // If the browser blocks storage, routines just last for this visit
  }
}

function loadRoutines() {
  try {
    savedRoutines = JSON.parse(localStorage.getItem("fullbodyRoutines") || "[]");
  } catch (error) {
    savedRoutines = [];
  }
}

function saveDraft() {
  try {
    localStorage.setItem("fullbodyRoutineDraft", JSON.stringify({
      name: routineNameInput ? routineNameInput.value : "",
      items: draftRoutine
    }));
  } catch (error) {
    // Draft just lasts for this visit if storage is blocked
  }
}

function loadDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem("fullbodyRoutineDraft") || "null");
    if (saved) {
      draftRoutine = (saved.items || []).filter((item) => allExercises.some((ex) => ex.id === item.exerciseId));
      if (routineNameInput && saved.name) routineNameInput.value = saved.name;
    }
  } catch (error) {
    draftRoutine = [];
  }
}

function estimateMinutes(items) {
  // Rough guide: about 40 seconds of work per set, plus the rest between sets
  const seconds = items.reduce((total, item) => total + (item.sets || 0) * (40 + (item.rest || 0)), 0);
  return Math.max(1, Math.round(seconds / 60));
}

function addToRoutine(exerciseId) {
  const exercise = allExercises.find((ex) => ex.id === exerciseId);
  if (!exercise) return;
  if (draftRoutine.some((item) => item.exerciseId === exerciseId)) {
    if (draftSummary) draftSummary.textContent = exerciseName(exercise) + " is already in this routine.";
    return;
  }
  draftRoutine.push({ exerciseId, sets: 3, reps: "10", rest: 60 });
  saveDraft();
  renderDraft();
  document.getElementById("routineSection").scrollIntoView({ behavior: "smooth" });
}

function updateDraftItem(index, field, value) {
  if (!draftRoutine[index]) return;
  if (field === "sets") draftRoutine[index].sets = Math.min(10, Math.max(1, parseInt(value, 10) || 3));
  if (field === "reps") draftRoutine[index].reps = String(value).slice(0, 10) || "10";
  if (field === "rest") draftRoutine[index].rest = Math.min(300, Math.max(0, parseInt(value, 10) || 0));
  saveDraft();
  renderDraftSummary();
}

function moveDraftItem(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= draftRoutine.length) return;
  const item = draftRoutine.splice(index, 1)[0];
  draftRoutine.splice(target, 0, item);
  saveDraft();
  renderDraft();
}

function removeDraftItem(index) {
  draftRoutine.splice(index, 1);
  saveDraft();
  renderDraft();
}

function clearDraft() {
  draftRoutine = [];
  if (routineNameInput) routineNameInput.value = "";
  stopRestTimer();
  saveDraft();
  renderDraft();
}

function renderDraftSummary() {
  if (!draftSummary) return;
  if (draftRoutine.length === 0) {
    draftSummary.textContent = "";
    return;
  }
  const totalSets = draftRoutine.reduce((total, item) => total + (item.sets || 0), 0);
  draftSummary.textContent = draftRoutine.length + " exercise" + (draftRoutine.length === 1 ? "" : "s") +
    " · " + totalSets + " sets · about " + estimateMinutes(draftRoutine) + " min";
}

function renderDraft() {
  if (!draftContainer) return;
  draftContainer.innerHTML = "";
  if (draftRoutine.length === 0) {
    draftContainer.innerHTML = '<p class="text-muted" id="emptyDraftMsg">No exercises in this routine yet. Use the "Add to Routine" button on any exercise card, or on a favourite, to start one.</p>';
    renderDraftSummary();
    return;
  }
  draftRoutine.forEach((item, index) => {
    const exercise = allExercises.find((ex) => ex.id === item.exerciseId);
    if (!exercise) return;
    const name = exerciseName(exercise);
    const category = exercise.category ? exercise.category.name : "General";
    const { primary } = muscleNames(exercise);
    const row = document.createElement("div");
    row.className = "draft-item";
    row.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div>
          <span class="fw-bold">${index + 1}. ${name}</span>
          <span class="badge bg-secondary ms-1">${category}</span>
          ${primary.length ? `<div class="text-muted small">${primary.slice(0, 2).join(", ")}</div>` : ""}
        </div>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline-secondary" type="button" onclick="moveDraftItem(${index}, -1)" aria-label="Move up">↑</button>
          <button class="btn btn-sm btn-outline-secondary" type="button" onclick="moveDraftItem(${index}, 1)" aria-label="Move down">↓</button>
          <button class="btn btn-sm btn-outline-danger" type="button" onclick="removeDraftItem(${index})">Remove</button>
        </div>
      </div>
      <div class="row g-2 mt-2">
        <div class="col-4">
          <label class="form-label mb-1">Sets</label>
          <input type="number" class="form-control form-control-sm" min="1" max="10" value="${item.sets}" onchange="updateDraftItem(${index}, 'sets', this.value)">
        </div>
        <div class="col-4">
          <label class="form-label mb-1">Reps</label>
          <input type="text" class="form-control form-control-sm" value="${item.reps}" onchange="updateDraftItem(${index}, 'reps', this.value)">
        </div>
        <div class="col-4">
          <label class="form-label mb-1">Rest (sec)</label>
          <input type="number" class="form-control form-control-sm" min="0" max="300" step="15" value="${item.rest}" onchange="updateDraftItem(${index}, 'rest', this.value)">
        </div>
      </div>
    `;
    draftContainer.appendChild(row);
  });
  renderDraftSummary();
}

function saveRoutine() {
  if (draftRoutine.length === 0) {
    if (draftSummary) draftSummary.textContent = "Add at least one exercise before saving a routine.";
    return;
  }
  const name = (routineNameInput && routineNameInput.value.trim()) || ("Routine " + (savedRoutines.length + 1));
  savedRoutines.push({
    id: Date.now(),
    name,
    items: draftRoutine.map((item) => ({ ...item }))
  });
  saveRoutines();
  renderSavedRoutines();
  if (draftSummary) draftSummary.textContent = "Saved \"" + name + "\". You can load it again from Saved Routines.";
}

function renderSavedRoutines() {
  if (!savedRoutinesContainer) return;
  savedRoutinesContainer.innerHTML = "";
  if (savedRoutines.length === 0) {
    savedRoutinesContainer.innerHTML = '<p class="text-muted" id="emptyRoutinesMsg">No saved routines yet.</p>';
    return;
  }
  savedRoutines.forEach((routine) => {
    const totalSets = routine.items.reduce((total, item) => total + (item.sets || 0), 0);
    const card = document.createElement("div");
    card.className = "border rounded p-3 mb-2";
    card.innerHTML = `
      <div class="fw-bold">${routine.name}</div>
      <div class="text-muted small mb-2">${routine.items.length} exercises · ${totalSets} sets · about ${estimateMinutes(routine.items)} min</div>
      <div class="d-flex flex-wrap gap-2">
        <button class="btn btn-sm btn-primary" type="button" onclick="startSavedWorkout(${routine.id})">Start</button>
        <button class="btn btn-sm btn-outline-secondary" type="button" onclick="loadRoutine(${routine.id})">Load to Edit</button>
        <button class="btn btn-sm btn-outline-danger" type="button" onclick="deleteRoutine(${routine.id})">Delete</button>
      </div>
    `;
    savedRoutinesContainer.appendChild(card);
  });
}

function loadRoutine(id) {
  const routine = savedRoutines.find((r) => r.id === id);
  if (!routine) return;
  draftRoutine = routine.items.map((item) => ({ ...item }));
  if (routineNameInput) routineNameInput.value = routine.name;
  saveDraft();
  renderDraft();
  document.getElementById("routineSection").scrollIntoView({ behavior: "smooth" });
}

function deleteRoutine(id) {
  savedRoutines = savedRoutines.filter((r) => r.id !== id);
  saveRoutines();
  renderSavedRoutines();
}

// ---- Templates ----

function findTemplateExercise(search, category) {
  const needle = search.toLowerCase();
  const byName = allExercises.find((ex) => exerciseName(ex).toLowerCase().includes(needle));
  if (byName) return byName;
  return allExercises.find((ex) => ex.category && ex.category.name === category) || null;
}

const ROUTINE_TEMPLATES = {
  fullbody: [
    { search: "Squat", category: "Legs", sets: 3, reps: "10", rest: 60 },
    { search: "Bench Press", category: "Chest", sets: 3, reps: "10", rest: 60 },
    { search: "Row", category: "Back", sets: 3, reps: "10", rest: 60 },
    { search: "Crunch", category: "Abs", sets: 3, reps: "12", rest: 45 },
    { search: "Curl", category: "Arms", sets: 3, reps: "12", rest: 45 }
  ],
  pushpulllegs: [
    { search: "Bench Press", category: "Chest", sets: 3, reps: "10", rest: 60 },
    { search: "Row", category: "Back", sets: 3, reps: "10", rest: 60 },
    { search: "Squat", category: "Legs", sets: 3, reps: "10", rest: 60 },
    { search: "Calf", category: "Calves", sets: 3, reps: "12", rest: 45 }
  ],
  upperlower: [
    { search: "Shoulder Press", category: "Shoulders", sets: 3, reps: "10", rest: 60 },
    { search: "Row", category: "Back", sets: 3, reps: "10", rest: 60 },
    { search: "Curl", category: "Arms", sets: 3, reps: "12", rest: 45 },
    { search: "Squat", category: "Legs", sets: 3, reps: "10", rest: 60 },
    { search: "Lunge", category: "Legs", sets: 3, reps: "10", rest: 60 }
  ]
};

const TEMPLATE_NAMES = {
  fullbody: "Full Body Beginner",
  pushpulllegs: "Push / Pull / Legs",
  upperlower: "Upper / Lower"
};

function applyTemplate(key) {
  const template = ROUTINE_TEMPLATES[key];
  if (!template) return;
  const used = new Set();
  draftRoutine = [];
  template.forEach((slot) => {
    let exercise = findTemplateExercise(slot.search, slot.category);
    if (exercise && used.has(exercise.id)) {
      exercise = allExercises.find((ex) => ex.category && ex.category.name === slot.category && !used.has(ex.id)) || exercise;
    }
    if (!exercise) return;
    used.add(exercise.id);
    draftRoutine.push({ exerciseId: exercise.id, sets: slot.sets, reps: slot.reps, rest: slot.rest });
  });
  if (routineNameInput) routineNameInput.value = TEMPLATE_NAMES[key] || "My Routine";
  saveDraft();
  renderDraft();
  document.getElementById("routineSection").scrollIntoView({ behavior: "smooth" });
}

// ---- Workout mode ----

function startWorkout(name, items) {
  const resolved = items
    .map((item) => ({ ...item, exercise: allExercises.find((ex) => ex.id === item.exerciseId) }))
    .filter((item) => item.exercise);
  if (resolved.length === 0) {
    if (draftSummary) draftSummary.textContent = "Add at least one exercise before starting a workout.";
    return;
  }
  stopRestTimer();
  currentWorkout = { name, items: resolved, done: resolved.map(() => false) };
  if (workoutDoneMsg) workoutDoneMsg.textContent = "";
  renderWorkout();
  workoutSection.classList.remove("d-none");
  workoutSection.scrollIntoView({ behavior: "smooth" });
}

function startDraftWorkout() {
  startWorkout((routineNameInput && routineNameInput.value.trim()) || "My Routine", draftRoutine);
}

function startSavedWorkout(id) {
  const routine = savedRoutines.find((r) => r.id === id);
  if (routine) startWorkout(routine.name, routine.items);
}

function toggleWorkoutDone(index) {
  if (!currentWorkout || !currentWorkout.items[index]) return;
  currentWorkout.done[index] = !currentWorkout.done[index];
  renderWorkout();
}

function renderWorkout() {
  if (!currentWorkout) return;
  workoutTitle.textContent = "Workout: " + currentWorkout.name;
  workoutContainer.innerHTML = "";
  currentWorkout.items.forEach((item, index) => {
    const name = exerciseName(item.exercise);
    const category = item.exercise.category ? item.exercise.category.name : "General";
    const row = document.createElement("div");
    row.className = "workout-item" + (currentWorkout.done[index] ? " done" : "");
    row.innerHTML = `
      <div class="form-check">
        <input class="form-check-input" type="checkbox" id="workoutCheck${index}" ${currentWorkout.done[index] ? "checked" : ""} onchange="toggleWorkoutDone(${index})">
        <label class="form-check-label" for="workoutCheck${index}">
          <span class="workout-name fw-bold">${name}</span>
          <span class="badge bg-secondary ms-1">${category}</span><br>
          <span class="text-muted small">${item.sets} sets × ${item.reps} reps · ${item.rest}s rest</span>
        </label>
      </div>
    `;
    workoutContainer.appendChild(row);
  });
  const doneCount = currentWorkout.done.filter(Boolean).length;
  const total = currentWorkout.items.length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  workoutProgressBar.style.width = percent + "%";
  workoutProgressText.textContent = doneCount + " of " + total + " done · about " + estimateMinutes(currentWorkout.items) + " min total";
  if (doneCount === total && total > 0 && workoutDoneMsg) {
    workoutDoneMsg.textContent = "Nice work, that is the whole routine done.";
  }
}

function finishWorkout() {
  if (!currentWorkout) return;
  if (workoutDoneMsg) workoutDoneMsg.textContent = "Workout finished: " + currentWorkout.name + ". Well done.";
  currentWorkout = null;
}

function closeWorkout() {
  stopRestTimer();
  workoutSection.classList.add("d-none");
  currentWorkout = null;
}

function startRestTimer() {
  if (restTimerId) {
    stopRestTimer();
    return;
  }
  restSecondsLeft = 60;
  restTimerBtn.textContent = "Stop rest";
  restTimerText.textContent = "Rest: 60s";
  restTimerId = setInterval(() => {
    restSecondsLeft -= 1;
    if (restSecondsLeft <= 0) {
      stopRestTimer();
      restTimerText.textContent = "Rest over, next exercise.";
      return;
    }
    restTimerText.textContent = "Rest: " + restSecondsLeft + "s";
  }, 1000);
}

function stopRestTimer() {
  if (restTimerId) clearInterval(restTimerId);
  restTimerId = null;
  if (restTimerBtn) restTimerBtn.textContent = "Start 60s rest";
  if (restTimerText) restTimerText.textContent = "";
}

// Routine buttons
const saveRoutineBtn = document.getElementById("saveRoutineBtn");
if (saveRoutineBtn) saveRoutineBtn.addEventListener("click", saveRoutine);
const startDraftBtn = document.getElementById("startDraftBtn");
if (startDraftBtn) startDraftBtn.addEventListener("click", startDraftWorkout);
const clearDraftBtn = document.getElementById("clearDraftBtn");
if (clearDraftBtn) clearDraftBtn.addEventListener("click", clearDraft);
const closeWorkoutBtn = document.getElementById("closeWorkoutBtn");
if (closeWorkoutBtn) closeWorkoutBtn.addEventListener("click", closeWorkout);
const finishWorkoutBtn = document.getElementById("finishWorkoutBtn");
if (finishWorkoutBtn) finishWorkoutBtn.addEventListener("click", finishWorkout);
if (restTimerBtn) restTimerBtn.addEventListener("click", startRestTimer);
if (routineNameInput) routineNameInput.addEventListener("input", saveDraft);
