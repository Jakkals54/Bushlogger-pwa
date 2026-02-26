// ------------------------ BushLogger App v5.2 Updated ------------------------
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
        elements.csvSpeciesColumn.addEventListener("change", () => {
        //elements.csvFileInput.addEventListener("change", handleCSVLoad);
        //elements.csvSpeciesColumn.addEventListener("change", renderChecklist);
        state.speciesColumnIndices = Array.from(elements.csvSpeciesColumn.selectedOptions)
                .map(opt => parseInt(opt.value));
            renderChecklist();
        });
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
    
        //const species = String(speciesOverride ?? elements.species.value).trim();
        //if (!species) { alert("Enter species/object."); return; }

        //const observer = String(observerOverride ?? elements.observer.value.trim() || "Guest");
        //if (!state.observers.includes(observer)) //{
          //  state.observers.push(observer);
            //populateObservers();
        //}

        //const notes = String(notesOverride ?? elements.notes.value.trim());
    async function handleLog(speciesOverride = null, notesOverride = null, observerOverride = null) {
        const species = String(
    speciesOverride !== null && speciesOverride !== undefined
        ? speciesOverride
        : elements.species.value
).trim();

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

        // Duplicate check
        const duplicateIndex = state.sightings.findIndex(s =>
            String(s.species).toLowerCase() === species.toLowerCase() && s.date === date
        );
        if (duplicateIndex !== -1 && state.editIndex === null) {
            const confirmReplace = confirm(`Species "${species}" already logged today at listing ${duplicateIndex+1}.\nReplace previous entry?`);
            if (!confirmReplace) return;
            state.sightings.splice(duplicateIndex,1);
        }

        const gps = await getGPS();
        const entry = { date, time, observer, species, notes, lat: gps.lat, lon: gps.lon };

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

    elements.csvFileName.textContent = file.name;

    const reader = new FileReader();

    reader.onload = function(e) {

        const text = e.target.result;

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (!lines.length) return;

        // Extract headers
        state.csvHeaders = lines[0].split(",").map(h => h.trim());

        // Extract data rows
        state.checklist = lines.slice(1).map(line =>
            line.split(",").map(cell => cell.trim())
        );

        populateSpeciesColumnDropdown();
    };

    reader.readAsText(file, "UTF-8");
}
    //---------------RENDER CHECKLIST-------------------------
   function renderChecklist() {

    elements.checklistContainer.innerHTML = "";

    // Make sure we have selected columns
    state.speciesColumnIndices = Array.from(elements.csvSpeciesColumn.selectedOptions)
        .map(opt => parseInt(opt.value));

    if (!state.speciesColumnIndices.length) return;

    state.checklist.forEach(row => {

        // Build display label (English / Afrikaans etc.)
        const displayValues = state.speciesColumnIndices
            .map(i => row[i] || "")
            .filter(v => v.trim() !== "");

        if (displayValues.length === 0) return;

        const displayLabel = displayValues.join(" / ");

        // Choose ONE value to log (first selected column)
        const logValue = row[state.speciesColumnIndices[0]];

        const id = "chk_" + displayLabel.replace(/\s+/g, "_");

        const wrapper = document.createElement("div");

        wrapper.innerHTML = `
            <input type="checkbox" id="${id}">
            <label for="${id}">${displayLabel}</label>
        `;

        const checkbox = wrapper.querySelector("input");

        checkbox.addEventListener("change", function () {
            if (this.checked) {
                handleLog(logValue);
            }
        });

        elements.checklistContainer.appendChild(wrapper);
    });
}
    return { init };

})();

document.addEventListener("DOMContentLoaded", BushloggerApp.init);
