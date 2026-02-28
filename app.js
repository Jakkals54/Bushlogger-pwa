const BushloggerApp = (() => {

const state = {
    sightings: [],
    observers: ["Guest"],
    checklist: [],
    editIndex: null
};

const elements = {};

function init() {
    cache();
    loadStorage();
    populateObservers();
    bind();
    render();
}

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

function bind() {
    elements.csvInput.addEventListener("change", loadCSV);
    elements.search.addEventListener("input", handleSearch);
    elements.logButton.addEventListener("click", handleLog);
}

function loadStorage() {
    state.sightings = JSON.parse(localStorage.getItem("bush_sightings")) || [];
    state.observers = JSON.parse(localStorage.getItem("bush_observers")) || ["Guest"];
}

function saveSightings() {
    localStorage.setItem("bush_sightings", JSON.stringify(state.sightings));
}

function saveObservers() {
    localStorage.setItem("bush_observers", JSON.stringify(state.observers));
}

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

function renderChecklist(list) {
    elements.container.innerHTML = "";

    list.forEach(row => {

        const birdNumber = row[0];
        const english = row[1] || "";
        const afrikaans = row[2] || "";

        const div = document.createElement("div");

        div.innerHTML = `
            <label>
                <input type="checkbox">
                ${birdNumber} - ${english} / ${afrikaans}
            </label>
        `;

        const checkbox = div.querySelector("input");

        checkbox.addEventListener("change", function () {
            if (this.checked) {
                logFromChecklist(row);
                this.checked = false;
            }
        });

        elements.container.appendChild(div);
    });
}

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

function clearForm() {
    elements.species.value = "";
    elements.notes.value = "";
}

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
