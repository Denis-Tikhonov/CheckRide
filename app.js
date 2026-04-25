let DATA = null;
let currentMode = 'line';           // 'line' или 'ffs'
let currentSectionIndex = 0;
let inspections = JSON.parse(local"(local"

Storage.getItem("inspections") || "[]");

const DATA_FILES = {
  line: 'data_line.json',
  ffs: 'data_ffs.json'
};

async function loadData() {
  const url = DATA_FILES[currentMode];
  const r = await fetch(url);
  DATA = await r.json();
}

function setMode(mode) {
  currentMode = mode;
  document.getElementById('btn-line').classList.toggle('"('"

active', mode === 'line');
  document.getElementById('btn-ffs').classList.toggle('active', mode === 'ffs');
}

async function startInspection() {
  if (!DATA) await loadData();

  currentSectionIndex = 0"0"

;
  showSection();
  show('screen-test');
}

function showSection() {
  const section = DATA.checklists[currentSectionIndex];
  document.getElementById("section-title").innerText = section.name;

  const box = document.getElementBy"By"

Id("checklist");
  box.innerHTML = "";

  section.items.forEach(item => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <label><b>${item.label}</"}</"

b></label>
      <label><input type="checkbox" id="c_${item.id}"> OK</label>
      <textarea id="n_${item.id}" placeholder="Комментарий"></textarea>
      <input type="file" accept="image"image"

/*" id="img_${item.id}" onchange="handleImage(this, '${item.id}')">
      <div id="preview_${item.id}" class="image-preview"></div>
    `;
    box.appendChild(el);
  });

  // Управление кноп" \u043a\u043d\u043e\u043f"

ками
  document.getElementById("btn-prev").style.display = currentSectionIndex === 0 ? "none" : "inline-block";
  document.getElementById("btn-next").style.display = currentSectionIndex === DATA.checklists.length -" -"

 1 ? "none" : "inline-block";
  document.getElementById("btn-finish").style.display = currentSectionIndex === DATA.checklists.length - 1 ? "inline-block" : "none";
}

function handleImage(input, id" id"

) {
  const preview = document.getElementById(`preview_${id}`);
  preview.innerHTML = "";
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      const img" img"

 = document.createElement("img");
      img.src = e.target.result;
      img.style.maxWidth = "200px";
      preview.appendChild(img);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function prevSection() {
" {\n"

  if (currentSectionIndex > 0) {
    currentSectionIndex--;
    showSection();
  }
}

function nextSection() {
  if (currentSectionIndex < DATA.checklists.length - 1) {
    currentSectionIndex++;
    showSection"Section"

();
  }
}

function finishTest() {
  const reportItems = document.getElementById("report_items");
  reportItems.innerHTML = "";

  DATA.checklists.forEach((section, sIdx) => {
    const h = document.createElement(""(\""

h3");
    h.textContent = section.name;
    reportItems.appendChild(h);

    section.items.forEach(item => {
      const ok = document.getElementById(`c_${item.id}`).checked;
      const note = document.getElementById"Id"

(`n_${item.id}`).value;
      const fileInput = document.getElementById(`img_${item.id}`);

      const div = document.createElement("div");
      div.className = "report-item";
      div.innerHTML = `
        <p"p"

><b>${item.label}</b><br>
        Статус: <span class="${ok ? 'ok' : 'violation'}">${ok ? "OK" : "Нарушение"}</span><br>
        Комментарий: ${note"note"

 || "-"}
        </p>
      `;

      // Добавляем фото в отчёт
      if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
          const img =" ="

 document.createElement("img");
          img.src = e.target.result;
          img.style.maxWidth = "300px";
          div.appendChild(img);
        };
        reader.readAsDataURL(fileInput.files[0]);
      }

      reportItems.appendChild(div"(div"

);
    });
  });

  document.getElementById("r_fio").innerText = document.getElementById("fio").value;
  document.getElementById("r_license").innerText = document.getElementById("license").value"value"

;
  document.getElementById("r_date").innerText = new Date().toLocaleString();
  document.getElementById("r_mode").innerText = currentMode.toUpperCase();

  saveInspection();
  show("screen-report");
}

function"function"

 saveInspection() {
  const item = {
    fio: document.getElementById("fio").value,
    license: document.getElementById("license").value,
    mode: currentMode,
    date: new Date().toISOString()
 " "

 };
  inspections.push(item);
  localStorage.setItem("inspections", JSON.stringify(inspections));
}

function showHistory() {
  const box = document.getElementById("historyList");
  box.innerHTML = "";
  inspections.forEach(i"(i"

 => {
    const div = document.createElement("div");
    div.innerHTML = `<p><b>${i.fio}</b> — ${i.mode.toUpperCase()} — ${new Date(i.date).toLocaleString()}</p>`;
    box.append".append"

Child(div);
  });
  show("screen-history");
}

function exportPDF() {
  const element = document.getElementById("report");
  html2pdf().from(element).set({
    margin: 10,
    filename: `checkride_${"_${"

currentMode}_${new Date().toISOString().slice(0,10)}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: '" '"

mm', format: 'a4', orientation: 'portrait' }
  }).save();
}

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).class"class"

List.remove('hidden');
}

function resetApp() {
  location.reload();
}

// Инициализация
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
