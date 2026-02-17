const BushloggerApp = (() => {

    const state = {
        sightings: [],
        editIndex: null
    };

    const elements = {};

    // ==============================
    // INITIALIZE
    // ==============================
    function init() {
        cacheElements();
        loadFromStorage();
        populateObservers();
        bindEvents();
        render();
    }

    function cacheElements() {
        elements.observer = document.getElementById("observer");
        elements.species = document.getElementById("species");
        elements.notes = document.getElementById("notes");
        elements.logButton = document.getElementById("logButton");
        elements.exportButton = document.getElementById("exportButton");
        elements.sightingsList = document.getElementById("sightingsList");
    }

    // ==============================
    // STORAGE
    // ==============================
    function loadFromStorage() {
        state.sightings = JSON.parse(localStorage.getItem("bushlogger_sightings")) || [];
    }

    function saveToStorage() {
        localStorage.setItem("bushlogger_sightings", JSON.stringify(state.sightings));
    }

    // ==============================
    // OBSERVERS
    // ==============================
    function populateObservers() {
        const observers = ["Frans", "Guest"];

        elements.observer.innerHTML = "";

        observers.forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            elements.observer.appendChild(option);
        });
    }

    // ==============================
    // GPS (Desktop Safe v1)
    // ==============================
    function getGPS() {
        return {
            lat: "-25.000000",
            lon: "31.000000"
        };
    }

    // ==============================
    // EVENTS
    // ==============================
    function bindEvents() {
        elements.logButton.addEventListener("click", handleLog);
        elements.exportButton.addEventListener("click", exportCSV);
        elements.sightingsList.addEventListener("click", handleListClick);
    }

    // ==============================
    // LOGIC
    // ==============================
    function handleLog() {

        const species = elements.species.value.trim();
        if (!species) {
            alert("Enter species.");
            return;
        }

        const observer = elements.observer.value;
        const notes = elements.notes.value.trim();

        const now = new Date();
        const date = now.toISOString().split("T")[0];
        const time = now.toTimeString().split(" ")[0];

        // Duplicate check (same species same date)
        const duplicateIndex = state.sightings.findIndex(s =>
            s.species.toLowerCase() === species.toLowerCase() &&
            s.date === date
        );

        if (duplicateIndex !== -1 && state.editIndex === null) {
            const confirmReplace = confirm(
                "Species already logged today.\nReplace previous entry?"
            );
            if (!confirmReplace) return;

            state.sightings.splice(duplicateIndex, 1);
        }

        const gps = getGPS();

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

    function handleListClick(e) {

        const index = e.target.dataset.index;
        const action = e.target.dataset.action;

        if (index === undefined) return;

        if (action === "delete") {
            state.sightings.splice(index, 1);
            saveToStorage();
            render();
        }

        if (action === "edit") {
            const entry = state.sightings[index];
            elements.species.value = entry.species;
            elements.notes.value = entry.notes;
            elements.observer.value = entry.observer;
            state.editIndex = index;
        }
    }

    // ==============================
    // RENDER
    // ==============================
    function render() {
        elements.sightingsList.innerHTML = "";

        state.sightings.forEach((s, index) => {
            const li = document.createElement("li");

            li.innerHTML = `
                ${s.date} | ${s.time} | ${s.observer} | ${s.species}
                <button data-action="edit" data-index="${index}">Edit</button>
                <button data-action="delete" data-index="${index}">Delete</button>
            `;

            elements.sightingsList.appendChild(li);
        });
    }

    function clearForm() {
        elements.species.value = "";
        elements.notes.value = "";
    }

    // ==============================
    // EXPORT
    // ==============================
    function exportCSV() {

        if (state.sightings.length === 0) {
            alert("No sightings to export.");
            return;
        }

        let csv = "Date,Time,Observer,Species,Notes,Latitude,Longitude\n";

        state.sightings.forEach(s => {
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

    return { init };

})();

document.addEventListener("DOMContentLoaded", BushloggerApp.init);
