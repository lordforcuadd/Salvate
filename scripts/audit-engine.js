import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('════════════════════════════════════════════════════════════════');
console.log(' 🔍 SÁLVATE PWA — MOTOR DE AUDITORÍA Y CALIDAD CONTINUA');
console.log('════════════════════════════════════════════════════════════════\n');

const auditResults = {
  timestamp: new Date().toISOString(),
  inspectedFiles: 0,
  issues: [],
  warnings: [],
  optimizations: [],
  summary: {
    criticalBugs: 0,
    technicalDebt: 0,
    uiUxIssues: 0,
    memoryLeaks: 0,
    bestPracticeViolations: 0
  }
};

// 1. Get changed files from Git if available, or scan entire src/
function getTargetFiles() {
  const srcDir = path.join(rootDir, 'src');
  const allFiles = [];

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (/\.(vue|js|css|html)$/.test(entry.name)) {
        allFiles.push(fullPath);
      }
    }
  }

  scan(srcDir);
  return allFiles;
}

// 2. Audit Rules Engine
function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  auditResults.inspectedFiles++;

  const lines = content.split('\n');

  // Rule A: Memory Leaks (AudioContext, Timers, MediaStream tracks, Event Listeners)
  if (content.includes('AudioContext') && !content.includes('.close()')) {
    auditResults.issues.push({
      file: relPath,
      type: 'Memory Leak / Resource',
      category: 'memoryLeaks',
      message: 'Se inicializa AudioContext sin llamada explícita a .close() en onBeforeUnmount / onUnmounted.'
    });
    auditResults.summary.memoryLeaks++;
  }

  if ((content.includes('setInterval') || content.includes('setTimeout')) && 
      !content.includes('clearInterval') && !content.includes('clearTimeout')) {
    // Check if it's a short one-off timeout
    if (!content.includes('setTimeout(() =>') || content.includes('setInterval')) {
      auditResults.warnings.push({
        file: relPath,
        type: 'Potential Timer Leak',
        category: 'technicalDebt',
        message: 'Se utiliza setInterval/setTimeout sin almacenamiento de handle o limpieza al desmontar.'
      });
      auditResults.summary.technicalDebt++;
    }
  }

  if (content.includes('getUserMedia') && !content.includes('.stop()')) {
    auditResults.issues.push({
      file: relPath,
      type: 'Hardware Stream Leak',
      category: 'memoryLeaks',
      message: 'Se solicita acceso a cámara/micrófono sin detener las pistas (track.stop()) al finalizar o desmontar.'
    });
    auditResults.summary.memoryLeaks++;
  }

  if (content.includes('addEventListener') && !content.includes('removeEventListener') && !content.includes('_initialized') && !content.includes('_listenersRegistered')) {
    auditResults.warnings.push({
      file: relPath,
      type: 'Event Listener Leak',
      category: 'memoryLeaks',
      message: 'Se añade event listener global en window/document sin removerlo en onUnmounted ni contar con guard de inicialización singleton.'
    });
    auditResults.summary.memoryLeaks++;
  }

  // Rule B: UI/UX & Tactical Palette Consistency
  if (filePath.endsWith('.vue')) {
    // Check for deprecated sky- classes (User requested elimination of blue palette)
    const skyMatches = content.match(/\b(bg-sky-\d+|text-sky-\d+|border-sky-\d+)\b/g);
    if (skyMatches && skyMatches.length > 0) {
      auditResults.warnings.push({
        file: relPath,
        type: 'UI/UX Design Consistency',
        category: 'uiUxIssues',
        message: `Se detectaron ${skyMatches.length} clases de color azul/celeste obsoletas (${skyMatches.slice(0, 3).join(', ')}). Debe usarse la paleta táctica Black & Emerald.`
      });
      auditResults.summary.uiUxIssues++;
    }

    // Check for invalid non-standard decimal Tailwind classes (e.g. w-4.5, h-4.5, p-4.5)
    const invalidDecimalMatches = content.match(/\b(w|h|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y)-[4-9]\.5\b/g);
    if (invalidDecimalMatches && invalidDecimalMatches.length > 0) {
      auditResults.issues.push({
        file: relPath,
        type: 'Invalid Tailwind Sizing Scale',
        category: 'uiUxIssues',
        message: `Se detectaron clases de espaciado inválidas de Tailwind (${[...new Set(invalidDecimalMatches)].join(', ')}). La escala salta de 3.5 a 4 a 5. Usa w-4 h-4 o valores arbitrarios w-[18px].`
      });
      auditResults.summary.uiUxIssues++;
    }

    // Check for flex items with truncate but missing min-w-0 on parent
    lines.forEach((line, idx) => {
      if (line.includes('truncate') && line.includes('flex-1') && !line.includes('min-w-0')) {
        auditResults.warnings.push({
          file: `${relPath}:${idx + 1}`,
          type: 'UI/UX Mobile Text Overflow',
          category: 'uiUxIssues',
          message: 'Elemento flex con texto truncado sin clase `min-w-0`, lo que puede causar desbordamiento en pantallas móviles pequeñas.'
        });
        auditResults.summary.uiUxIssues++;
      }
    });

    // Check for interactive buttons without cursor-pointer or touch feedback
    lines.forEach((line, idx) => {
      if (line.includes('<button') && !line.includes('cursor-pointer') && !line.includes('touch-btn')) {
        auditResults.optimizations.push({
          file: `${relPath}:${idx + 1}`,
          type: 'Ergonomía Táctil Móvil',
          category: 'uiUxIssues',
          message: 'Botón sin clase de feedback táctil (`active:scale-95` o `cursor-pointer`).'
        });
      }
    });
  }

  // Rule C: Vue 3 / JS Best Practices
  if (filePath.endsWith('.vue')) {
    // Missing key in v-for
    lines.forEach((line, idx) => {
      if (line.includes('v-for=') && !line.includes(':key=') && !content.includes(':key=')) {
        auditResults.issues.push({
          file: `${relPath}:${idx + 1}`,
          type: 'Vue Best Practice',
          category: 'bestPracticeViolations',
          message: 'Directiva v-for sin :key único especificado.'
        });
        auditResults.summary.bestPracticeViolations++;
      }
    });
  }

  // Rule D: WebRTC / IndexedDB Resilience
  if (filePath.includes('meshStore.js') || filePath.includes('indexedDB.js')) {
    if (content.includes('indexedDB.open') && !content.includes('onerror')) {
      auditResults.warnings.push({
        file: relPath,
        type: 'Offline Storage Resilience',
        category: 'technicalDebt',
        message: 'Apertura de IndexedDB sin manejador global de error para modo incógnito estricto.'
      });
      auditResults.summary.technicalDebt++;
    }
  }
}

