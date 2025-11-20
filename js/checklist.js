/**
 * Checklisten-Generator
 */

class ChecklistGenerator {
    constructor() {
        this.currentClass = null;
        this.weekPickers = [];
        this.init();
    }

    init() {
        // Warte bis DOM geladen ist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.weekPickers = [
            document.getElementById('week-1'),
            document.getElementById('week-2'),
            document.getElementById('week-3'),
            document.getElementById('week-4')
        ];

        this.setupEventListeners();
        this.initializeWeeks();
    }

    setupEventListeners() {
        // Klassenauswahl
        const classSelect = document.getElementById('checklistClassSelect');
        if (classSelect) {
            classSelect.addEventListener('change', (e) => {
                this.selectClass(e.target.value);
            });
        }

        // Listentyp Änderung
        const listType = document.getElementById('checklistType');
        if (listType) {
            listType.addEventListener('change', () => this.toggleDateFields());
        }

        // PDF Generieren
        const generateBtn = document.getElementById('generateChecklistBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generatePdf());
        }

        // Wochen-Picker
        this.weekPickers.forEach((picker, index) => {
            if (picker && index < 3) {
                picker.addEventListener('change', () => this.updateFollowingWeeks(index + 1));
            }
        });
    }

    selectClass(className) {
        this.currentClass = className;
        const generator = document.getElementById('checklistGenerator');

        if (className && generator) {
            generator.style.display = 'block';

            // Update Titel
            const titleInput = document.getElementById('checklistTitle');
            if (titleInput) {
                titleInput.value = `Versäumnisse ${className}`;
            }
        } else if (generator) {
            generator.style.display = 'none';
        }
    }

    toggleDateFields() {
        const listType = document.getElementById('checklistType');
        const weekFields = document.getElementById('weekFields');

        if (listType && weekFields) {
            weekFields.style.display = listType.value === 'wochentage' ? 'block' : 'none';
        }
    }

    initializeWeeks() {
        if (this.weekPickers[0]) {
            this.weekPickers[0].valueAsDate = new Date();
            this.updateFollowingWeeks(1);
        }
    }

    updateFollowingWeeks(startIndex) {
        if (!this.weekPickers[startIndex - 1]) return;

        let baseDate = new Date(this.weekPickers[startIndex - 1].value);
        if (isNaN(baseDate.getTime())) return;

        for (let i = startIndex; i < this.weekPickers.length; i++) {
            if (this.weekPickers[i]) {
                baseDate.setDate(baseDate.getDate() + 7);
                this.weekPickers[i].valueAsDate = new Date(baseDate);
            }
        }
    }

    getMondayOfFirstWeek(dateString) {
        let date = new Date(dateString);
        const dayOfWeek = date.getDay();
        const difference = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        date.setDate(date.getDate() + difference);
        return date;
    }

    formatDateForFilename(date) {
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async generatePdf() {
        if (!this.currentClass) {
            alert('Bitte wähle zuerst eine Klasse aus');
            return;
        }

        const generateBtn = document.getElementById('generateChecklistBtn');
        if (!generateBtn) return;

        generateBtn.textContent = 'Generiere PDF...';
        generateBtn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            const listType = document.getElementById('checklistType').value;
            const title = document.getElementById('checklistTitle').value;

            // Schüler aus Storage holen
            let students = Storage.getStudents(this.currentClass);
            students.sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

            let headers = [];
            let lastColumnHeader = '';
            let weekSeparators = false;
            let tableClass = '';
            let filenameDate = this.formatDateForFilename(new Date());

            if (listType === 'wochentage') {
                lastColumnHeader = document.getElementById('lastColumnHeader').value;
                weekSeparators = true;
                const weekStartInputs = this.weekPickers.map(picker => picker.value);

                if (weekStartInputs.some(date => !date)) {
                    alert('Bitte für alle vier Wochen ein Datum auswählen.');
                    generateBtn.textContent = 'PDF erstellen';
                    generateBtn.disabled = false;
                    return;
                }

                const weekDays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                weekStartInputs.forEach(startDateInput => {
                    let currentDate = this.getMondayOfFirstWeek(startDateInput);
                    for (let day = 0; day < 5; day++) {
                        headers.push(`${weekDays[currentDate.getDay()]} ${currentDate.getDate()}.${currentDate.getMonth() + 1}.`);
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                });

                const firstMonday = this.getMondayOfFirstWeek(weekStartInputs[0]);
                filenameDate = this.formatDateForFilename(firstMonday);
            } else {
                tableClass = 'empty-list';
                for (let i = 0; i < 20; i++) headers.push('');
            }

            const nameColumnSeparator = weekSeparators ? 'week-separator' : '';
            let contentHTML = `<h2>${title}</h2><table class="${tableClass}"><thead><tr><th class="${nameColumnSeparator}"></th>`;

            headers.forEach((header, index) => {
                const sepClass = weekSeparators && (index + 1) % 5 === 0 ? 'week-separator' : '';
                contentHTML += `<th class="date-header ${sepClass}"><span>${header}</span></th>`;
            });

            contentHTML += `<th>${lastColumnHeader}</th></tr></thead><tbody>`;

            students.forEach(student => {
                contentHTML += `<tr><td class="${nameColumnSeparator}">${this.escapeHtml(student)}</td>`;
                for (let i = 0; i < 20; i++) {
                    const sepClass = weekSeparators && (i + 1) % 5 === 0 ? 'week-separator' : '';
                    contentHTML += `<td class="${sepClass}"></td>`;
                }
                contentHTML += `<td></td></tr>`;
            });

            contentHTML += '</tbody></table>';

            const pdfContentEl = document.getElementById('pdf-content');
            if (!pdfContentEl) {
                throw new Error('PDF Content Element nicht gefunden');
            }
            pdfContentEl.innerHTML = contentHTML;

            const canvas = await html2canvas(pdfContentEl, { scale: 2, useCORS: true });
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

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
            const y = margin + (effectiveHeight - imgHeight) / 2;

            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

            const filename = `${title.replace(/ /g, '_')}_${filenameDate}.pdf`;
            pdf.save(filename);

        } catch (error) {
            console.error('Fehler bei der PDF-Erstellung:', error);
            alert('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
        } finally {
            generateBtn.textContent = 'PDF erstellen';
            generateBtn.disabled = false;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialisiere Checklisten-Generator
const checklistGenerator = new ChecklistGenerator();
