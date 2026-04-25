let DATA = null;
let currentMode = 'line';
let currentSectionIndex = 0;

function setMode(mode) {
    currentMode = mode;
    document.getElementById('btn-line').classList.toggle('active', mode === 'line');
    document.getElementById('btn-ffs').classList.toggle('active', mode === 'ffs');
}

async function startInspection() {
    if (!document.getElementById("fio").value) return alert("Введите ФИО");
    const file = currentMode === 'line' ? 'data.json' : 'data_ffs.json';
    const response = await fetch(file);
    DATA = await response.json();
    
    // Инициализация полей
    DATA.checklists.forEach(sec => sec.items.forEach(i => {
        i.ok = false; i.note = ""; i.img = null;
    }));

    currentSectionIndex = 0;
    renderSection();
    show('screen-test');
}

function renderSection() {
    const section = DATA.checklists[currentSectionIndex];
    document.getElementById("section-title").innerText = section.name;
    const box = document.getElementById("checklist");
    box.innerHTML = "";

    section.items.forEach(item => {
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `
            <p><b>${item.label}</b></p>
            <div class="checkbox-row">
                <input type="checkbox" id="c_${item.id}" ${item.ok ? 'checked' : ''}>
                <label for="c_${item.id}">OK</label>
            </div>
            <textarea id="n_${item.id}" placeholder="Комментарий">${item.note}</textarea>
            <input type="file" accept="image/*" onchange="saveImg(this, '${item.id}')">
            <div id="p_${item.id}">${item.img ? `<img src="${item.img}" width="100">` : ''}</div>
        `;
        box.appendChild(div);
    });
    updateNav();
}

async function saveImg(input, id) {
    if (input.files[0]) {
        const b64 = await toBase64(input.files[0]);
        DATA.checklists.find(s => s.items.find(i => i.id === id)).items.find(i => i.id === id).img = b64;
        document.getElementById(`p_${id}`).innerHTML = `<img src="${b64}" width="100">`;
    }
}

function saveCurrent() {
    const section = DATA.checklists[currentSectionIndex];
    section.items.forEach(item => {
        item.ok = document.getElementById(`c_${item.id}`).checked;
        item.note = document.getElementById(`n_${item.id}`).value;
    });
}

function nextSection() { saveCurrent(); currentSectionIndex++; renderSection(); }
function prevSection() { saveCurrent(); currentSectionIndex--; renderSection(); }

function updateNav() {
    const isLast = currentSectionIndex === DATA.checklists.length - 1;
    document.getElementById("btn-prev").style.display = currentSectionIndex === 0 ? "none" : "block";
    document.getElementById("btn-next").style.display = isLast ? "none" : "block";
    document.getElementById("btn-finish").classList.toggle("hidden", !isLast);
}

function finishInspection() {
    saveCurrent();
    const container = document.getElementById("report-data");
    container.innerHTML = "";

    DATA.checklists.forEach(section => {
        const sDiv = document.createElement("div");
        sDiv.innerHTML = `<h3 class="rep-sec-title">${section.name}</h3>`;
        section.items.forEach(item => {
            sDiv.innerHTML += `
                <div class="rep-row">
                    <p><b>${item.label}</b></p>
                    <p class="flex-row">
                        <span class="box">${item.ok ? 'X' : ''}</span> 
                        <span>Статус: ${item.ok ? 'OK' : 'Нарушение'}</span>
                    </p>
                    <p>Коммент: ${item.note || '-'}</p>
                    ${item.img ? `<img src="${item.img}" class="rep-img">` : ''}
                </div>`;
        });
        container.appendChild(sDiv);
    });

    document.getElementById("r_fio").innerText = document.getElementById("fio").value;
    document.getElementById("r_license").innerText = document.getElementById("license").value;
    document.getElementById("r_date").innerText = new Date().toLocaleString();
    document.getElementById("r_mode").innerText = currentMode.toUpperCase();

    show("screen-report");
    initSignature();
}

function exportPDF() {
    const canvas = document.getElementById("signature");
    const sigImg = document.getElementById("sig-image-container");
    
    // Переносим подпись в картинку, чтобы PDF её увидел
    sigImg.innerHTML = `<img src="${canvas.toDataURL()}" style="width:300px; border-bottom:1px solid #000">`;
    canvas.style.display = "none";

    const element = document.getElementById("report-content");
    const opt = {
        margin: 10,
        filename: 'Report.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        canvas.style.display = "block";
        sigImg.innerHTML = "";
    });
}

function initSignature() {
    const canvas = document.getElementById("signature");
    const ctx = canvas.getContext("2d");
    let drawing = false;
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: cx - rect.left, y: cy - rect.top };
    };
    canvas.onmousedown = canvas.ontouchstart = (e) => {
        drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y);
    };
    canvas.onmousemove = canvas.ontouchmove = (e) => {
        if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
    };
    canvas.onmouseup = canvas.ontouchend = () => drawing = false;
    ctx.lineWidth = 2;
}

const toBase64 = file => new Promise(r => {
    const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => r(reader.result);
});

function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function resetApp() { location.reload(); }
