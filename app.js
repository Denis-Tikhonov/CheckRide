
let DATA=null

async function loadData(){
const r = await fetch('data.json')
DATA = await r.json()
}

function show(id){
document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'))
document.getElementById(id).classList.remove('hidden')
}

async function startTest(){

if(!DATA) await loadData()

document.getElementById('section-title').innerText=DATA.section

const box=document.getElementById('checklist')
box.innerHTML=""

DATA.items.forEach(i=>{

const el=document.createElement('div')
el.className="item"

el.innerHTML=`
<label><b>${i.label}</b></label>
<label><input type="checkbox" id="c_${i.id}"> Выполнено</label>
<textarea id="n_${i.id}" placeholder="Комментарий"></textarea>
<input type="file" id="p_${i.id}" accept="image/*">
`

box.appendChild(el)

})

show("screen-test")

}

function finishTest(){

document.getElementById("r_fio").innerText=document.getElementById("fio").value
document.getElementById("r_license").innerText=document.getElementById("license").value

const list=document.getElementById("report_items")
list.innerHTML=""

DATA.items.forEach(i=>{

const ok=document.getElementById("c_"+i.id).checked
const note=document.getElementById("n_"+i.id).value

const div=document.createElement("div")

div.innerHTML=`
<p>
<b>${i.label}</b><br>
Статус: ${ok?"OK":"Нарушение"}<br>
Комментарий: ${note || "-"}
</p>
`

list.appendChild(div)

})

saveInspection()

show("screen-report")

}

function saveInspection(){

const data={
fio:document.getElementById("fio").value,
license:document.getElementById("license").value,
date:new Date().toISOString()
}

localStorage.setItem("lastInspection",JSON.stringify(data))

}

function exportPDF(){

const el=document.getElementById("report")
html2pdf().from(el).save("checkride_report.pdf")

}

function resetApp(){
location.reload()
}

if('serviceWorker' in navigator){
navigator.serviceWorker.register('sw.js')
}
