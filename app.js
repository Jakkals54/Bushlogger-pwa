const BushloggerApp = (() => {

const state = {
    sightings: [],
    editIndex: null,
    observers: ["Guest"],
    checklist: []
};

const elements = {};

// ---------------- INIT ----------------
function init() {
    cacheElements();
    loadFromStorage();
    populateObservers();
    bindEvents();
    render();
    updateGPSStatus();
}

function cacheElements() {
    elements.observer = document.getElementById("observer");
    elements.datalist = document.getElementById("observerList");
    elements.species = document.getElementById("species");
    elements.notes = document.getElementById("notes");
    elements.logButton = document.getElementById("logButton");
    elements.summaryBody = document.getElementById("summaryBody");
    elements.actionSelector = document.getElementById("actionSelector");
    elements.actionButton = document.getElementById("actionButton");
    elements.selectAll = document.getElementById("selectAll");
    elements.gpsToggle = document.getElementById("gpsToggle");
    elements.gpsStatus = document.getElementById("gpsStatus");
    elements.csvInput = document.getElementById("csvInput");
    elements.checklistContainer = document.getElementById("checklistContainer");
    elements.selectedCount = document.getElementById("selectedCount");
}

function bindEvents() {
    elements.logButton.addEventListener("click", () => handleLog());
    elements.actionButton.addEventListener("click", handleAction);
    elements.selectAll.addEventListener("change", toggleSelectAll);
    elements.gpsToggle.addEventListener("change", updateGPSStatus);
    elements.csvInput.addEventListener("change", handleCSVLoad);

    document.addEventListener("change", updateSelectionState);
}

// ---------------- STORAGE ----------------
function loadFromStorage() {
    state.sightings = JSON.parse(localStorage.getItem("bushlogger_sightings")) || [];
}

function saveToStorage() {
    localStorage.setItem("bushlogger_sightings", JSON.stringify(state.sightings));
}

// ---------------- OBSERVERS ----------------
function populateObservers() {
    elements.datalist.innerHTML = "";
    state.observers.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        elements.datalist.appendChild(option);
    });
}

// ---------------- GPS ----------------
function updateGPSStatus() {
    elements.gpsStatus.textContent = elements.gpsToggle.checked ? "GPS ON" : "GPS OFF";
}

function getGPS() {
    return new Promise(resolve => {
        if (!elements.gpsToggle.checked) {
            resolve({ lat:"-25.000000", lon:"31.000000" });
            return;
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => resolve({
                    lat: pos.coords.latitude.toFixed(6),
                    lon: pos.coords.longitude.toFixed(6)
                }),
                () => resolve({ lat:"-25.000000", lon:"31.000000" }),
                { enableHighAccuracy: true }
            );
        } else {
            resolve({ lat:"-25.000000", lon:"31.000000" });
        }
    });
}

// ---------------- LOGGING ----------------
async function handleLog(speciesOverride = null) {

    const species = (speciesOverride || elements.species.value.trim());
    if (!species) {
        alert("Enter species/object.");
        return;
    }

    const observer = elements.observer.value.trim() || "Guest";

    if (!state.observers.includes(observer)) {
        state.observers.push(observer);
        populateObservers();
    }

    const notes = elements.notes.value.trim();
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().split(" ")[0];

    // Duplicate same day check
    const duplicateIndex = state.sightings.findIndex(s =>
        s.species.toLowerCase() === species.toLowerCase() &&
        s.date === date
    );

    if (duplicateIndex !== -1 && state.editIndex === null) {
        const confirmReplace = confirm(
            `Species "${species}" already logged today at listing ${duplicateIndex + 1}.\nReplace previous entry?`
        );
        if (!confirmReplace) return;
        state.sightings.splice(duplicateIndex, 1);
    }

    const gps = await getGPS();

    const entry = {
        date,
        time,
        observer,
        species,
        notes,
        lat: gps.lat,
        lon: gps.lon
    };

    if (state.editIndex !== null) {
        state.sightings[state.editIndex] = entry;
        state.editIndex = null;
    } else {
        state.sightings.push(entry);
    }

    saveToStorage();
    render();
    clearForm();
}

function clearForm() {
    elements.species.value = "";
    elements.notes.value = "";
}

