
let DATA=null
let inspections=[]

async function loadData(){
const r = await fetch('data.json')
DATA = await r.json()

const sel=document.getElementById("checklistSelect")
DATA.checklists.forEach((c,i)=>{
const o=document.createElement("option")
o.value=i
o.textContent=c.name
sel.appendChild(o)
})
}

function show(id){
document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'))
document.getElementById(id).classList.remove('hidden')
}

async function startTest(){

if(!DATA) await loadData()

const idx=document.getElementById("checklistSelect").value
const list=DATA.checklists[idx]

document.getElementById("section-title").innerText=list.name

const box=document.getElementById("checklist")
box.innerHTML=""

list.items.forEach(i=>{

const el=document.createElement("div")
el.className="item"

el.innerHTML=`
<label><b>${i.label}</b></label>
<label><input type="checkbox" id="c_${i.id}"> OK</label>
<textarea id="n_${i.id}" placeholder="Комментарий"></textarea>
<input type="file" accept="image/*">
`

box.appendChild(el)

})

initSignature()

show("screen-test")

}

function initSignature(){

const canvas=document.getElementById("signature")
const ctx=canvas.getContext("2d")
let drawing=false

canvas.onmousedown=()=>drawing=true
canvas.onmouseup=()=>drawing=false
canvas.onmousemove=e=>{
if(!drawing) return
ctx.lineWidth=2
ctx.lineTo(e.offsetX,e.offsetY)
ctx.stroke()
}
}

function finishTest(){

const reportItems=document.getElementById("report_items")
reportItems.innerHTML=""

const idx=document.getElementById("checklistSelect").value
const list=DATA.checklists[idx]

list.items.forEach(i=>{

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

reportItems.appendChild(div)

})

document.getElementById("r_fio").innerText=document.getElementById("fio").value
document.getElementById("r_license").innerText=document.getElementById("license").value
document.getElementById("r_date").innerText=new Date().toLocaleString()

saveInspection()

show("screen-report")

}

function saveInspection(){

const item={
fio:document.getElementById("fio").value,
license:document.getElementById("license").value,
date:new Date().toISOString()
}

inspections.push(item)
localStorage.setItem("inspections",JSON.stringify(inspections))

}

function showHistory(){

const data=JSON.parse(localStorage.getItem("inspections")||"[]")
const box=document.getElementById("historyList")
box.innerHTML=""

data.forEach(i=>{
const div=document.createElement("div")
div.innerHTML=`<p><b>${i.fio}</b> — ${i.date}</p>`
box.appendChild(div)
})

show("screen-history")

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
