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
// CLEAN CSV LOADER ONLY
// ===============================

const csvInput = document.getElementById("csvInput");
const csvSpeciesColumn = document.getElementById("csvSpeciesColumn");

csvInput.addEventListener("change", function () {

    const file = this.files[0];
    if (!file) return;

    console.log("File selected:", file.name);

    // Show filename next to input (optional visual confirmation)
    csvInput.title = file.name;

    const reader = new FileReader();

    reader.onload = function (e) {
        const text = e.target.result;
        console.log("File loaded successfully");
        processCSV(text);
    };

    reader.onerror = function () {
        console.error("Error reading file");
    };

    reader.readAsText(file);
});

function processCSV(text) {

    if (!text || text.trim() === "") {
        console.error("CSV file empty");
        return;
    }

    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");

    if (lines.length === 0) {
        console.error("No lines found");
        return;
    }

    // Detect delimiter
    let delimiter = ",";
    if (lines[0].includes("\t")) delimiter = "\t";
    if (lines[0].includes(";")) delimiter = ";";

    console.log("Detected delimiter:", delimiter);

    const headers = lines[0].split(delimiter).map(h => h.trim());

    console.log("Headers detected:", headers);

    // Clear dropdown
    csvSpeciesColumn.innerHTML = "";

    headers.forEach((header, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = header;
        csvSpeciesColumn.appendChild(option);
    });

    if (headers.length > 0) {
        csvSpeciesColumn.selectedIndex = 0;
        console.log("Dropdown populated successfully");
    } else {
        console.error("No headers found");
    }
}

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
}
