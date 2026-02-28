const BushloggerApp = (() => {

const state = {
    sightings: [],
    observers: ["Guest"],
    checklist: [],
    editIndex: null,
    displayColumns: null
};

const elements = {};
let deferredPrompt = null;

// ---------------- INIT ----------------
function init() {
    cache();
    loadStorage();
    populateObservers();
    bind();
    initDarkMode();
    initOnlineStatus();
    initInstallPrompt();
    render();
}

// ---------------- CACHE ----------------
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
    elements.darkBtn = document.getElementById("darkModeToggle");
    elements.offlineIndicator = document.getElementById("offlineIndicator");
    elements.installBtn = document.getElementById("installBtn");
}

// ---------------- DARK MODE ----------------
function initDarkMode() {
    if (!elements.darkBtn) return;

    if (localStorage.getItem("darkMode") === "on") {
        document.body.classList.add("dark");
        elements.darkBtn.textContent = "☀ Light Mode";
    }

    elements.darkBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark");

        if (document.body.classList.contains("dark")) {
            localStorage.setItem("darkMode", "on");
            elements.darkBtn.textContent = "☀ Light Mode";
        } else {
            localStorage.setItem("darkMode", "off");
            elements.darkBtn.textContent = "🌙 Dark Mode";
        }
    });
}

// ---------------- ONLINE STATUS ----------------
function initOnlineStatus() {
    if (!elements.offlineIndicator) return;

    function update() {
        elements.offlineIndicator.style.display =
            navigator.onLine ? "none" : "block";
    }

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
}

// ---------------- INSTALL PROMPT ----------------
function initInstallPrompt() {
    if (!elements.installBtn) return;

    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredPrompt = e;
        elements.installBtn.style.display = "inline-block";
    });

    elements.installBtn.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        elements.installBtn.style.display = "none";
    });
}

// ---------------- BIND EVENTS ----------------
function bind() {
    if (elements.csvInput)
        elements.csvInput.addEventListener("change", loadCSV);

    if (elements.search)
        elements.search.addEventListener("input", handleSearch);

    if (elements.logButton)
        elements.logButton.addEventListener("click", handleLog);

    if (elements.applyColumns)
        elements.applyColumns.addEventListener("click", applySelectedColumns);
}

// ---------------- STORAGE ----------------
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

// ---------------- OBSERVERS ----------------
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

// ---------------- CSV ----------------
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

            if (index === 0) {
                option.selected = true;
                option.disabled = true;
            }

            elements.columnSelector.appendChild(option);
        });

        state.checklist = lines.slice(1).map(line =>
            line.split(",").map(cell => cell.trim())
        );

        renderChecklist(state.checklist);
    };

    reader.readAsText(file, "UTF-8");
}

// ---------------- CHECKLIST ----------------
function renderChecklist(list) {
    elements.container.innerHTML = "";
    const today = new Date().toISOString().split("T")[0];

    list.forEach(row => {
        if (!Array.isArray(row)) return;

        const wrapper = document.createElement("div");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";

        const alreadyLogged = state.sightings.some(s =>
            s.birdNumber === row[0] && s.date === today
        );

        checkbox.checked = alreadyLogged;

        const displayText = state.displayColumns
            ? state.displayColumns.map(i => row[i]).join(" | ")
            : row.join(" | ");

        const label = document.createElement("label");
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(" " + displayText));

        wrapper.appendChild(label);
        elements.container.appendChild(wrapper);

        checkbox.addEventListener("change", () => {
            if (!alreadyLogged) {
                handleLog(displayText, row[0]);
            }
        });
    });
}

// ---------------- LOGGING ----------------
function handleLog(speciesOverride = null, birdNumberOverride = "") {
    const species = speciesOverride || elements.species.value.trim();
    if (!species) return;

    const observer = elements.observer.value.trim() || "Guest";
    const notes = elements.notes.value.trim();
    const date = new Date().toISOString().split("T")[0];

    const entry = { date, birdNumber: birdNumberOverride, species, observer, notes };

    state.sightings.push(entry);
    saveSightings();
    render();
    clearForm();
}

function clearForm() {
    elements.species.value = "";
    elements.notes.value = "";
}

// ---------------- RENDER TABLE ----------------
function render() {
    elements.summaryBody.innerHTML = "";

    state.sightings.forEach((entry, index) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td><input type="checkbox"></td>
            <td>${index + 1}</td>
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
