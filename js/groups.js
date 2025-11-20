/**
 * Gruppen-Generator
 */

class GroupsGenerator {
    constructor() {
        this.currentClass = null;
        this.groups = [];
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
        const classSelect = document.getElementById('groupsClassSelect');
        if (classSelect) {
            classSelect.addEventListener('change', (e) => {
                this.selectClass(e.target.value);
            });
        }

        // Modus-Wechsel
        const groupMode = document.getElementById('groupMode');
        if (groupMode) {
            groupMode.addEventListener('change', () => this.toggleMode());
        }

        // Generieren
        const generateBtn = document.getElementById('generateGroupsBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateGroups());
        }

        // PDF Export
        const exportBtn = document.getElementById('exportGroupsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToPDF());
        }
    }

    selectClass(className) {
        this.currentClass = className;
        const generator = document.getElementById('groupsGenerator');

        if (className && generator) {
            generator.style.display = 'block';
        } else if (generator) {
            generator.style.display = 'none';
        }
    }

    toggleMode() {
        const mode = document.getElementById('groupMode').value;
        const countMode = document.getElementById('countMode');
        const sizeMode = document.getElementById('sizeMode');

        if (mode === 'count') {
            countMode.style.display = 'block';
            sizeMode.style.display = 'none';
        } else {
            countMode.style.display = 'none';
            sizeMode.style.display = 'block';
        }
    }

    generateGroups() {
        if (!this.currentClass) {
            alert('Bitte wähle zuerst eine Klasse aus');
            return;
        }

        const students = Storage.getStudents(this.currentClass);
        const restrictions = Storage.getRestrictions(this.currentClass);

        if (students.length === 0) {
            alert('Die Klasse hat keine Schüler');
            return;
        }

        const mode = document.getElementById('groupMode').value;

        if (mode === 'count') {
            const count = parseInt(document.getElementById('groupCount').value);
            if (!count || count < 1) {
                alert('Bitte gib eine gültige Gruppenanzahl ein');
                return;
            }
            this.groups = this.generateByCount(students, count, restrictions);
        } else {
            const size = parseInt(document.getElementById('groupSize').value);
            if (!size || size < 1) {
                alert('Bitte gib eine gültige Gruppengrösse ein');
                return;
            }
            const sizeMode = document.getElementById('groupSizeMode').value;
            this.groups = this.generateBySize(students, size, sizeMode, restrictions);
        }

        if (this.groups) {
            this.displayGroups();
        } else {
            alert('Keine gültige Gruppeneinteilung möglich mit den aktuellen Einschränkungen');
        }
    }

    generateByCount(students, count, restrictions) {
        // Shuffle students
        const shuffled = [...students].sort(() => Math.random() - 0.5);

        // Initialize groups
        const groups = Array.from({ length: count }, () => []);

        // Try to distribute students
        const assigned = new Set();
        const maxAttempts = 1000;
        let attempts = 0;

        for (const student of shuffled) {
            if (assigned.has(student)) continue;

            let placed = false;
            attempts = 0;

            while (!placed && attempts < maxAttempts) {
                // Try each group in random order
                const groupIndices = Array.from({ length: count }, (_, i) => i)
                    .sort(() => Math.random() - 0.5);

                for (const groupIndex of groupIndices) {
                    if (this.canPlaceInGroup(student, groups[groupIndex], restrictions)) {
                        groups[groupIndex].push(student);
                        assigned.add(student);
                        placed = true;
                        break;
                    }
                }

                attempts++;
            }

            if (!placed) {
                // Couldn't place student - return null
                return null;
            }
        }

        return groups.filter(g => g.length > 0);
    }

    generateBySize(students, targetSize, sizeMode, restrictions) {
        const totalStudents = students.length;
        let groupCount = Math.floor(totalStudents / targetSize);
        let remainder = totalStudents % targetSize;

        if (remainder > 0) {
            if (sizeMode === 'larger') {
                // Keep same group count, distribute remainder
            } else {
                // Create additional smaller group
                groupCount++;
            }
        }

        // Use count-based generation with calculated group count
        return this.generateByCount(students, groupCount, restrictions);
    }

    canPlaceInGroup(student, group, restrictions) {
        const studentRestrictions = restrictions[student] || [];

        for (const groupMember of group) {
            if (studentRestrictions.includes(groupMember)) {
                return false;
            }
        }

        return true;
    }

    displayGroups() {
        const display = document.getElementById('groupsDisplay');
        const container = document.getElementById('groupsContainer');
        const exportBtn = document.getElementById('exportGroupsBtn');

        if (!display || !container) return;

        container.innerHTML = '';

        this.groups.forEach((group, index) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'group-card';

            const titleInput = document.createElement('input');
            titleInput.type = 'text';
            titleInput.className = 'group-title-input';
            titleInput.value = `Gruppe ${index + 1}`;
            titleInput.dataset.groupIndex = index;

            const membersList = document.createElement('ul');
            membersList.className = 'group-members';

            group.forEach(member => {
                const li = document.createElement('li');
                li.textContent = member;
                membersList.appendChild(li);
            });

            groupDiv.appendChild(titleInput);
            groupDiv.appendChild(membersList);
            container.appendChild(groupDiv);
        });

        display.style.display = 'block';
        exportBtn.style.display = 'inline-block';
    }

    async exportToPDF() {
        if (!this.groups || this.groups.length === 0) {
            alert('Keine Gruppen zum Exportieren vorhanden');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;

            // Collect group titles from inputs
            const groupTitles = [];
            document.querySelectorAll('.group-title-input').forEach(input => {
                groupTitles[parseInt(input.dataset.groupIndex)] = input.value;
            });

            // Build PDF content
            let contentHTML = '<div style="padding: 20px; font-family: Arial, sans-serif;">';
            contentHTML += `<h1 style="text-align: center; margin-bottom: 30px;">Gruppen ${this.currentClass}</h1>`;
            contentHTML += '<div style="column-count: 2; column-gap: 40px;">';

            this.groups.forEach((group, index) => {
                contentHTML += '<div style="break-inside: avoid; margin-bottom: 20px;">';
                contentHTML += `<h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid #4CAF50;">${this.escapeHtml(groupTitles[index] || `Gruppe ${index + 1}`)}</h2>`;
                contentHTML += '<ul style="list-style: none; padding-left: 0;">';

                group.forEach(member => {
                    contentHTML += `<li style="padding: 5px 0; border-bottom: 1px solid #eee;">${this.escapeHtml(member)}</li>`;
                });

                contentHTML += '</ul></div>';
            });

            contentHTML += '</div></div>';

            // Render to hidden area
            const renderArea = document.getElementById('groups-pdf-content');
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

            pdf.save(`Gruppen_${this.currentClass}.pdf`);

        } catch (error) {
            console.error('PDF-Export Fehler:', error);
            alert('Fehler beim PDF-Export');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialisiere Gruppen-Generator
const groupsGenerator = new GroupsGenerator();
