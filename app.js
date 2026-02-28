const BushloggerApp = (() => {

const state = {
    sightings: [],
    observers: ["Guest"],
    checklist: [],
    editIndex: null
};

const elements = {};

    //------------------------------INIT()------------------------
function init() {
    cache();
    loadStorage();
    populateObservers();
    bind();
    render();
}

    //-----------------------------CACHE---------------------------
function cache() {
    elements.search = document.getElementById("checklistSearch");
    elements.container = document.getElementById("checklistContainer");
    elements.csvInput = document.getElementById("csvInput");
    elements.observer = document.getElementById("observer");
    elements.datalist = document.getElementById("observerList");
    elements.species = document.getElementById("species");
    elements.notes = document.getElementById("notes");
    elements.logButton = document.getElementById("logButton");
    elements.summaryBody = document.getElementById("summaryBody");
    elements.columnSelector = document.getElementById("columnSelector");
    elements.applyColumns = document.getElementById("applyColumns");
}

    // Dark Mode Toggle
const darkBtn = document.getElementById("darkModeToggle");

darkBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        localStorage.setItem("darkMode", "on");
        darkBtn.textContent = "☀ Light Mode";
    } else {
        localStorage.setItem("darkMode", "off");
        darkBtn.textContent = "🌙 Dark Mode";
    }
});

// Load saved preference
if (localStorage.getItem("darkMode") === "on") {
    document.body.classList.add("dark");
    darkBtn.textContent = "☀ Light Mode";
}

 //-------------------------Online Status------------------------------   
    function updateOnlineStatus() {
    const indicator = document.getElementById("offlineIndicator");
    if (navigator.onLine) {
        indicator.style.display = "none";
    } else {
        indicator.style.display = "block";
    }
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

updateOnlineStatus();

    //---------------------------BIND EVENTLISTNER-----------------------
function bind() {
    elements.csvInput.addEventListener("change", loadCSV);
    elements.search.addEventListener("input", handleSearch);
    elements.logButton.addEventListener("click", handleLog);
    elements.applyColumns.addEventListener("click", applySelectedColumns);
}

    //---------------------------LOAD STORAGE----------------------------
function loadStorage() {
    state.sightings = JSON.parse(localStorage.getItem("bush_sightings")) || [];
    state.observers = JSON.parse(localStorage.getItem("bush_observers")) || ["Guest"];
}

    //---------------------------SAVE SIGHTINGS---------------------------
function saveSightings() {
    localStorage.setItem("bush_sightings", JSON.stringify(state.sightings));
}

    //---------------------------SAVE OBSERVERS-----------------------------
function saveObservers() {
    localStorage.setItem("bush_observers", JSON.stringify(state.observers));
}

    //---------------------------POPULATE OBSERVERS-------------------------
function populateObservers() {
    elements.datalist.innerHTML = "";

    state.observers.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        elements.datalist.appendChild(option);
    });

    if (!elements.observer.value) {
        elements.observer.value = state.observers[0];
    }
}

    //----------------------------LOAD CSV---------------------------------------
function loadCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = e => {
        const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
        const headers = lines[0].split(",");

elements.columnSelector.innerHTML = "";

headers.forEach((header, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = header;

    // Column 0 = key (always selected and disabled)
    if (index === 0) {
        option.selected = true;
        option.disabled = true;
    }

    elements.columnSelector.appendChild(option);
});

elements.search.disabled = false;
elements.search.placeholder = "Type to search...";

        state.checklist = lines.slice(1).map(line =>
            line.split(",").map(cell => cell.trim())
        );

        renderChecklist(state.checklist);
    };

        reader.readAsText(file, "UTF-8");
}

    //--------------------------------HANDLE SEARCH-------------------------------
function handleSearch() {
    const query = elements.search.value.trim().toLowerCase();

    if (!query) {
        renderChecklist(state.checklist);
        return;
    }

    const filtered = state.checklist.filter(row =>
        Array.isArray(row) &&
        row.some(cell =>
            typeof cell === "string" &&
            cell.toLowerCase().includes(query)
        )
    );

    renderChecklist(filtered);
}

    //----------------------------------RENDER CHECKLIST----------------------------
