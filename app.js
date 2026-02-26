// ===============================
// BushLogger v1.5 CLEAN BUILD
// ===============================

const state = {
    sightings: JSON.parse(localStorage.getItem("sightings")) || [],
    checklistData: [],
    speciesColumnIndex: 0
};

const elements = {
    csvInput: document.getElementById("csvInput"),
    csvSpeciesColumn: document.getElementById("csvSpeciesColumn"),
    checklistContainer: document.getElementById("checklistContainer"),
    observer: document.getElementById("observer"),
    observerList: document.getElementById("observerList"),
    species: document.getElementById("species"),
    notes: document.getElementById("notes"),
    logButton: document.getElementById("logButton"),
    summaryBody: document.getElementById("summaryBody"),
    gpsToggle: document.getElementById("gpsToggle"),
    gpsStatus: document.getElementById("gpsStatus"),
    selectAll: document.getElementById("selectAll"),
    actionSelector: document.getElementById("actionSelector"),
    actionButton: document.getElementById("actionButton"),
    selectedCount: document.getElementById("selectedCount")
};

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    renderSummary();
    updateGPSStatus();
});

// ===============================
// CSV LOADING
// ===============================
elements.csvInput.addEventListener("change", handleCSVLoad);
elements.csvSpeciesColumn.addEventListener("change", () => {
    state.speciesColumnIndex = parseInt(elements.csvSpeciesColumn.value);
    renderChecklist();
});

function handleCSVLoad(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (event) {
        const text = event.target.result;
        parseCSV(text);
    };

    reader.readAsText(file);
}

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    const delimiter = lines[0].includes("\t") ? "\t" : ",";

    const headers = lines[0].split(delimiter).map(h => h.trim());
    state.checklistData = lines.slice(1).map(line =>
        line.split(delimiter).map(cell => cell.trim())
    );

    // Populate dropdown
    elements.csvSpeciesColumn.innerHTML = "";
    headers.forEach((header, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = header;
        elements.csvSpeciesColumn.appendChild(option);
    });

    state.speciesColumnIndex = 0;
    renderChecklist();
}

function renderChecklist() {
    elements.checklistContainer.innerHTML = "";

    state.checklistData.forEach(row => {
        const speciesName = row[state.speciesColumnIndex];
        if (!speciesName) return;

        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = speciesName;

        checkbox.addEventListener("change", function () {
            if (this.checked) {
                logSighting(this.value);
                this.checked = false; // auto-untick
            }
        });

        label.appendChild(checkbox);
        label.append(" " + speciesName);
        elements.checklistContainer.appendChild(label);
        elements.checklistContainer.appendChild(document.createElement("br"));
    });
}

// ===============================
// LOGGING
// ===============================
elements.logButton.addEventListener("click", () => {
    logSighting(elements.species.value.trim());
});

async function logSighting(speciesName) {
    if (!speciesName || typeof speciesName !== "string") return;

    const today = new Date().toISOString().split("T")[0];

    // Prevent duplicate same day
    const duplicate = state.sightings.find(s =>
        s.species.toLowerCase() === speciesName.toLowerCase() &&
        s.date === today
    );

    if (duplicate) {
        alert("Duplicate entry for today prevented.");
        return;
    }

    let gpsData = "GPS OFF";

    if (elements.gpsToggle.checked) {
        try {
            const position = await getCurrentPosition();
            gpsData = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
        } catch (err) {
            gpsData = "GPS unavailable";
        }
    }

    const sighting = {
        id: Date.now(),
        date: today,
        species: speciesName,
        observer: elements.observer.value.trim(),
        notes: elements.notes.value.trim(),
        gps: gpsData
    };

    state.sightings.push(sighting);
    save();
    renderSummary();

    elements.species.value = "";
    elements.notes.value = "";
}

// ===============================
// GPS
// ===============================
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000
        });
    });
}

elements.gpsToggle.addEventListener("change", updateGPSStatus);

function updateGPSStatus() {
    elements.gpsStatus.textContent = elements.gpsToggle.checked ? "GPS ON" : "GPS OFF";
}

// ===============================
// SUMMARY RENDER
// ===============================
function renderSummary() {
    elements.summaryBody.innerHTML = "";

    state.sightings.forEach((sighting, index) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td><input type="checkbox" data-id="${sighting.id}"></td>
            <td>${index + 1}</td>
            <td>${sighting.date}</td>
            <td>${sighting.species}</td>
            <td>${sighting.observer || ""}</td>
            <td>${sighting.gps}</td>
            <td>${sighting.notes || ""}</td>
        `;

        elements.summaryBody.appendChild(row);
    });

    updateSelectedCount();
}

// ===============================
// BULK ACTIONS
// ===============================
elements.selectAll.addEventListener("change", function () {
    const checkboxes = elements.summaryBody.querySelectorAll("input[type='checkbox']");
    checkboxes.forEach(cb => cb.checked = this.checked);
    updateSelectedCount();
});

elements.summaryBody.addEventListener("change", updateSelectedCount);

function updateSelectedCount() {
    const selected = elements.summaryBody.querySelectorAll("input[type='checkbox']:checked").length;
    elements.selectedCount.textContent = `(${selected} selected)`;
    elements.actionButton.disabled = selected === 0;
}

elements.actionButton.addEventListener("click", handleBulkAction);

function handleBulkAction() {
    const action = elements.actionSelector.value;
    const selectedCheckboxes = elements.summaryBody.querySelectorAll("input[type='checkbox']:checked");
    const ids = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.id));

    if (action === "delete") {
        state.sightings = state.sightings.filter(s => !ids.includes(s.id));
        save();
        renderSummary();
    }

    elements.actionSelector.value = "";
}

// ===============================
// STORAGE
// ===============================
function save() {
    localStorage.setItem("sightings", JSON.stringify(state.sightings));
