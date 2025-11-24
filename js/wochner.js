/**
 * Wochner-Generator
 */

class WochnerGenerator {
    constructor() {
        this.currentClass = null;
        this.selectedWeeks = [];
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Klassenauswahl
        const classSelect = document.getElementById('wochnerClassSelect');
        if (classSelect) {
            classSelect.addEventListener('change', (e) => {
                this.selectClass(e.target.value);
            });
        }

        // PDF Generieren
        const generateBtn = document.getElementById('generateWochnerBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generatePDF());
        }
    }

    selectClass(className) {
        this.currentClass = className;
        const generator = document.getElementById('wochnerGenerator');

        if (className && generator) {
            generator.style.display = 'block';

            // Titel aktualisieren
            const titleInput = document.getElementById('wochnerTitle');
            if (titleInput) {
                titleInput.value = `Wochner ${className}`;
            }

            // Wochen generieren
            this.generateWeekSelection();
        } else if (generator) {
            generator.style.display = 'none';
        }
    }

    generateWeekSelection() {
        const container = document.getElementById('weekSelection');
        if (!container) return;

        container.innerHTML = '';

        const today = new Date();
        const currentMonday = this.getMonday(today);

        // Generate 50 weeks
        for (let i = 0; i < 50; i++) {
            const weekDate = new Date(currentMonday);
            weekDate.setDate(currentMonday.getDate() + (i * 7));

            if (i % 4 === 0) {
                // Start new row
                const row = document.createElement('div');
                row.className = 'week-row';
                container.appendChild(row);
            }

            const weekCheckbox = document.createElement('label');
            weekCheckbox.className = 'week-checkbox';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = weekDate.toISOString();
            checkbox.addEventListener('change', () => this.updateSelectedWeeks());

            const dateStr = this.formatDate(weekDate);

            weekCheckbox.appendChild(checkbox);
            weekCheckbox.append(` ${dateStr}`);

            const lastRow = container.lastElementChild;
            lastRow.appendChild(weekCheckbox);
        }
    }

    getMonday(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    formatDate(date) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${day}.${month}.${year}`;
    }

    updateSelectedWeeks() {
        const checkboxes = document.querySelectorAll('#weekSelection input[type="checkbox"]:checked');
        this.selectedWeeks = Array.from(checkboxes).map(cb => new Date(cb.value));
    }

    async generatePDF() {
        if (!this.currentClass) {
            alert('Bitte wähle zuerst eine Klasse aus');
            return;
        }

        this.updateSelectedWeeks();

        if (this.selectedWeeks.length === 0) {
            alert('Bitte wähle mindestens eine Woche aus');
            return;
        }

        const students = Storage.getStudents(this.currentClass);
        const restrictions = Storage.getRestrictions(this.currentClass);

        if (students.length < 2) {
            alert('Die Klasse muss mindestens 2 Schüler haben');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const title = document.getElementById('wochnerTitle').value;

            // Assign students to weeks
            const assignments = this.assignWochner(students, restrictions);

            if (!assignments) {
                alert('Keine gültige Zuteilung möglich mit den aktuellen Einschränkungen');
                return;
            }

            // Build PDF content
            let contentHTML = '<div style="padding: 20px; font-family: Arial, sans-serif;">';
            contentHTML += `<h1 style="text-align: center; margin-bottom: 30px;">${this.escapeHtml(title)}</h1>`;
            contentHTML += '<div style="column-count: 2; column-gap: 40px;">';

            assignments.forEach((assignment, index) => {
                const dateStr = this.formatDate(assignment.week);
                contentHTML += '<div style="break-inside: avoid; margin-bottom: 15px; padding: 10px; border-bottom: 1px solid #ddd;">';
                contentHTML += `<div style="font-weight: bold; margin-bottom: 5px;">${dateStr}</div>`;
                contentHTML += `<div>${this.escapeHtml(assignment.students[0])}, ${this.escapeHtml(assignment.students[1])}</div>`;
                contentHTML += '</div>';
            });

            contentHTML += '</div></div>';

            // Render to hidden area
            const renderArea = document.getElementById('wochner-pdf-content');
            if (!renderArea) {
                throw new Error('PDF Content Element nicht gefunden');
            }
            renderArea.innerHTML = contentHTML;

            const canvas = await html2canvas(renderArea, { scale: 2, useCORS: true });
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const margin = 10;
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const effectiveWidth = pageWidth - 2 * margin;
            const effectiveHeight = pageHeight - 2 * margin;

            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const canvasRatio = canvasWidth / canvasHeight;

            let imgWidth = effectiveWidth;
            let imgHeight = imgWidth / canvasRatio;

            if (imgHeight > effectiveHeight) {
                imgHeight = effectiveHeight;
                imgWidth = imgHeight * canvasRatio;
            }

            const x = margin + (effectiveWidth - imgWidth) / 2;
            const y = margin;

            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

            pdf.save(`${title.replace(/ /g, '_')}.pdf`);

        } catch (error) {
            console.error('PDF-Export Fehler:', error);
            alert('Fehler beim PDF-Export');
        }
    }

    assignWochner(students, restrictions) {
        const assignments = [];
        const studentCounts = {};
        students.forEach(s => studentCounts[s] = 0);

        // Sort weeks chronologically
        const sortedWeeks = [...this.selectedWeeks].sort((a, b) => a - b);

        // Track last assigned week for each student
        const lastAssigned = {};

        for (const week of sortedWeeks) {
            let assigned = false;
            let attempts = 0;
            const maxAttempts = 1000;

            while (!assigned && attempts < maxAttempts) {
                // Group students by assignment count
                const studentsByCount = {};
                students.forEach(s => {
                    const count = studentCounts[s];
                    if (!studentsByCount[count]) studentsByCount[count] = [];
                    studentsByCount[count].push(s);
                });

                // Get counts sorted (least assigned first)
                const counts = Object.keys(studentsByCount).map(Number).sort((a, b) => a - b);

                // Build candidate list with some randomization
                const candidates = [];
                for (const count of counts) {
                    // Shuffle students within same count group
                    const studentsInGroup = [...studentsByCount[count]].sort(() => Math.random() - 0.5);
                    candidates.push(...studentsInGroup);
                }

                // Try random pairs from candidates (prioritizing those with fewer assignments)
                // But add randomness by not always taking the first two
                const numCandidates = Math.min(10, candidates.length);
                const candidateSubset = candidates.slice(0, numCandidates).sort(() => Math.random() - 0.5);

                // Try to find two compatible students
                for (let i = 0; i < candidateSubset.length; i++) {
                    for (let j = i + 1; j < candidateSubset.length; j++) {
                        const s1 = candidateSubset[i];
                        const s2 = candidateSubset[j];

                        // Check restrictions
                        const s1Restrictions = restrictions[s1] || [];
                        const s2Restrictions = restrictions[s2] || [];

                        if (!s1Restrictions.includes(s2) && !s2Restrictions.includes(s1)) {
                            // Valid pair
                            assignments.push({
                                week: week,
                                students: [s1, s2]
                            });
                            studentCounts[s1]++;
                            studentCounts[s2]++;
                            lastAssigned[s1] = week;
                            lastAssigned[s2] = week;
                            assigned = true;
                            break;
                        }
                    }
                    if (assigned) break;
                }

                attempts++;
            }

            if (!assigned) {
                return null; // Could not find valid assignment
            }
        }

        return assignments;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialisiere Wochner-Generator
const wochnerGenerator = new WochnerGenerator();