function renderChecklist(list) {

    elements.container.innerHTML = "";

    const today = new Date().toISOString().split("T")[0];

    list.forEach(row => {

        if (!Array.isArray(row)) return;

        const birdNumber = row[0] || "";
        const english = row[1] || "";
        const afrikaans = row[2] || "";

        const wrapper = document.createElement("div");
        wrapper.className = "checklist-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";

        // ✅ PRE-CHECK if already logged today
        const alreadyLogged = state.sightings.some(s =>
            s.birdNumber === birdNumber &&
            s.date === today
        );

        checkbox.checked = alreadyLogged;

        const label = document.createElement("label");
        label.style.cursor = "pointer";
        label.appendChild(checkbox);

        // Changed this: const text = document.createTextNode(
           // ` ${birdNumber} - ${english} / ${afrikaans}`
        const displayText = state.displayColumns
        ? state.displayColumns.map(i => row[i]).join(" | ")
        : row.join(" | ");
        //Added to line 174
        const text = document.createTextNode(` ${displayText}`);
        
        );

        label.appendChild(text);
        wrapper.appendChild(label);
        elements.container.appendChild(wrapper);

        checkbox.addEventListener("change", function () {

            if (this.checked) {

                if (alreadyLogged) return;

                handleLog(
                    `${birdNumber} - ${english} / ${afrikaans}`,
                    birdNumber
                );

                //renderChecklist(state.checklist); // refresh to sync ticks
            }
        });

    });
}
    //---------------------------------LOG FROM CHECKLIST---------------------------
function logFromChecklist(row) {
    const birdNumber = row[0];
    const english = row[1] || "";
    const afrikaans = row[2] || "";

    const today = new Date().toISOString().split("T")[0];

    const duplicate = state.sightings.some(s =>
        s.birdNumber === birdNumber && s.date === today
    );

    if (duplicate) {
        alert("Already logged today.");
        return;
    }

    handleLog(`${birdNumber} - ${english} / ${afrikaans}`, birdNumber);
}

    //-----------------------------------HANDLE LOG-------------------------------------
function handleLog(speciesOverride = null, birdNumberOverride = "") {

    const species = speciesOverride || elements.species.value.trim();
    const birdNumber = birdNumberOverride;

    if (!species) return;

    const observer = elements.observer.value.trim() || "Guest";
    const notes = elements.notes.value.trim();
    const date = new Date().toISOString().split("T")[0];

    if (observer !== "Guest") {
        state.observers = state.observers.filter(o => o !== observer);
        state.observers.unshift(observer);
        state.observers = state.observers.slice(0,5);
        saveObservers();
        populateObservers();
    }

    const entry = { date, birdNumber, species, observer, notes };

    if (state.editIndex !== null) {
        state.sightings[state.editIndex] = entry;
        state.editIndex = null;
    } else {
        state.sightings.push(entry);
    }

    saveSightings();
    render();
    clearForm();
}

    //-----------------------------------APPLY SELECTED COLUMNS CSV---------------
function applySelectedColumns() {

    state.displayColumns = Array.from(
        elements.columnSelector.selectedOptions
    ).map(opt => parseInt(opt.value));

    renderChecklist(state.checklist);
}
    
    //------------------------------------CLEAR FORM------------------------------------
function clearForm() {
    elements.species.value = "";
    elements.notes.value = "";
}

    //-----------------------------------RENDER DAILY CHECKLIST-------------------------
function render() {

    elements.summaryBody.innerHTML = "";

    state.sightings.forEach((entry, index) => {

        entry.rowNumber = index + 1;

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td><input type="checkbox" class="rowSelect" data-index="${index}"></td>
            <td>${entry.rowNumber}</td>
            <td>${entry.date}</td>
            <td>${entry.birdNumber || ""}</td>
            <td>${entry.species}</td>
            <td>${entry.observer}</td>
            <td>${entry.gps || ""}</td>
            <td>${entry.notes}</td>
        `;

        elements.summaryBody.appendChild(tr);
    });
}
return { init };

})();

document.addEventListener("DOMContentLoaded", BushloggerApp.init);
