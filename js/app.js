// --- Estado Global ---
let timers = [];
let newTimerConfig = {
    mode: 'timer',
    label: '',
    hours: 0,
    minutes: 5,
    seconds: 0
};
let activeAlarms = {}; // Map: timerId -> intervalId
let timerToResetId = null;
let timerToEditId = null; 

// --- Drag & Drop State ---
let draggedItem = null;

// --- Audio Context ---
const soundPresets = {
    'classic': (ctx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); 
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.5); 
        gainNode.gain.setValueAtTime(0.8, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
        osc.start();
        osc.stop(ctx.currentTime + 1);
    },
    'digital': (ctx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    },
    'soft': (ctx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 2);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.5);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
        osc.start();
        osc.stop(ctx.currentTime + 2);
    },
    'arcade': (ctx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    },
    'alarm': (ctx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(0, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.3);

        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime + 0.2);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    },
    'siren': (ctx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1000, ctx.currentTime + 0.5);
        osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 1.0);
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 1.0);
        
        osc.start();
        osc.stop(ctx.currentTime + 1.0);
    },
    'industrial': (ctx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        
        const lfo = ctx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = 50;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 500;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
        
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
        lfo.stop(ctx.currentTime + 1.5);
    }
};

function playAlarmSound(type = 'classic') {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const generator = soundPresets[type] || soundPresets['classic'];
    generator(ctx);
}

function playLapSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
}

function previewSelectedSound() {
    const sound = document.getElementById('input-sound').value;
    playAlarmSound(sound);
}

// --- Utilidades ---
function formatTime(ms, showMs = false) {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);

    let timeStr = '';
    if (h > 0) {
        timeStr = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
        timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    if (showMs) {
        return `${timeStr}<span class="text-xl text-slate-500">.${milliseconds.toString().padStart(2, '0')}</span>`;
    }
    return timeStr;
}

function formatLapTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

function getProgress(timer) {
    if (timer.mode === 'stopwatch') return 100;
    if (timer.duration === 0) return 0;
    return (timer.currentTime / timer.duration) * 100;
}

// --- Lógica del Ciclo de Vida ---
function updateTimers() {
    const now = Date.now();
    let shouldReRender = false;

    timers.forEach(timer => {
        if (timer.isRunning && !timer.isFinished) {
            const delta = now - timer.lastTick;
            timer.lastTick = now;

            if (timer.mode === 'timer') {
                timer.currentTime -= delta;
                if (timer.currentTime <= 0) {
                    timer.currentTime = 0;
                    if (!timer.isFinished) {
                        timer.isFinished = true;
                        timer.isRunning = false;
                        shouldReRender = true;
                        startAlarmForTimer(timer.id);
                    }
                }
            } else {
                timer.currentTime += delta;
            }
        }
    });
    
    if (shouldReRender) {
        renderTimers();
    } else {
        updateTimeDisplays();
    }
    
    requestAnimationFrame(updateTimers);
}

function updateTimeDisplays() {
    timers.forEach(timer => {
        if (timer.isRunning || timer.mode === 'stopwatch') {
            const displayEl = document.getElementById(`display-${timer.id}`);
            const progressEl = document.getElementById(`progress-${timer.id}`);
            
            if (displayEl) {
                displayEl.innerHTML = formatTime(timer.currentTime, timer.mode === 'stopwatch');
            }
            if (progressEl) {
                 const progress = getProgress(timer);
                 progressEl.style.width = `${progress}%`;
                 if (timer.mode === 'timer') {
                     if (progress < 20) {
                         progressEl.classList.remove('bg-emerald-500');
                         progressEl.classList.add('bg-rose-500');
                     }
                 }
            }
        }
    });
}

// --- Gestión de Alarmas Individuales ---
function startAlarmForTimer(id) {
    const timer = timers.find(t => t.id === id);
    if (!timer) return;
    
    const soundType = timer.sound || 'classic';
    
    // Play sound immediately
    playAlarmSound(soundType);
    
    // Set interval for this specific timer
    if (activeAlarms[id]) clearInterval(activeAlarms[id]);
    
    activeAlarms[id] = setInterval(() => {
        playAlarmSound(soundType);
    }, 1500); // Repetir cada 1.5s
}

function stopAlarmForTimer(id) {
    if (activeAlarms[id]) {
        clearInterval(activeAlarms[id]);
        delete activeAlarms[id];
    }
}

