// ------------------------ BushLogger App v1.5 with Search ------------------------
const BushloggerApp = (() => {

    // ------------------------ State ------------------------
    const state = {
        sightings: [],
        editIndex: null,
        observers: ["Guest"],
        checklist: [],
        csvHeaders: [],
        speciesColumnIndices: []
    };

    const elements = {};

    // ------------------------ Init ------------------------
    function init() {
        cacheElements();
        loadFromStorage();
        populateObservers();
        bindEvents();
        render();
        updateGPSStatus();
    }

    // ------------------------ Cache DOM Elements ------------------------
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
        elements.csvSpeciesColumn = document.getElementById("csvSpeciesColumn");
        elements.checklistContainer = document.getElementById("checklistContainer");
        elements.checklistSearch = document.getElementById("checklistSearch");
    }

    // ------------------------ Local Storage ------------------------
    function loadFromStorage() {
        state.sightings = JSON.parse(localStorage.getItem("bushlogger_sightings")) || [];
        state.observers = JSON.parse(localStorage.getItem("bushlogger_observers")) || ["Guest"];
    }

    function saveToStorage() {
        localStorage.setItem("bushlogger_sightings", JSON.stringify(state.sightings));
    }

    function saveObservers() {
        localStorage.setItem("bushlogger_observers", JSON.stringify(state.observers));
    }

    // ------------------------ Observers ------------------------
    function populateObservers() {
        elements.datalist.innerHTML = "";
        state.observers.forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            elements.datalist.appendChild(option);
        });
    }

    // ------------------------ Event Binding ------------------------
    function bindEvents() {
        elements.logButton.addEventListener("click", () => handleLog());
        elements.actionButton.addEventListener("click", handleAction);
        elements.selectAll.addEventListener("change", toggleSelectAll);
        elements.gpsToggle.addEventListener("change", updateGPSStatus);
        elements.csvInput.addEventListener("change", handleCSVLoad);

        if (elements.checklistSearch) {
            elements.checklistSearch.addEventListener("input", renderChecklist);
        }

        document.addEventListener("change", updateSelectionState);
    }

    // ------------------------ GPS ------------------------
    function updateGPSStatus() {
        elements.gpsStatus.textContent =
            elements.gpsToggle.checked ? "GPS ON" : "GPS OFF";
    }

    function getGPS() {
        return new Promise(resolve => {

            if (!elements.gpsToggle.checked) {
                resolve({ lat: "-25.000000", lon: "31.000000" });
                return;
            }

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    pos => resolve({
                        lat: pos.coords.latitude.toFixed(6),
                        lon: pos.coords.longitude.toFixed(6)
                    }),
                    () => resolve({ lat: "-25.000000", lon: "31.000000" }),
                    { enableHighAccuracy: true }
                );
            } else {
                resolve({ lat: "-25.000000", lon: "31.000000" });
            }

        });
    }

    // ------------------------ Logging ------------------------
    async function handleLog(speciesOverride = null, notesOverride = null, observerOverride = null) {

        let nationalIndex = "";
        let afrikaans = "";
        let english = "";
        let speciesDisplay = "";

        if (speciesOverride && typeof speciesOverride === "object") {
            nationalIndex = speciesOverride.nationalIndex;
            afrikaans = speciesOverride.afrikaans;
            english = speciesOverride.english;
            speciesDisplay = `${nationalIndex} - ${afrikaans} / ${english}`;
        } else {
            speciesDisplay = elements.species.value.trim();
        }

        const observerValue = elements.observer.value.trim();
        const observer = observerOverride || observerValue || "Guest";

        if (observer && observer !== "Guest") {
            state.observers = state.observers.filter(name => name !== observer);
            state.observers.unshift(observer);
            if (state.observers.length > 5) {
                state.observers = state.observers.slice(0, 5);
            }
            saveObservers();
            populateObservers();
        }

        const notes = notesOverride !== undefined
            ? notesOverride
            : elements.notes.value.trim();

        const now = new Date();
        const date = now.toISOString().split("T")[0];
        const time = now.toTimeString().split(" ")[0];

        const duplicateIndex = state.sightings.findIndex(s =>
            s.nationalIndex === nationalIndex && s.date === date
        );

        if (duplicateIndex !== -1 && state.editIndex === null) {
            const confirmReplace = confirm(
                `Species "${speciesDisplay}" already logged today at listing ${duplicateIndex + 1}.\nReplace previous entry?`
            );
            if (!confirmReplace) return;
            state.sightings.splice(duplicateIndex, 1);
        }

        const gps = await getGPS();

        const entry = {
            date,
            time,
            observer,
            nationalIndex,
            afrikaans,
            english,
            species: speciesDisplay,
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

        if (!speciesOverride) clearForm();
    }

    function clearForm() {
        elements.species.value = "";
        elements.notes.value = "";
        elements.observer.value = "";
    }

    // ------------------------ Daily Summary ------------------------
    function render() {

        if (!elements.summaryBody) return;
        elements.summaryBody.innerHTML = "";

        state.sightings.forEach((s, index) => {

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td><input type="checkbox" class="selectSighting" data-index="${index}"></td>
                <td>${index + 1}</td>
                <td>${s.date}</td>
                <td>${s.species}</td>
                <td>${s.observer}</td>
                <td>${s.lat !== "-25.000000" ? s.lat + ", " + s.lon : "Yes"}</td>
                <td>${s.notes}</td>
            `;

            elements.summaryBody.appendChild(tr);
        });

        elements.selectAll.checked = false;
        updateSelectionState();
    }

    function toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.selectSighting');
        checkboxes.forEach(cb => cb.checked = elements.selectAll.checked);
        updateSelectionState();
    }

    function updateSelectionState() {
        const selected = document.querySelectorAll('.selectSighting:checked').length;
        const counter = document.getElementById("selectedCount");
        if (counter) counter.textContent = `(${selected} selected)`;
        elements.actionButton.disabled = selected === 0;
    }

    // ------------------------ CSV Checklist ------------------------
    function handleCSVLoad(event) {

        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = e => {

            const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
            if (!lines.length) return;

            const separator = lines[0].includes("\t") ? "\t" : ",";

            state.csvHeaders = lines[0]
                .split(separator)
                .map(h => h.trim())
                .filter(h => h);

            state.checklist = lines.slice(1)
                .map(line => line.split(separator).map(c => c.trim()))
                .filter(row => row.length > 0);

            if (elements.csvSpeciesColumn) {
                elements.csvSpeciesColumn.innerHTML = "";
                state.csvHeaders.forEach((h, i) => {
                    const opt = document.createElement("option");
                    opt.value = i;
                    opt.textContent = h;
                    elements.csvSpeciesColumn.appendChild(opt);
                });
                elements.csvSpeciesColumn.selectedIndex = 0;
                state.speciesColumnIndices = [0];
            }

            renderChecklist();
        };

        reader.readAsText(file, "UTF-8");
    }

    function renderChecklist() {

        const searchTerm =
            elements.checklistSearch?.value.trim().toLowerCase() || "";

        elements.checklistContainer.innerHTML = "";

        state.checklist.forEach(row => {

            const nationalIndex = row[0] || "";
            const afrikaans = row[1] || "";
            const english = row[2] || "";

            if (!nationalIndex) return;

            if (searchTerm) {
                const combined = `${afrikaans} ${english}`.toLowerCase();
                if (!combined.includes(searchTerm)) return;
            }

            const id = "chk_" + nationalIndex;

            const wrapper = document.createElement("div");
            wrapper.innerHTML = `
                <input type="checkbox" id="${id}">
                <label for="${id}">
                    ${nationalIndex} - ${afrikaans} / ${english}
                </label>
            `;

            const checkbox = wrapper.querySelector("input");

            checkbox.addEventListener("change", function () {
                if (this.checked) {
                    handleLog({ nationalIndex, afrikaans, english });
                }
            });

            elements.checklistContainer.appendChild(wrapper);
        });
    }

    return { init };

})();

document.addEventListener("DOMContentLoaded", BushloggerApp.init);
