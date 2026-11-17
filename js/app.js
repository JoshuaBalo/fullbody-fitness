
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

    } catch (error){
  
        errorAlert.textContent = `Not able to load exercises. Please try again later. (${error.message})`;

        // removing d-none is to clear bootstraps display:none class
        errorAlert.classList.remove("d-none");
    }
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
            <div class="mt-auto pt-3 d-flex gap-2">
              <button class="btn btn-outline-primary btn-sm flex-grow-1" onclick="showDetails(${exercise.id})">Details</button>
              <button class="btn btn-outline-danger btn-sm" onclick="toggleFavourite(${exercise.id})">Favourite</button>
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
  if(searchItem === ""){
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

    document.getElementById("detailsModalLabel").textContent = name;
    document.getElementById("detailsCategory").textContent = "Category: " + (selectedExercise.category?.name || "General");
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
          <div class="mt-auto pt-3">
            <button class="btn btn-sm btn-outline-danger w-100" onclick="toggleFavourite(${exercise.id})">Remove from Favourites</button>
          </div>
        </div>
      </div>
    `;

    favouriteContainer.appendChild(favCol);
  });


}