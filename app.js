const BushloggerApp = (() => {

const state = {
    sightings: [],
    observers: ["Guest"],
    checklist: [],
    editIndex: null
};

const elements = {};

//-------------------------------INIT--------------------------    
function init() {
    cache();
    loadStorage();
    populateObservers();
    bind();
    render();
    document.getElementById("checklistContainer")
    .addEventListener("change", function (e) {
        if (e.target.classList.contains("checkItem")) {

            const birdNumber = e.target.dataset.id;
            const bird = state.checklist.find(b => b.number == birdNumber);

            if (bird) {
                addToDailySightings(bird);
            }

            e.target.checked = false; // optional: auto-uncheck
        }
    });
}

//---------------------------------CACHE ELEMENTS---------------------
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
}

//------------------------EVENT BINDING------------------------------    
function bind() {
    elements.csvInput.addEventListener("change", loadCSV);
    elements.search.addEventListener("input", handleSearch);
    elements.logButton.addEventListener("click", handleLog);
}

//---------------------------LOAD STORAGE-----------------------------    
function loadStorage() {
    state.sightings = JSON.parse(localStorage.getItem("bush_sightings")) || [];
    state.observers = JSON.parse(localStorage.getItem("bush_observers")) || ["Guest"];
}

//---------------------------SAVE SIGHTINGS----------------------------    
function saveSightings() {
    localStorage.setItem("bush_sightings", JSON.stringify(state.sightings));
}

function saveObservers() {
    localStorage.setItem("bush_observers", JSON.stringify(state.observers));
}

//-----------------------------POPULAT OBSERVERS-------------------------    
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

//-----------------------------LOAD CSV----------------------------    
function loadCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = e => {
        const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
        const headers = lines[0].split(",");

        state.checklist = lines.slice(1).map(line =>
            line.split(",").map(cell => cell.trim())
        );

        renderChecklist(state.checklist);
    };

    reader.readAsText(file, "UTF-8");
}

 //-------------------------------HANDLE SEARCH------------------------   
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

//----------------------------------RENDER CHECKLIST------------------------    
function renderChecklist(list) {

    elements.container.innerHTML = "";

    list.forEach(row => {

        if (!Array.isArray(row)) return;

        const birdNumber = row[0] || "";
        const english = row[1] || "";
        const afrikaans = row[2] || "";

        const wrapper = document.createElement("div");
        wrapper.className = "checklist-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "checkItem";

        const label = document.createElement("label");
        label.style.cursor = "pointer";
        label.appendChild(checkbox);

        const text = document.createTextNode(
            ` ${birdNumber} - ${english} / ${afrikaans}`
        );

        label.appendChild(text);
        wrapper.appendChild(label);
        elements.container.appendChild(wrapper);

        // 🔥 Immediate transfer when checked
        checkbox.addEventListener("change", function () {

            if (!this.checked) return;

            const today = new Date().toISOString().split("T")[0];

            const duplicate = state.sightings.some(s =>
                s.birdNumber === birdNumber &&
                s.date === today
            );

            if (duplicate) {
                alert("Already logged today.");
                this.checked = false;
                return;
            }

            handleLog(
                `${birdNumber} - ${english} / ${afrikaans}`,
                birdNumber
            );

            this.checked = false;
        });

    });

}
//------------------------ADD SELECTION IN CSV TO DAILY SIGHTINGS--------------    
function addToDailySightings(bird) {

    // prevent duplicates using national bird number
    const exists = state.dailySightings.some(
        item => item.number == bird.number
    );

    if (exists) return;

    state.dailySightings.push({
        number: bird.number,
        name: bird.name,
        observer: currentObserver(),
        notes: ""
    });

    renderDailySightings();
}
    
//----------------------------------LOG FROM CHECKLIST--------------------    
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

//-------------------------------HANDLE LOG------------------------------
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

//-------------------------------CLEAR FORM----------------------------
function clearForm() {
    elements.species.value = "";
    elements.notes.value = "";
}

//--------------------------------RENDER DAILY SIGHTINGS---------------
function render() {
    elements.summaryBody.innerHTML = "";

    state.sightings.forEach((s, index) => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${s.date}</td>
            <td>${s.birdNumber}</td>
            <td>${s.species}</td>
            <td>${s.observer}</td>
            <td>${s.notes}</td>
            <td><button data-index="${index}">Edit</button></td>
        `;

        tr.querySelector("button").addEventListener("click", () => {
            elements.species.value = s.species;
            elements.notes.value = s.notes;
            elements.observer.value = s.observer;
            state.editIndex = index;
        });

        elements.summaryBody.appendChild(tr);
    });
}

return { init };

})();

document.addEventListener("DOMContentLoaded", BushloggerApp.init);
