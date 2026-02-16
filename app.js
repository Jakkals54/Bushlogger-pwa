// ---------- Recent Observers (Autocomplete) ----------

function saveObserver(name) {
  if (!name) return;
  let observers = JSON.parse(localStorage.getItem("recentObservers") || "[]");

  observers = observers.filter(o => o !== name);
  observers.unshift(name);

  if (observers.length > 5) observers = observers.slice(0, 5);

  localStorage.setItem("recentObservers", JSON.stringify(observers));
}

function populateObserverList() {
  const observers = JSON.parse(localStorage.getItem("recentObservers") || "[]");
  const dataList = document.getElementById("observerList");
  dataList.innerHTML = "";

  observers.forEach(o => {
    const option = document.createElement("option");
    option.value = o;
    dataList.appendChild(option);
  });
}

window.addEventListener("load", populateObserverList);

// ---------- GPS ----------

function getLocation() {
  const coordsDisplay = document.getElementById("coords");

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        coordsDisplay.textContent =
          position.coords.latitude + ", " + position.coords.longitude;
      },
      () => {
        coordsDisplay.textContent = "Unable to get GPS";
      }
    );
  } else {
    coordsDisplay.textContent = "GPS not supported";
  }
}

// ---------- Log Sighting ----------

function logSighting() {
  const observer = document.getElementById("observer").value.trim();
  const species = document.getElementById("species").value.trim();
  const notes = document.getElementById("notes").value.trim();
  const coords = document.getElementById("coords").textContent;

  if (!observer || !species) {
    alert("Please enter observer and species");
    return;
  }

  let sightings = JSON.parse(localStorage.getItem("sightings") || "[]");

  const sighting = {
    observer,
    species,
    notes,
    coords,
    date: new Date().toISOString()
  };

  sightings.push(sighting);
  localStorage.setItem("sightings", JSON.stringify(sightings));

  saveObserver(observer);
  populateObserverList();
  updateSightingList();

  alert("Sighting saved!");
}

// ---------- Update List ----------

function updateSightingList() {
  const sightings = JSON.parse(localStorage.getItem("sightings") || "[]");
  const list = document.getElementById("sightingList");
  list.innerHTML = "";

  sightings.slice().reverse().forEach(s => {
    const li = document.createElement("li");
    li.textContent =
      s.date.split("T")[0] +
      " | " +
      s.observer +
      " | " +
      s.species +
      " | " +
      s.coords;

    list.appendChild(li);
  });
}

window.addEventListener("load", updateSightingList);

// ---------- Clear Form ----------

function clearForm() {
  document.getElementById("observer").value = "";
  document.getElementById("species").value = "";
  document.getElementById("notes").value = "";
  document.getElementById("coords").textContent = "GPS not captured";
}

// ---------- Share Last ----------

function shareLastSighting() {
  const sightings = JSON.parse(localStorage.getItem("sightings") || "[]");

  if (sightings.length === 0) {
    alert("No sightings to share");
    return;
  }

  const s = sightings[sightings.length - 1];

  const shareText =
    "Observer: " + s.observer + "\n" +
    "Species: " + s.species + "\n" +
    "Notes: " + s.notes + "\n" +
    "Coords: " + s.coords;

  if (navigator.share) {
    navigator.share({
      title: "Bird Sighting: " + s.species,
      text: shareText
    });
  } else {
    navigator.clipboard.writeText(shareText);
    alert("Sharing not supported. Copied to clipboard.");
  }
}