// --- Drag & Drop Handlers ---
function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
    this.classList.add('dragging');
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    this.classList.remove('drag-over');
    
    const sourceId = parseInt(e.dataTransfer.getData('text/plain'));
    const targetId = parseInt(this.dataset.id);
    
    if (sourceId !== targetId) {
        const sourceIndex = timers.findIndex(t => t.id === sourceId);
        const targetIndex = timers.findIndex(t => t.id === targetId);
        
        if (sourceIndex > -1 && targetIndex > -1) {
            // Swap logic
            const temp = timers[sourceIndex];
            timers.splice(sourceIndex, 1);
            timers.splice(targetIndex, 0, temp);
            
            renderTimers();
        }
    }
    
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    // Clean up all drag-over classes
    const items = document.querySelectorAll('.timer-card');
    items.forEach(item => item.classList.remove('drag-over'));
}


// --- Gestión de UI ---
function renderTimers() {
    // Actualizar Contador y Botón "Nuevo"
    const countEl = document.getElementById('timer-count');
    const newBtn = document.getElementById('btn-new-timer');
    const count = timers.length;
    
    if (countEl) countEl.innerText = `${count}/5`;
    
    if (newBtn) {
        if (count >= 5) {
            newBtn.setAttribute('disabled', 'true');
            newBtn.classList.add('opacity-50', 'cursor-not-allowed');
            newBtn.title = "Límite máximo de 5 elementos alcanzado";
        } else {
            newBtn.removeAttribute('disabled');
            newBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            newBtn.title = "Crear un nuevo temporizador o cronómetro";
        }
    }

    const container = document.getElementById('timers-grid');
    
    if (timers.length === 0) {
        // Remover layout de Grid para mostrar mensaje centrado correctamente
        container.className = 'max-w-6xl mx-auto gap-6 space-y-6 flex justify-center';
        
        container.innerHTML = `
            <div class="w-full text-center py-20 opacity-50 border-2 border-dashed border-slate-700 rounded-2xl">
                <i data-lucide="watch" class="mx-auto mb-4 w-12 h-12 text-slate-500"></i>
                <p class="text-xl">No hay cronómetros activos</p>
                <p class="text-sm mt-2">Crea uno nuevo para empezar a cocinar o trabajar.</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    // Restaurar layout de Grid (Dashboard Style)
    container.className = 'max-w-6xl mx-auto gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 grid-flow-row-dense auto-rows-max';

    container.innerHTML = timers.map(timer => {
        const isStopwatch = timer.mode === 'stopwatch';
        const progress = getProgress(timer);
        
        // --- Estilos Base ---
        let cardBg = isStopwatch ? 'bg-slate-900 border-cyan-900/50' : 'bg-slate-800 border-slate-700';
        let ringClass = '';
        let alarmEffects = '';
        
        // --- Estado Alarma (Visual Fire Effect) ---
        if (timer.isFinished) {
            cardBg = 'bg-slate-900 border-rose-500';
            ringClass = 'ring-2 ring-rose-500';
            // Efecto de "fuego" / resplandor intenso
            alarmEffects = 'shadow-[0_0_40px_rgba(244,63,94,0.6)] animate-pulse';
        }

        const progressColor = isStopwatch ? 'bg-cyan-500' : (progress < 20 ? 'bg-rose-500' : 'bg-emerald-500');
        
        // Grid Layout Logic: Cronómetro ocupa 2 filas (row-span-2)
        const gridClass = isStopwatch ? 'row-span-2 flex flex-col' : 'flex flex-col';
        
        const tagClass = isStopwatch 
            ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-800' 
            : 'bg-indigo-900 text-indigo-200';
        
        const playBtnClass = timer.isRunning 
            ? 'bg-amber-500 hover:bg-amber-600' 
            : (isStopwatch ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-emerald-500 hover:bg-emerald-600');
        
        const playIcon = timer.isRunning ? 'pause' : 'play';
        const textColor = timer.isRunning ? 'text-white' : 'text-slate-400';
        
        // --- Reducción de Tamaños (15-20%) ---
        const displayFont = isStopwatch ? 'font-mono text-cyan-50' : 'font-mono text-white';
        const displayTextSize = 'text-4xl'; 
        const labelSize = 'text-base'; 
        const iconSize = 'w-5 h-5';
        const controlBtnSize = 'p-3'; 
        const paddingClass = 'p-5'; 

        return `
        <div draggable="true" data-id="${timer.id}" class="timer-card relative overflow-hidden rounded-2xl ${cardBg} border shadow-xl transition-all hover:shadow-2xl ${ringClass} ${gridClass} ${alarmEffects}">
            <!-- Barra de Progreso -->
            <div class="h-1.5 w-full bg-slate-950 shrink-0">
                <div id="progress-${timer.id}" class="h-full transition-all duration-100 ease-linear ${progressColor}" style="width: ${progress}%"></div>
            </div>

            <div class="${paddingClass} flex-1 flex flex-col">
                <div class="flex justify-between items-start mb-3 shrink-0">
                    <div>
                        <h3 class="${labelSize} font-semibold text-slate-200 cursor-move" title="Arrastra para reordenar">${timer.label}</h3>
                        <span class="text-[10px] px-1.5 py-0.5 rounded-full ${tagClass}">
                            ${isStopwatch ? '⏱ Cronómetro' : '⏳ Timer'}
                        </span>
                    </div>
                    
                    <div class="flex items-center">
                        ${!isStopwatch && !timer.isRunning && !timer.isFinished && timer.currentTime === timer.duration ? `
                        <button onclick="editTimer(${timer.id})" class="text-slate-500 hover:text-indigo-400 transition-colors p-1 mr-1" title="Editar">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        ` : ''}
                        <button onclick="deleteTimer(${timer.id})" class="text-slate-500 hover:text-rose-400 transition-colors p-1" title="Eliminar">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>

                <!-- Display -->
                <div id="display-${timer.id}" class="${displayTextSize} ${displayFont} font-bold tracking-wider text-center py-4 ${textColor}">
                    ${timer.isFinished ? `<span class="text-rose-500 animate-bounce">00:00</span>` : formatTime(timer.currentTime, isStopwatch)}
                </div>
                
                ${timer.isFinished ? `
                    <div class="text-center text-rose-300 text-xs font-bold uppercase tracking-widest mb-4 animate-pulse">¡Tiempo Terminado!</div>
                ` : ''}

                <!-- Laps Area (Stopwatch Only) -->
                ${isStopwatch ? `
                <div class="bg-slate-950 rounded-lg mb-4 flex-1 flex flex-col border border-slate-800 overflow-hidden min-h-[140px]">
                     <!-- Header Fijo -->
                     <div class="bg-slate-950 p-2 border-b border-slate-800 z-10 shadow-sm shrink-0">
                        <div class="flex justify-between text-[10px] text-slate-500 uppercase font-mono px-2">
                            <span class="w-6">#</span>
                            <span class="flex-1 text-right">Vuelta</span>
                            <span class="flex-1 text-right">Total</span>
                        </div>
                     </div>
                     <!-- Body con Scroll -->
                     <div class="overflow-y-auto flex-1 scrollbar-hide p-2 relative bg-slate-950/50">
                        ${timer.laps && timer.laps.length > 0 ? `
                            <div class="space-y-1">
                                ${timer.laps.slice().reverse().map((lap, i) => `
                                <div class="flex justify-between text-[11px] font-mono px-2 py-1 hover:bg-white/5 rounded border-b border-slate-800/30 last:border-0 text-slate-300 transition-colors">
                                    <span class="w-6 text-slate-500 font-bold">${timer.laps.length - i}</span>
                                    <span class="flex-1 text-right text-cyan-400 font-medium">${formatLapTime(lap.split)}</span>
                                    <span class="flex-1 text-right font-medium">${formatLapTime(lap.total)}</span>
                                </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-60">
                                <i data-lucide="flag" class="w-6 h-6"></i>
                                <span class="text-xs">No hay vueltas registradas</span>
                            </div>
                        `}
                    </div>
                </div>
                ` : `<div class="flex-1"></div>`}

                <!-- Controles -->
                <div class="flex justify-center gap-3 mt-auto shrink-0 pt-2 border-t border-slate-800/50">
                    
                    ${timer.isFinished ? `
                        <!-- Controles de Alarma Activa -->
                         <button onclick="resetTimer(${timer.id})" class="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium flex items-center justify-center gap-2 text-white transition-colors">
                            <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Reiniciar
                        </button>
                        
                        <button onclick="addMinuteToTimer(${timer.id})" class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
                            <i data-lucide="plus" class="w-4 h-4"></i> 1 Min
                        </button>
                    
                    ` : `
                        <!-- Controles Normales -->
                        <button onclick="toggleTimer(${timer.id})" class="${controlBtnSize} rounded-full shadow-lg transition-transform active:scale-95 text-slate-900 ${playBtnClass}" title="${timer.isRunning ? 'Pausar' : 'Iniciar'}">
                            <i data-lucide="${playIcon}" class="${iconSize} fill-current"></i>
                        </button>
                        
                        ${isStopwatch ? `
                        <button onclick="recordLap(${timer.id})" class="${controlBtnSize} rounded-full bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" ${!timer.isRunning ? 'disabled' : ''} title="Registrar Vuelta">
                            <i data-lucide="flag" class="${iconSize}"></i>
                        </button>
                        ` : ''}

                        <button onclick="initiateReset(${timer.id})" class="${controlBtnSize} rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors" title="Reiniciar">
                            <i data-lucide="rotate-ccw" class="${iconSize}"></i>
                        </button>
                    `}
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Attach Drag & Drop Events
    const draggables = document.querySelectorAll('.timer-card');
    draggables.forEach(item => {
        item.addEventListener('dragstart', handleDragStart, false);
        item.addEventListener('dragenter', handleDragEnter, false);
        item.addEventListener('dragover', handleDragOver, false);
        item.addEventListener('dragleave', handleDragLeave, false);
        item.addEventListener('drop', handleDrop, false);
        item.addEventListener('dragend', handleDragEnd, false);
    });

    lucide.createIcons();
}

// --- Acciones de Usuario ---
function toggleTimer(id) {
    const t = timers.find(x => x.id === id);
    if (t) {
        if (!t.isRunning) {
            t.lastTick = Date.now();
        }
        t.isRunning = !t.isRunning;
        renderTimers();
    }
}

function recordLap(id) {
    const t = timers.find(x => x.id === id);
    if (t && t.mode === 'stopwatch') {
        const totalTime = t.currentTime;
        const lastLapTotal = t.laps.length > 0 ? t.laps[t.laps.length - 1].total : 0;
        const splitTime = totalTime - lastLapTotal;

        t.laps.push({
            id: Date.now(),
            total: totalTime,
            split: splitTime
        });
        
        playLapSound();
        renderTimers();
    }
}

// --- Manejo de Reset Seguro ---
function initiateReset(id) {
    timerToResetId = id;
    document.getElementById('reset-modal').classList.remove('hidden');
}

function closeResetModal() {
    document.getElementById('reset-modal').classList.add('hidden');
    timerToResetId = null;
}

function confirmReset() {
    if (timerToResetId) {
        resetTimer(timerToResetId);
    }
    closeResetModal();
}

function resetTimer(id) {
    const t = timers.find(x => x.id === id);
    if (t) {
        t.currentTime = t.mode === 'timer' ? t.duration : 0;
        t.isRunning = false;
        t.isFinished = false;
        t.laps = [];
        
        // Stop specific alarm
        stopAlarmForTimer(id);
        
        renderTimers();
    }
}

function addMinuteToTimer(id) {
    const t = timers.find(x => x.id === id);
    if (t) {
        t.currentTime += 60000;
        // Opcional: ¿aumentar duración original? Por ahora solo añadimos tiempo extra.
        // t.duration += 60000; 
        t.isFinished = false;
        t.isRunning = true;
        t.lastTick = Date.now();
        
        stopAlarmForTimer(id);
        renderTimers();
    }
}

function deleteTimer(id) {
    stopAlarmForTimer(id);
    timers = timers.filter(x => x.id !== id);
    renderTimers();
}

// --- Lógica del Modal Add/Edit ---
function openAddModal() {
    timerToEditId = null;
    document.getElementById('modal-title').innerText = "Nuevo Cronómetro";
    document.getElementById('btn-save-timer').innerText = "Comenzar";
    
    document.getElementById('add-modal').classList.remove('hidden');
    // Reset fields
    document.getElementById('input-label').value = '';
    document.getElementById('input-sound').value = 'classic';
    document.getElementById('input-h').value = 0;
    document.getElementById('input-m').value = 5;
    document.getElementById('input-s').value = 0;
    
    // Unlock mode buttons
    document.getElementById('btn-mode-timer').disabled = false;
    document.getElementById('btn-mode-stopwatch').disabled = false;
    
    // Update counts in buttons
    const timerCount = timers.filter(t => t.mode === 'timer').length;
    const stopwatchCount = timers.filter(t => t.mode === 'stopwatch').length;

    const btnTimer = document.getElementById('btn-mode-timer');
    const btnStopwatch = document.getElementById('btn-mode-stopwatch');

    btnTimer.innerText = `Cuenta Regresiva (${timerCount})`;
    btnStopwatch.innerText = `Cronómetro (${stopwatchCount})`;

    // Check if stopwatch limit reached (1 max)
    if (stopwatchCount >= 1) {
        btnStopwatch.disabled = true;
        btnStopwatch.title = "Ya tienes un cronómetro activo (Máximo 1)";
        setMode('timer'); // Force Timer mode
    } else {
        btnStopwatch.disabled = false;
        btnStopwatch.title = "Modo Cronómetro";
        setMode('timer'); // Default to Timer
    }
}

function editTimer(id) {
    const t = timers.find(x => x.id === id);
    if (!t || t.mode !== 'timer') return; // Safety check
    
    timerToEditId = id;
    document.getElementById('modal-title').innerText = "Editar Temporizador";
    document.getElementById('btn-save-timer').innerText = "Guardar Cambios";
    document.getElementById('add-modal').classList.remove('hidden');
    
    // Populate fields
    document.getElementById('input-label').value = t.label;
    document.getElementById('input-sound').value = t.sound || 'classic';
    
    const totalSeconds = Math.floor(t.duration / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    document.getElementById('input-h').value = h;
    document.getElementById('input-m').value = m;
    document.getElementById('input-s').value = s;
    
    // Lock mode buttons (cannot change type while editing)
    setMode('timer');
    document.getElementById('btn-mode-timer').disabled = true;
    document.getElementById('btn-mode-stopwatch').disabled = true;
}

function closeAddModal() {
    document.getElementById('add-modal').classList.add('hidden');
}

function setMode(mode) {
    newTimerConfig.mode = mode;
    const btnTimer = document.getElementById('btn-mode-timer');
    const btnStop = document.getElementById('btn-mode-stopwatch');
    const durInputs = document.getElementById('duration-inputs');
    const soundConfig = document.getElementById('sound-config-container');

    if (mode === 'timer') {
        btnTimer.className = "flex-1 py-2 rounded-md text-sm font-medium transition-colors bg-indigo-600 text-white shadow";
        btnStop.className = "flex-1 py-2 rounded-md text-sm font-medium transition-colors text-slate-400 hover:text-slate-200";
        durInputs.style.display = 'block';
        soundConfig.style.display = 'block';
    } else {
        btnStop.className = "flex-1 py-2 rounded-md text-sm font-medium transition-colors bg-cyan-600 text-slate-900 shadow";
        btnTimer.className = "flex-1 py-2 rounded-md text-sm font-medium transition-colors text-slate-400 hover:text-slate-200";
        durInputs.style.display = 'none';
        soundConfig.style.display = 'none';
    }
}

function setPreset(min) {
    document.getElementById('input-h').value = 0;
    document.getElementById('input-m').value = min;
    document.getElementById('input-s').value = 0;
}

function saveTimer() {
    const label = document.getElementById('input-label').value;
    const sound = document.getElementById('input-sound').value;
    const h = parseInt(document.getElementById('input-h').value) || 0;
    const m = parseInt(document.getElementById('input-m').value) || 0;
    const s = parseInt(document.getElementById('input-s').value) || 0;
    
    const totalSeconds = (h * 3600) + (m * 60) + s;
    const durationMs = totalSeconds * 1000;

    // Edit Existing Timer
    if (timerToEditId) {
        const t = timers.find(x => x.id === timerToEditId);
        if (t) {
            t.label = label || 'Temporizador';
            t.sound = sound;
            t.duration = durationMs;
            t.currentTime = durationMs; // Reset time to new duration
            t.isFinished = false; // Reset finished state
            stopAlarmForTimer(t.id); // Stop alarm if it was ringing
        }
    } 
    // Create New Timer
    else {
        const mode = newTimerConfig.mode;
        
        // --- Validaciones de Reglas ---
        const currentStopwatches = timers.filter(t => t.mode === 'stopwatch').length;
        const totalTimers = timers.length;

        if (totalTimers >= 5) return; 
        if (mode === 'stopwatch' && currentStopwatches >= 1) return;
        // -----------------------------

        const initialTime = mode === 'timer' ? durationMs : 0;
        const finalLabel = label || (mode === 'timer' ? 'Temporizador' : 'Cronómetro');

        timers.push({
            id: Date.now(),
            label: finalLabel,
            mode: mode,
            sound: mode === 'stopwatch' ? null : sound, 
            duration: durationMs,
            currentTime: initialTime,
            lastTick: Date.now(),
            isRunning: false,
            isFinished: false,
            laps: [] 
        });
    }

    closeAddModal();
    renderTimers();
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(updateTimers);
    renderTimers();
    lucide.createIcons();
});
