/* =====================================================
   BUSHLOGGER v2
   Clean, structured, stable base
===================================================== */

/* ================= GLOBAL STATE ================= */

const state = {
    sightings: JSON.parse(localStorage.getItem("sightings")) || [],
    checklist: [],
    gpsEnabled: false,
    currentCoords: null
};

/* ================= INITIALIZE ================= */

document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    renderSightings();
});

/* ================= EVENT BINDINGS ================= */

function bindEvents() {

    // Log button (prevents PointerEvent bug)
    document.getElementById("logButton")
        .addEventListener("click", () => logSighting());

    // GPS toggle
    document.getElementById("gpsToggle")
        .addEventListener("change", toggleGPS);

    // CSV checklist load
    document.getElementById("csvInput")
        .addEventListener("change", loadChecklist);

    // Export CSV
    document.getElementById("exportCSV")
        .addEventListener("click", exportCSV);

    // Clear all
    document.getElementById("clearAll")
        .addEventListener("click", clearAllSightings);
}

/* ================= LOG SIGHTING ================= */

function logSighting(speciesOverride = null) {

    const species = speciesOverride || 
        document.getElementById("speciesInput").value.trim();

    if (!species) return;

    const observer = document.getElementById("observerSelect").value;
    const notes = document.getElementById("notesInput").value.trim();

    const sighting = {
        species,
        observer,
        notes,
        gps: state.currentCoords,
        time: new Date().toLocaleTimeString()
    };

    state.sightings.push(sighting);
    saveSightings();
    renderSightings();

    document.getElementById("speciesInput").value = "";
    document.getElementById("notesInput").value = "";
}

/* ================= GPS HANDLING ================= */

function toggleGPS(e) {

    state.gpsEnabled = e.target.checked;
    document.getElementById("gpsStatus").textContent =
        state.gpsEnabled ? "ON" : "OFF";

    if (state.gpsEnabled) {
        navigator.geolocation.getCurrentPosition(pos => {
            state.currentCoords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            };
        });
    } else {
        state.currentCoords = null;
    }
}

/* ================= CHECKLIST LOAD ================= */

function loadChecklist(event) {

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = e => {

        const lines = e.target.result
            .split(/\r?\n/)
            .map(l => l.replace(/"/g, "").trim())
            .filter(l => l.length > 0);

        state.checklist = lines.slice(1); // replace memory

        renderChecklist();
    };

    reader.readAsText(file);
}

/* ================= RENDER CHECKLIST ================= */

function renderChecklist() {

    const container = document.getElementById("checklistContainer");
    container.innerHTML = "";

    state.checklist.forEach(species => {

        const div = document.createElement("div");

        const button = document.createElement("button");
        button.textContent = species;
        button.onclick = () => logSighting(species);

        div.appendChild(button);
        container.appendChild(div);
    });
}

/* ================= RENDER SIGHTINGS ================= */

function renderSightings() {

    const tbody = document.getElementById("sightingsTableBody");
    tbody.innerHTML = "";

    state.sightings.forEach(s => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${s.species}</td>
            <td>${s.observer}</td>
            <td>${s.gps ? "Yes" : "No"}</td>
            <td>${s.time}</td>
        `;

        tbody.appendChild(row);
    });

    document.getElementById("summaryCount").textContent =
        `${state.sightings.length} Sightings`;
}

/* ================= STORAGE ================= */

function saveSightings() {
    localStorage.setItem("sightings", JSON.stringify(state.sightings));
}

/* ================= EXPORT CSV ================= */

function exportCSV() {

    let csv = "Species,Observer,GPS,Time\n";

    state.sightings.forEach(s => {
        csv += `${s.species},${s.observer},${s.gps ? "Yes" : "No"},${s.time}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "sightings.csv";
    a.click();

    URL.revokeObjectURL(url);
}

/* ================= CLEAR ALL ================= */

function clearAllSightings() {

    if (!confirm("Clear all sightings?")) return;

    state.sightings = [];
    saveSightings();
    renderSightings();
}