// 3. Run Build Validation
function runBuildTest() {
  console.log('📦 Ejecutando verificación de compilación (Vite build)...');
  try {
    const buildOutput = execSync('npm run build', { cwd: rootDir, stdio: 'pipe' }).toString();
    console.log('✅ Compilación de producción exitosa sin errores de bundle.\n');
  } catch (err) {
    console.error('❌ Error de compilación detectado durante la auditoría:');
    console.error(err.message);
    auditResults.issues.push({
      file: 'vite.config.js / bundle',
      type: 'Build Error',
      category: 'criticalBugs',
      message: 'Fallo al ejecutar `npm run build`: ' + err.message
    });
    auditResults.summary.criticalBugs++;
  }
}

// Execute Audit
const files = getTargetFiles();
console.log(`🔎 Analizando ${files.length} archivos en src/...`);
files.forEach(auditFile);
runBuildTest();

// 4. Print Summary Report
console.log('════════════════════════════════════════════════════════════════');
console.log(' 📊 REPORTE FINAL DE AUDITORÍA');
console.log('════════════════════════════════════════════════════════════════');
console.log(`📁 Archivos analizados: ${auditResults.inspectedFiles}`);
console.log(`🚨 Fallos críticos:     ${auditResults.summary.criticalBugs}`);
console.log(`⚠️  Alertas técnicas:   ${auditResults.warnings.length}`);
console.log(`🧹 Deuda técnica:       ${auditResults.summary.technicalDebt}`);
console.log(`📱 UI/UX & Responsive:  ${auditResults.summary.uiUxIssues}`);
console.log(`💡 Optimizaciones:      ${auditResults.optimizations.length}`);
console.log('────────────────────────────────────────────────────────────────');

if (auditResults.issues.length > 0) {
  console.log('\n❌ FALLOS Y PROBLEMAS DETECTADOS:');
  auditResults.issues.forEach(i => console.log(`  • [${i.type}] ${i.file} → ${i.message}`));
}

if (auditResults.warnings.length > 0) {
  console.log('\n⚠️ ADVERTENCIAS Y DEUDA TÉCNICA:');
  auditResults.warnings.forEach(w => console.log(`  • [${w.type}] ${w.file} → ${w.message}`));
}

if (auditResults.optimizations.length > 0) {
  console.log('\n💡 OPORTUNIDADES DE MEJORA Y OPTIMIZACIÓN:');
  auditResults.optimizations.slice(0, 5).forEach(o => console.log(`  • [${o.type}] ${o.file} → ${o.message}`));
  if (auditResults.optimizations.length > 5) {
    console.log(`    ... y ${auditResults.optimizations.length - 5} sugerencias ergonómicas adicionales.`);
  }
}

// 5. Save report to JSON for CI/CD and recursive skill learning
const auditReportPath = path.join(rootDir, 'AUDIT_REPORT.json');
fs.writeFileSync(auditReportPath, JSON.stringify(auditResults, null, 2));
console.log(`\n📄 Reporte persistido en: ${path.relative(rootDir, auditReportPath)}`);
console.log('════════════════════════════════════════════════════════════════\n');

process.exit(auditResults.summary.criticalBugs > 0 ? 1 : 0);
