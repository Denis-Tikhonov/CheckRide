:root {
    --red: rgb(205, 32, 44);
    --black: rgb(0, 0, 0);
    --light-grey: rgb(188, 189, 188);
    --dark-grey: rgb(116, 118, 120);
    --dark-red: rgb(170, 39, 47);
    --white: rgb(255, 255, 255);
}

body { font-family: Arial, sans-serif; background: var(--light-grey); margin: 0; color: var(--black); }

/* Шапка с логотипом */
header { background: var(--red); color: var(--white); padding: 10px 0; }
.header-container { 
    max-width: 800px; margin: 0 auto; display: flex; 
    align-items: center; justify-content: flex-start; gap: 15px; padding: 0 15px;
}
.logo { height: 40px; width: auto; }
header h1 { margin: 0; font-size: 1.2rem; }

.screen { 
    background: var(--white); max-width: 650px; margin: 15px auto; 
    padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
}
.hidden { display: none !important; }

/* Кнопки режима */
.mode-selector { display: flex; gap: 10px; margin-bottom: 15px; }
.mode-btn { flex: 1; padding: 12px; border: 1px solid var(--dark-grey); background: var(--white); cursor: pointer; }
.mode-btn.active { background: var(--red); color: var(--white); border-color: var(--red); }

/* Поля ввода */
input[type="text"], textarea { 
    width: 100%; padding: 12px; margin: 8px 0; 
    border: 1px solid var(--dark-grey); border-radius: 4px; box-sizing: border-box; 
}

/* Чекбоксы: строго в одну строку слева */
.check-item { 
    display: flex; align-items: center; justify-content: flex-start; 
    gap: 12px; padding: 10px 0; border-bottom: 1px solid #eee; 
}
.check-item input[type="checkbox"] { 
    width: 22px; height: 22px; flex-shrink: 0; margin: 0; cursor: pointer; 
}
.check-item label { cursor: pointer; font-size: 15px; line-height: 1.2; }

/* Детали внизу */
.separator { margin: 25px 0 15px; border: 0; border-top: 2px solid var(--light-grey); }
.sub-title { color: var(--dark-grey); font-size: 1rem; margin-bottom: 15px; }
.detail-item { background: #f9f9f9; padding: 10px; border-radius: 5px; margin-bottom: 15px; }
.detail-item b { font-size: 12px; color: var(--dark-grey); display: block; margin-bottom: 5px; }

/* Кнопки навигации */
.navigation-controls { display: flex; gap: 10px; margin-top: 20px; }
.nav-button, .main-btn, .secondary-btn, .finish-btn { 
    border: none; border-radius: 4px; cursor: pointer; font-weight: bold; 
}
.main-btn { background: var(--red); color: var(--white); width: 100%; padding: 15px; font-size: 16px; }
.secondary-btn { background: var(--dark-grey); color: var(--white); width: 100%; padding: 12px; }
.nav-button { flex: 1; background: var(--black); color: var(--white); padding: 15px; }
.finish-btn { flex: 1; background: var(--dark-red); color: var(--white); padding: 15px; }
.clear-btn { background: var(--red) !important; margin-bottom: 5px; }

/* История */
.history-card { 
    border: 1px solid var(--light-grey); padding: 15px; margin-bottom: 10px; 
    border-radius: 6px; cursor: pointer; text-align: left; 
}
.history-card:hover { background: #f0f0f0; }

/* Отчет */
.report-main-title { color: var(--red); border-bottom: 2px solid var(--red); padding-bottom: 10px; }
.report-meta { margin-bottom: 20px; font-size: 14px; }
.flex-row { display: flex; align-items: center; gap: 8px; margin: 5px 0; }
.box { border: 1px solid #000; width: 16px; height: 16px; text-align: center; line-height: 16px; font-size: 12px; font-weight: bold; }
.signature-section { margin-top: 30px; border-top: 1px solid #000; padding-top: 10px; }
canvas { border: 1px solid #000; background: #fff; width: 100%; height: 150px; }

@media (max-width: 480px) {
    .header-container { gap: 8px; }
    .logo { height: 30px; }
    header h1 { font-size: 1rem; }
}
