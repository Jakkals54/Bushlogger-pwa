const BushloggerApp = (() => {

const state = { sightings: [], editIndex: null, observers: ["Guest"], checklist: [] };
const elements = {};

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

function bindEvents() {
    elements.logButton.addEventListener("click", handleLog);
    elements.actionButton.addEventListener("click", handleAction);
    elements.selectAll.addEventListener("change", toggleSelectAll);
    elements.gpsToggle.addEventListener("change", updateGPSStatus);
    elements.csvInput.addEventListener("change", handleCSVLoad);
    document.addEventListener("change", updateSelectionState);
}

function updateGPSStatus() {
    elements.gpsStatus.textContent = elements.gpsToggle.checked ? "GPS ON" : "GPS OFF";
}

// ---------------- GPS ----------------
function getGPS() {
    return new Promise(resolve => {

        if (!elements.gpsToggle.checked) {
            resolve({ lat: "", lon: "" });
            return;
        }

        if (!navigator.geolocation) {
            alert("Geolocation not supported.");
            resolve({ lat: "", lon: "" });
            return;
        }

        elements.gpsStatus.textContent = "Fetching GPS...";

        navigator.geolocation.getCurrentPosition(
            pos => {
                elements.gpsStatus.textContent = "GPS ON";
                resolve({
                    lat: pos.coords.latitude.toFixed(6),
                    lon: pos.coords.longitude.toFixed(6)
                });
            },
            () => {
                alert("GPS permission denied or unavailable.");
                elements.gpsStatus.textContent = "GPS ERROR";
                resolve({ lat: "", lon: "" });
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

// ---------------- LOGGING ----------------
async function handleLog(speciesOverride=null) {
    const species = (speciesOverride || elements.species.value.trim());
    if (!species) { alert("Enter species/object."); return; }

    const observer = elements.observer.value.trim() || "Guest";
    if (!state.observers.includes(observer)) {
        state.observers.push(observer);
        populateObservers();
    }

    const notes = elements.notes.value.trim();
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().split(" ")[0];

    const duplicateIndex = state.sightings.findIndex(s => 
        s.species.toLowerCase() === species.toLowerCase() && s.date === date
    );

    if (duplicateIndex !== -1 && state.editIndex === null) {
        if (!confirm(`"${species}" already logged today. Replace?`)) return;
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

// ---------------- RENDER ----------------
function render() {
    elements.summaryBody.innerHTML = "";

    state.sightings.forEach((s,index)=>{
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="checkbox" class="selectSighting" data-index="${index}"></td>
            <td>${index+1}</td>
            <td>${s.date}</td>
            <td>${s.species}</td>
            <td>${s.observer}</td>
            <td>${s.lat && s.lon ? `${s.lat}, ${s.lon}` : "No GPS"}</td>
            <td>${s.notes}</td>
        `;
        elements.summaryBody.appendChild(tr);
    });

    elements.selectAll.checked = false;
}

function toggleSelectAll() {
    document.querySelectorAll('.selectSighting')
        .forEach(cb => cb.checked = elements.selectAll.checked);
}

function updateSelectionState() {
    const selected = document.querySelectorAll('.selectSighting:checked').length;
    document.getElementById("selectedCount").textContent = `(${selected} selected)`;
    elements.actionButton.disabled = selected === 0;
}

// ---------------- ACTIONS ----------------
function handleAction() {
    const action = elements.actionSelector.value;
    const selectedCheckboxes = document.querySelectorAll('.selectSighting:checked');
    const indices = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.index));

    if (!indices.length && !action.includes("All")) {
        alert("Select at least one sighting.");
        return;
    }

    if (action === "edit") {
        if (indices.length > 1) { alert("Edit one at a time."); return; }
        editSighting(indices[0]);
    }
    else if (action === "delete") deleteSightings(indices);
    else if (action === "export") exportCSV(indices.map(i=>state.sightings[i]));
    else if (action === "share") shareSightings(indices.map(i=>state.sightings[i]));
    else if (action === "exportAllCSV") exportCSV(state.sightings);
    else if (action === "exportAllExcel") exportExcel(state.sightings);
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

// ---------------- CSV EXPORT (iPhone Safe) ----------------
function exportCSV(arr) {
    if (!arr.length) { alert("No sightings to export."); return; }

    let csv = "Date,Time,Observer,Species/Object,Notes,Latitude,Longitude\n";
    arr.forEach(s => {
        csv += `${s.date},${s.time},${s.observer},${s.species},"${s.notes}",${s.lat},${s.lon}\n`;
    });

    if (navigator.share && navigator.canShare) {
        const blob = new Blob([csv], { type: "text/csv" });
        const file = new File([blob], "bushlogger_export.csv", { type: "text/csv" });

        if (navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: "BushLogger Export" });
            return;
        }
    }

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

// ---------------- EXCEL EXPORT ----------------
function exportExcel(arr) {
    if (!arr.length) { alert("No sightings to export."); return; }

    let table = `<table><tr>
    <th>Date</th><th>Time</th><th>Observer</th>
    <th>Species/Object</th><th>Notes</th>
    <th>Latitude</th><th>Longitude</th></tr>`;

    arr.forEach(s=>{
        table+=`<tr>
        <td>${s.date}</td>
        <td>${s.time}</td>
        <td>${s.observer}</td>
        <td>${s.species}</td>
        <td>${s.notes}</td>
        <td>${s.lat}</td>
        <td>${s.lon}</td>
        </tr>`;
    });

    table+="</table>";

    const blob = new Blob([table], { type:"application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="bushlogger_export.xls";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ---------------- CSV CHECKLIST ----------------
function handleCSVLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {

        let text = e.target.result;
        text = text.replace(/\r\n/g,"\n").replace(/\r/g,"\n");

        const rows = text.split("\n")
            .map(r=>r.trim())
            .filter(r=>r.length>0);

        state.checklist = rows.map(r =>
            r.split(",")[0].replace(/"/g,"").trim()
        );

        renderChecklist();
    };
    reader.readAsText(file);
}

function renderChecklist() {
    elements.checklistContainer.innerHTML = "";

    state.checklist.forEach(species=>{
        const id = "chk_" + species.replace(/\s+/g,"_");

        const wrapper=document.createElement("div");
        wrapper.innerHTML=`
        <input type="checkbox" id="${id}">
        <label for="${id}">${species}</label>`;

        wrapper.querySelector("input").addEventListener("change", e=>{
            if(e.target.checked) handleLog(species);
        });

        elements.checklistContainer.appendChild(wrapper);
    });
}

return { init };

})();

document.addEventListener("DOMContentLoaded", BushloggerApp.init);
