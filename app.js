const state = {
    sightings: [],
    observers: ["Guest"],
    checklist: [],
    editIndex: null
};

document.addEventListener("DOMContentLoaded", init);

function init() {
    loadStorage();
    bindEvents();
    populateObservers();
    render();
}

function bindEvents() {
    document.getElementById("logButton").addEventListener("click", () => logEntry());
    document.getElementById("gpsToggle").addEventListener("change", updateGPS);
    document.getElementById("csvInput").addEventListener("change", loadCSV);
    document.getElementById("selectAll").addEventListener("change", toggleSelectAll);
    document.getElementById("actionButton").addEventListener("click", handleAction);
    document.addEventListener("change", updateSelectionState);
}

function loadStorage() {
    state.sightings = JSON.parse(localStorage.getItem("bushlogger_data")) || [];
}

function saveStorage() {
    localStorage.setItem("bushlogger_data", JSON.stringify(state.sightings));
}

function populateObservers() {
    const list = document.getElementById("observerList");
    list.innerHTML = "";
    state.observers.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o;
        list.appendChild(opt);
    });
}

function updateGPS() {
    const status = document.getElementById("gpsStatus");
    status.textContent = document.getElementById("gpsToggle").checked ? "GPS ON" : "GPS OFF";
}

async function getGPS() {
    if (!document.getElementById("gpsToggle").checked) {
        return {lat:"-25.000000", lon:"31.000000"};
    }
    return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
            pos => resolve({
                lat: pos.coords.latitude.toFixed(6),
                lon: pos.coords.longitude.toFixed(6)
            }),
            () => resolve({lat:"-25.000000", lon:"31.000000"})
        );
    });
}

async function logEntry(speciesOverride=null) {

    const species = speciesOverride || document.getElementById("species").value.trim();
    if (!species) return alert("Enter species");

    const observer = document.getElementById("observer").value || "Guest";
    const notes = document.getElementById("notes").value;

    const now = new Date();
    const date = now.toISOString().split("T")[0];

    const duplicate = state.sightings.findIndex(s =>
        s.species.toLowerCase() === species.toLowerCase() && s.date === date
    );

    if (duplicate !== -1 && state.editIndex === null) {
        if (!confirm("Already logged today. Replace?")) return;
        state.sightings.splice(duplicate,1);
    }

    const gps = await getGPS();

    const entry = {
        date,
        time: now.toTimeString().split(" ")[0],
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

    saveStorage();
    render();
    document.getElementById("species").value="";
    document.getElementById("notes").value="";
}

function render() {
    const body = document.getElementById("summaryBody");
    body.innerHTML="";
    state.sightings.forEach((s,i)=>{
        body.innerHTML += `
        <tr>
            <td><input type="checkbox" class="rowCheck" data-index="${i}"></td>
            <td>${i+1}</td>
            <td>${s.date}</td>
            <td>${s.species}</td>
            <td>${s.observer}</td>
            <td>${s.lat}, ${s.lon}</td>
            <td>${s.notes}</td>
        </tr>`;
    });
    updateSelectionState();
}

function toggleSelectAll() {
    document.querySelectorAll(".rowCheck")
        .forEach(cb => cb.checked=document.getElementById("selectAll").checked);
    updateSelectionState();
}

function updateSelectionState() {
    const selected=document.querySelectorAll(".rowCheck:checked").length;
    document.getElementById("selectedCount").textContent=`(${selected} selected)`;
    document.getElementById("actionButton").disabled=(selected===0);
}

function handleAction() {

    const action=document.getElementById("actionSelector").value;
    const selected=[...document.querySelectorAll(".rowCheck:checked")]
        .map(cb=>parseInt(cb.dataset.index));

    if(action==="edit"){
        if(selected.length!==1) return alert("Select one to edit");
        const s=state.sightings[selected[0]];
        document.getElementById("species").value=s.species;
        document.getElementById("notes").value=s.notes;
        document.getElementById("observer").value=s.observer;
        state.editIndex=selected[0];
    }

    if(action==="delete"){
        selected.sort((a,b)=>b-a).forEach(i=>state.sightings.splice(i,1));
        saveStorage(); render();
    }

    if(action==="export"){
        exportCSV(selected.map(i=>state.sightings[i]));
    }

    if(action==="share"){
        share(selected.map(i=>state.sightings[i]));
    }

    if(action==="exportAllCSV"){
        exportCSV(state.sightings);
    }

    if(action==="exportAllExcel"){
        exportExcel(state.sightings);
    }
}

function exportCSV(list){
    if(!list.length) return alert("No data");
    let csv="Date,Time,Observer,Species,Notes,Lat,Lon\n";
    list.forEach(s=>{
        csv+=`${s.date},${s.time},${s.observer},${s.species},"${s.notes}",${s.lat},${s.lon}\n`;
    });
    downloadFile(csv,"bushlogger.csv","text/csv");
}

function exportExcel(list){
    if(!list.length) return alert("No data");
    let table="<table><tr><th>Date</th><th>Time</th><th>Observer</th><th>Species</th><th>Notes</th><th>Lat</th><th>Lon</th></tr>";
    list.forEach(s=>{
        table+=`<tr><td>${s.date}</td><td>${s.time}</td><td>${s.observer}</td><td>${s.species}</td><td>${s.notes}</td><td>${s.lat}</td><td>${s.lon}</td></tr>`;
    });
    table+="</table>";
    downloadFile(table,"bushlogger.xls","application/vnd.ms-excel");
}

function downloadFile(content,name,type){
    const blob=new Blob([content],{type});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=name;a.click();
    URL.revokeObjectURL(url);
}

function share(list){
    let msg="";
    list.forEach(s=>{
        msg+=`Species: ${s.species}\nObserver: ${s.observer}\nGPS: ${s.lat}, ${s.lon}\n\n`;
    });
    if(navigator.share){
        navigator.share({title:"BushLogger",text:msg});
    }else{
        navigator.clipboard.writeText(msg);
        alert("Copied to clipboard");
    }
}

function loadCSV(e){
    const file=e.target.files[0];
    if(!file) return;
    const reader=new FileReader();
    reader.onload=function(evt){
        const lines=evt.target.result.split(/\r?\n/)
            .map(l=>l.replace(/"/g,"").trim())
            .filter(l=>l);
        state.checklist=lines.slice(1);
        renderChecklist();
    };
    reader.readAsText(file);
}

function renderChecklist(){
    const box=document.getElementById("checklistContainer");
    box.innerHTML="";
    state.checklist.forEach(species=>{
        const div=document.createElement("div");
        div.innerHTML=`<input type="checkbox"> ${species}`;
        div.querySelector("input").addEventListener("change",e=>{
            if(e.target.checked) logEntry(species);
        });
        box.appendChild(div);
    });
}
