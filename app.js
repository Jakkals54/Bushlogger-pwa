const BushloggerApp = (() => {

    const state = { sightings: [], editIndex: null, observers: ["Frans","Guest"] };
    const elements = {};

    function init() {
        cacheElements();
        loadFromStorage();
        populateObservers();
        bindEvents();
        render();
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
    }

    function loadFromStorage() {
        state.sightings = JSON.parse(localStorage.getItem("bushlogger_sightings")) || [];
    }

    function saveToStorage() {
        localStorage.setItem("bushlogger_sightings", JSON.stringify(state.sightings));
    }

    function populateObservers() {
        elements.datalist.innerHTML = "";
        state.observers.forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            elements.datalist.appendChild(option);
        });
    }

    function getGPS() { return { lat:"-25.000000", lon:"31.000000" }; }

    function bindEvents() {
        elements.logButton.addEventListener("click", handleLog);
        elements.actionButton.addEventListener("click", handleAction);
    }

    // ------------------------ LOGGING ------------------------
    function handleLog() {
        const species = elements.species.value.trim();
        if (!species) { alert("Enter species."); return; }

        const observer = elements.observer.value.trim() || "Guest";
        if (!state.observers.includes(observer)) {
            state.observers.push(observer);
            populateObservers();
        }

        const notes = elements.notes.value.trim();
        const now = new Date();
        const date = now.toISOString().split("T")[0];
        const time = now.toTimeString().split(" ")[0];

        // Safe duplicate check
        const duplicateIndex = state.sightings.findIndex(s => 
            s.species.toLowerCase() === species.toLowerCase() && s.date === date
        );

        if (duplicateIndex !== -1 && state.editIndex === null) {
            const confirmReplace = confirm(`Species "${species}" already logged today at listing ${duplicateIndex+1}.\nReplace previous entry?`);
            if (!confirmReplace) return;
            state.sightings.splice(duplicateIndex,1);
        }

        const gps = getGPS();
        const entry = { date, time, observer, species, notes, lat: gps.lat, lon: gps.lon };

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
        elements.observer.value = "";
    }

    // ------------------------ RENDER SUMMARY ------------------------
    function render() {
        if (!elements.summaryBody) return; // safety
        elements.summaryBody.innerHTML = "";
        state.sightings.forEach((s,index)=>{
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><input type="radio" name="selectedSighting" data-index="${index}"></td>
                <td>${index+1}</td>
                <td>${s.date}</td>
                <td>${s.species}</td>
                <td>${s.observer}</td>
                <td>${s.lat}, ${s.lon}</td>
                <td>${s.notes}</td>
            `;
            elements.summaryBody.appendChild(tr);
        });
    }

    // ------------------------ ACTION HANDLER ------------------------
    function handleAction() {
        const action = elements.actionSelector.value;
        const selectedRadio = document.querySelector('input[name="selectedSighting"]:checked');
        if (!selectedRadio) { alert("Select a sighting first."); return; }
        const index = parseInt(selectedRadio.dataset.index);

        if (action === "edit") {
            editSighting(index);
        } else if (action === "delete") {
            deleteSighting(index);
        } else if (action === "export") {
            exportCSV([state.sightings[index]]);
        }
    }

    function editSighting(index) {
        const s = state.sightings[index];
        elements.species.value = s.species;
        elements.notes.value = s.notes;
        elements.observer.value = s.observer;
        state.editIndex = index;
    }

    function deleteSighting(index) {
        if (confirm("Delete this sighting?")) {
            state.sightings.splice(index,1);
            saveToStorage();
            render(); // Listing No recalculated
        }
    }

    // ------------------------ CSV EXPORT ------------------------
    function exportCSV(list=null) {
        const arr = list || state.sightings;
        if (!arr.length) { alert("No sightings to export."); return; }

        let csv = "Date,Time,Observer,Species,Notes,Latitude,Longitude\n";
        arr.forEach(s => {
            csv += `${s.date},${s.time},${s.observer},${s.species},"${s.notes}",${s.lat},${s.lon}\n`;
        });

        const blob = new Blob([csv],{type:"text/csv"});
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
