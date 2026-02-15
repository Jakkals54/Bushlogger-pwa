// ----- Recent Observers Feature -----
function saveObserver(name) {
  if (!name) return;
  let observers = JSON.parse(localStorage.getItem("recentObservers") || "[]");
  observers = observers.filter(o => o !== name); // remove duplicates
  observers.unshift(name); // add to front
  if (observers.length > 5) observers = observers.slice(0,5); // keep last 5
  localStorage.setItem("recentObservers", JSON.stringify(observers));
}

function populateObserverDropdown() {
  const observers = JSON.parse(localStorage.getItem("recentObservers") || "[]");
  const select = document.getElementById("observerSelect");
  select.innerHTML = "<option value=''>Select Observer</option>";
  observers.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    select.appendChild(opt);
  });
}

window.addEventListener("load", populateObserverDropdown);

// ----- GPS Function -----
function getLocation() {
  const coordsDisplay = document.getElementById("coords");
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        coordsDisplay.textContent = `${position.coords.latitude}, ${position.coords.longitude}`;
      },
      () => {
        coordsDisplay.textContent = "Unable to get GPS";
      }
    );
  } else {
    coordsDisplay.textContent = "GPS not supported";
  }
}

// ----- Log Sighting -----
function logSighting() {
  const observer = document.getElementById('observer').value;
  const species = document.getElementById('species').value;
  const notes = document.getElementById('notes').value;
  const coords = document.getElementById('coords').textContent;

  if (!observer || !species) {
    alert("Please enter observer and species");
    return;
  }

  // Save sighting
  let sightings = JSON.parse(localStorage.getItem("sightings") || "[]");
  const sighting = {observer, species, notes, coords, date: new Date()};
  sightings.push(sighting);
  localStorage.setItem("sightings", JSON.stringify(sightings));

  // Save observer
  saveObserver(observer);
  populateObserverDropdown();

  updateSightingList();
  alert("Sighting saved!");
}

// ----- Update Sightings List -----
function updateSightingList() {
  const sightings = JSON.parse(localStorage.getItem("sightings") || "[]");
  const list = document.getElementById("sightingList");
  list.innerHTML = "";
  sightings.slice().reverse().forEach(s => { // newest first
    const li = document.createElement("li");
    li.textContent = `${s.date.split('T')[0]} | ${s.observer} | ${s.species} | ${s.coords}`;
    list.appendChild(li);
  });
}

// Call on page load
window.addEventListener("load", updateSightingList);

// ----- Placeholder Functions -----
function syncDatabase() {
  alert("Syncing to area database (not implemented in test)");
}
function generateSummary() {
  alert("Generating summary (not implemented in test)");
}
function exportCSV() {
  alert("Export CSV (not implemented in test)");
}

// ----- Share Last Sighting -----
function shareLastSighting() {
  const sightings = JSON.parse(localStorage.getItem("sightings") || "[]");
  if (sightings.length === 0) {
    alert("No sightings to share");
    return;
  }
  const s = sightings[sightings.length -1]; // last sighting
  const shareText = `Observer: ${s.observer}\nSpecies: ${s.species}\nNotes: ${s.notes}\nCoords: ${s.coords}`;

  if (navigator.share) {
    navigator.share({
      title: `Bird Sighting: ${s.species}`,
      text: shareText,
      url: window.location.href
    })
    .then(() => console.log("Shared successfully"))
    .catch(err => console.log("Share failed", err));
  } else {
    // fallback: copy to clipboard
    navigator.clipboard.writeText(shareText);
    alert("Sharing not supported. Info copied to clipboard.");
  }
}
