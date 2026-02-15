let localSightings = JSON.parse(localStorage.getItem("bushlog_local"))||[];
let areaDatabase = JSON.parse(localStorage.getItem("bushlog_area"))||[];
let currentLat=null,currentLng=null;

function getLocation(){navigator.geolocation?navigator.geolocation.getCurrentPosition(pos=>{currentLat=pos.coords.latitude;currentLng=pos.coords.longitude;document.getElementById("coords").innerText=`Lat: ${currentLat.toFixed(5)}, Lon: ${currentLng.toFixed(5)}`},()=>alert("Unable to get GPS")):alert("GPS not supported");}

function logSighting(){if(!currentLat){alert("Capture GPS first");return;}let o=document.getElementById("observer").value.trim()||"Unknown",s=document.getElementById("species").value.trim();if(!s){alert("Species required");return;}let n=document.getElementById("notes").value.trim();let e={id:Date.now(),observer:o,species:s,notes:n,lat:currentLat,lng:currentLng,timestamp:new Date().toLocaleString()};localSightings.push(e);localStorage.setItem("bushlog_local",JSON.stringify(localSightings));renderSightings();document.getElementById("species").value="";document.getElementById("notes").value="";}

function renderSightings(){let list=document.getElementById("sightingList");list.innerHTML="";localSightings.slice().reverse().forEach(entry=>{let li=document.createElement("li");li.className="entry";li.innerHTML=`<strong>${entry.species}</strong> by ${entry.observer}<br>${entry.notes}<br>${entry.timestamp}<br>
<button class="small-btn" onclick='navigate(${JSON.stringify(entry)})'>🧭 Navigate</button>
<button class="small-btn" onclick='share(${JSON.stringify(entry)})'>📤 Share</button>
<button class="delete-btn" onclick="deleteEntry(${entry.id})">Delete</button>`;list.appendChild(li);});}

function navigate(entry){window.open(`https://maps.google.com/?q=${entry.lat},${entry.lng}`,"_blank");}
function share(entry){let t=`${entry.species} by ${entry.observer}\n${entry.notes}\nhttps://maps.google.com/?q=${entry.lat},${entry.lng}`;navigator.share?navigator.share({text:t}):alert(t);}
function deleteEntry(id){if(confirm("Delete this sighting?")){localSightings=localSightings.filter(e=>e.id!==id);localStorage.setItem("bushlog_local",JSON.stringify(localSightings));renderSightings();}}
function syncDatabase(){areaDatabase=areaDatabase.concat(localSightings);localSightings=[];localStorage.setItem("bushlog_local",JSON.stringify(localSightings));localStorage.setItem("bushlog_area",JSON.stringify(areaDatabase));renderSightings();alert("Local sightings synced to Area Database!");}
function generateSummary(){if(areaDatabase.length===0){alert("No sightings in database");return;}let totalSpecies=new Set(areaDatabase.map(e=>e.species)).size;let summary=`Total Species Logged: ${totalSpecies}\nNew Species Today: `;let today=new Date().toLocaleDateString();let newToday=areaDatabase.filter(e=>e.timestamp.includes(today)).map(e=>e.species);summary+=new Set(newToday).size;alert(summary);}
function exportCSV(){if(areaDatabase.length===0){alert("No data to export");return;}let csv="Observer,Species,Notes,Lat,Lng,Timestamp\n";areaDatabase.forEach(e=>{csv+=`"${e.observer}","${e.species}","${e.notes}",${e.lat},${e.lng},"${e.timestamp}"\n`;});let blob=new Blob([csv],{type:"text/csv"});let url=URL.createObjectURL(blob);let a=document.createElement("a");a.href=url;a.download="bushlog_area.csv";a.click();}
renderSightings();
