// ------------------------ BushLogger App v1.5 Updated ------------------------
const BushloggerApp = (() => {

    // ------------------------ State ------------------------
    const state = {
        sightings: [],
        editIndex: null,
        observers: ["Guest"],
        checklist: [],
        csvHeaders: [],
        speciesColumnIndices: [] // allows multiple CSV columns
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
        elements.checklistContainer = document.getElementById("checklistContainer");
        elements.csvSpeciesColumn = document.getElementById("csvSpeciesColumn");
    }

    // ------------------------ Local Storage ------------------------
    function loadFromStorage() {
        state.sightings = JSON.parse(localStorage.getItem("bushlogger_sightings")) || [];
    }

    function saveToStorage() {
        localStorage.setItem("bushlogger_sightings", JSON.stringify(state.sightings));
    }

    //-------------- Add to cacheElements()-----------------------
elements.checklistSearch = document.getElementById("checklistSearch");

//------------------ Add in bindEvents()----------------------------
elements.checklistSearch.addEventListener("input", renderChecklist);

//------------------ Update renderChecklist() to filter by search:----
function renderChecklist() {
    const searchTerm = elements.checklistSearch?.value.trim().toLowerCase() || "";

    elements.checklistContainer.innerHTML = "";

    state.speciesColumnIndices = Array.from(elements.csvSpeciesColumn.selectedOptions)
        .map(opt => parseInt(opt.value));

    if (!state.speciesColumnIndices.length) return;

    state.checklist.forEach(row => {
        const nationalIndex = row[0] || "";
        const afrikaans = row[1] || "";
        const english = row[2] || "";

        if (!nationalIndex) return;

        //------------------- Filter by search term----------------
        if (searchTerm) {
            const combined = `${afrikaans} ${english}`.toLowerCase();
            if (!combined.includes(searchTerm)) return;
        }

        const displayLabel = `${afrikaans} / ${english}`;
        const id = "chk_" + nationalIndex;

        const wrapper = document.createElement("div");
        wrapper.innerHTML = `
            <input type="checkbox" id="${id}">
            <label for="${id}">${nationalIndex} - ${displayLabel}</label>
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
        document.addEventListener("change", updateSelectionState);
    }

    // ------------------------ GPS ------------------------
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

    // ------------------------ LOGGING ------------------------
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

        //--------------Observer Input-------------------        
        const observerValue = elements.observer.value.trim();
        const observer = String(
            observerOverride !== null && observerOverride !== undefined
                ? observerOverride
                : (observerValue || "Guest")
        );

        const notes = String(
            notesOverride !== null && notesOverride !== undefined
                ? notesOverride
                : elements.notes.value.trim()
        );

        const now = new Date();
        const date = now.toISOString().split("T")[0];
        const time = now.toTimeString().split(" ")[0];

        //---------- Duplicate check by national index-----------
        const duplicateIndex = state.sightings.findIndex(s =>
            s.nationalIndex === nationalIndex && s.date === date
        );
        if (duplicateIndex !== -1 && state.editIndex === null) {
            const confirmReplace = confirm(`Species "${speciesDisplay}" already logged today at listing ${duplicateIndex+1}.\nReplace previous entry?`);
            if (!confirmReplace) return;
            state.sightings.splice(duplicateIndex,1);
        }

        const gps = await getGPS();

        //---------------Entry Object-----------------------
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

    // ------------------------ SUMMARY ------------------------
    function render() {
        if (!elements.summaryBody) return;
        elements.summaryBody.innerHTML = "";

        state.sightings.forEach((s,index)=>{
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><input type="checkbox" class="selectSighting" data-index="${index}"></td>
                <td>${index+1}</td>
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
        document.getElementById("selectedCount").textContent = `(${selected} selected)`;
        elements.actionButton.disabled = selected === 0;
    }

    // ------------------------ BULK ACTIONS ------------------------
    function handleAction() {
        const action = elements.actionSelector.value;
        const selectedCheckboxes = document.querySelectorAll('.selectSighting:checked');
        if (!selectedCheckboxes.length) { alert("Select at least one sighting."); return; }
        const indices = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.index));

        if (action === "edit") {
            if (indices.length > 1) { alert("Edit only one sighting at a time."); return; }
            editSighting(indices[0]);
        } else if (action === "delete") {
            deleteSightings(indices);
        } else if (action === "export") {
            exportCSV(indices.map(i => state.sightings[i]));
        } else if (action === "share") {
            shareSightings(indices.map(i => state.sightings[i]));
        } else if (action === "exportAllCSV") {
            exportCSV(state.sightings);
        } else if (action === "exportAllExcel") {
            exportExcel(state.sightings);
        }
    }

    function editSighting(index) {
        const s = state.sightings[index];
        elements.species.value = s.species;
        elements.notes.value = s.notes;
        elements.observer.value = s.observer;
        state.editIndex = index;
    }

    function deleteSightings(indices) {
        if (confirm("Delete selected sightings?")) {
            indices.sort((a,b)=>b-a).forEach(i => state.sightings.splice(i,1));
            saveToStorage();
            render();
        }
    }

    // ------------------------ CSV EXPORT ------------------------
    function exportCSV(list) {
        if (!list.length) { alert("No sightings to export."); return; }
        let csv = "Date,Time,Observer,Species/ Object,Notes,Latitude,Longitude\n";
        list.forEach(s => {
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

    // ------------------------ EXCEL EXPORT ------------------------
    function exportExcel(list) {
        if (!list.length) { alert("No sightings to export."); return; }
        let table = `<table><tr><th>Date</th><th>Time</th><th>Observer</th><th>Species/Object</th><th>Notes</th><th>Latitude</th><th>Longitude</th></tr>`;
        list.forEach(s => {
            table += `<tr><td>${s.date}</td><td>${s.time}</td><td>${s.observer}</td><td>${s.species}</td><td>${s.notes}</td><td>${s.lat}</td><td>${s.lon}</td></tr>`;
        });
        table += "</table>";
        const blob = new Blob([table], { type: "application/vnd.ms-excel" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bushlogger_export.xls";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ------------------------ SHARE ------------------------
    function shareSightings(list) {
        if (!list.length) { alert("No sightings to share."); return; }
        let message = "";
        list.forEach(s => {
            message += `Species: ${s.species}\nObserver: ${s.observer}\nDate: ${s.date}\nGPS: ${s.lat},${s.lon}\nNotes: ${s.notes}\n\n`;
        });
        if (navigator.share) {
            navigator.share({ title:"BushLogger Sightings", text: message }).catch(err=>alert("Share failed: "+err));
        } else {
            navigator.clipboard.writeText(message).then(()=>alert("Copied to clipboard."));
        }
    }

    // ------------------------ CSV CHECKLIST ------------------------
    function handleCSVLoad(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => {
            const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
            if (!lines.length) return;

            const separator = lines[0].includes("\t") ? "\t" : ",";

            // Headers
            state.csvHeaders = lines[0].split(separator).map(h => h.trim()).filter(h => h);

            // Data rows
            state.checklist = lines.slice(1)
                .map(line => line.split(separator).map(c => c.trim()))
                .filter(row => row.length > 0);

            // Populate dropdown
            if(elements.csvSpeciesColumn){
                elements.csvSpeciesColumn.innerHTML = "";
                state.csvHeaders.forEach((h,i)=>{
                    const opt = document.createElement("option");
                    opt.value = i;
                    opt.textContent = h;
                    elements.csvSpeciesColumn.appendChild(opt);
                });
                // default first column selected
                elements.csvSpeciesColumn.selectedIndex = 0;
                state.speciesColumnIndices = [0];

                elements.csvSpeciesColumn.addEventListener("change", () => {
                    state.speciesColumnIndices = Array.from(elements.csvSpeciesColumn.selectedOptions)
                        .map(opt => parseInt(opt.value));
                    renderChecklist();
                });
            }

            renderChecklist();
        };

        reader.readAsText(file, "UTF-8");
    }

    function renderChecklist() {
        elements.checklistContainer.innerHTML = "";

        state.speciesColumnIndices = Array.from(elements.csvSpeciesColumn.selectedOptions)
            .map(opt => parseInt(opt.value));

        if (!state.speciesColumnIndices.length) return;

        state.checklist.forEach(row => {
            const nationalIndex = row[0] || "";
            const afrikaans = row[1] || "";
            const english = row[2] || "";

            if (!nationalIndex) return;

            const displayLabel = `${afrikaans} / ${english}`;
            const id = "chk_" + nationalIndex;

            const wrapper = document.createElement("div");

            wrapper.innerHTML = `
                <input type="checkbox" id="${id}">
                <label for="${id}">${nationalIndex} - ${displayLabel}</label>
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