// ---------------- RENDER ----------------
function render() {
    elements.summaryBody.innerHTML = "";

    state.sightings.forEach((s, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="checkbox" class="selectSighting" data-index="${index}"></td>
            <td>${index + 1}</td>
            <td>${s.date}</td>
            <td>${s.species}</td>
            <td>${s.observer}</td>
            <td>${s.lat}, ${s.lon}</td>
            <td>${s.notes}</td>
        `;
        elements.summaryBody.appendChild(tr);
    });

    elements.selectAll.checked = false;
    updateSelectionState();
}

// ---------------- SELECTION ----------------
function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.selectSighting');
    checkboxes.forEach(cb => cb.checked = elements.selectAll.checked);
    updateSelectionState();
}

function updateSelectionState() {
    const selected = document.querySelectorAll('.selectSighting:checked').length;

    if (elements.selectedCount)
        elements.selectedCount.textContent = `(${selected} selected)`;

    elements.actionButton.disabled = selected === 0;
}

// ---------------- ACTION HANDLER ----------------
function handleAction() {

    const action = elements.actionSelector.value;
    const selectedCheckboxes = document.querySelectorAll('.selectSighting:checked');

    if (!selectedCheckboxes.length) {
        alert("Select at least one sighting.");
        return;
    }

    const indices = Array.from(selectedCheckboxes)
        .map(cb => parseInt(cb.dataset.index));

    if (action === "edit") {
        if (indices.length > 1) {
            alert("Edit only one sighting at a time.");
            return;
        }
        editSighting(indices[0]);
    }

    else if (action === "delete") {
        deleteSightings(indices);
    }

    else if (action === "export") {
        const list = indices.map(i => state.sightings[i]);
        exportCSV(list);
    }

    else if (action === "share") {
        const list = indices.map(i => state.sightings[i]);
        shareSightings(list);
    }

    else {
        alert("Choose an action.");
    }
}

// ---------------- EDIT ----------------
function editSighting(index) {
    const s = state.sightings[index];

    elements.species.value = s.species;
    elements.notes.value = s.notes;
    elements.observer.value = s.observer;

    state.editIndex = index;
}

// ---------------- DELETE ----------------
function deleteSightings(indices) {
    if (!confirm("Delete selected sightings?")) return;

    indices.sort((a, b) => b - a)
        .forEach(i => state.sightings.splice(i, 1));

    saveToStorage();
    render();
}

// ---------------- EXPORT ----------------
function exportCSV(list = null) {

    const arr = list || state.sightings;
    if (!arr.length) {
        alert("No sightings to export.");
        return;
    }

    let csv = "Date,Time,Observer,Species/ Object,Notes,Latitude,Longitude\n";

    arr.forEach(s => {
        csv += `${s.date},${s.time},${s.observer},${s.species},"${s.notes}",${s.lat},${s.lon}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "bushlogger_export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

// ---------------- SHARE ----------------
function shareSightings(list) {

    let message = "";

    list.forEach(s => {
        message += `Species: ${s.species}\nObserver: ${s.observer}\nDate: ${s.date}\nGPS: ${s.lat}, ${s.lon}\nNotes: ${s.notes}\n\n`;
    });

    if (navigator.share) {
        navigator.share({
            title: "BushLogger Sightings",
            text: message
        }).catch(err => alert("Share failed: " + err));
    } else {
        navigator.clipboard.writeText(message)
            .then(() => alert("Copied to clipboard. Share anywhere!"));
    }
}

// ---------------- CSV CHECKLIST ----------------
function handleCSVLoad(event) {

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = e => {
        const lines = e.target.result
            .split(/\r?\n/)
            .filter(l => l.trim());

        state.checklist = lines.map(l =>
            l.split(",")[0].trim()
        );

        renderChecklist();
    };

    reader.readAsText(file);
}

function renderChecklist() {

    elements.checklistContainer.innerHTML = "";

    state.checklist.forEach(species => {

        const id = "chk_" + species.replace(/\s+/g, "_");

        const wrapper = document.createElement("div");

        wrapper.innerHTML = `
            <input type="checkbox" id="${id}">
            <label for="${id}">${species}</label>
        `;

        const checkbox = wrapper.querySelector("input");

        checkbox.addEventListener("change", e => {
            if (e.target.checked)
                handleLog(species);
        });

        elements.checklistContainer.appendChild(wrapper);
    });
}

// ---------------- START ----------------
return { init };

})();

document.addEventListener("DOMContentLoaded", BushloggerApp.init);
