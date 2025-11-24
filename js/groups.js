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

        // Gruppenanzahl-Änderung
        const groupCount = document.getElementById('groupCount');
        if (groupCount) {
            groupCount.addEventListener('input', () => this.updateGroupSizeInfo());
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
            this.updateGroupSizeInfo();
        } else if (generator) {
            generator.style.display = 'none';
        }
    }

    updateGroupSizeInfo() {
        if (!this.currentClass) return;

        const students = Storage.getStudents(this.currentClass);
        const count = parseInt(document.getElementById('groupCount').value) || 0;
        const info = document.getElementById('groupSizeInfo');

        if (!info || count < 1) {
            if (info) info.textContent = '';
            return;
        }

        // Special case: count = 1 means "Reihenfolge"
        if (count === 1) {
            info.textContent = 'Reihenfolge';
            return;
        }

        const totalStudents = students.length;
        const baseSize = Math.floor(totalStudents / count);
        const remainder = totalStudents % count;

        if (remainder === 0) {
            info.textContent = `${count}x ${baseSize}er-Gruppe`;
        } else {
            const largerGroups = remainder;
            const smallerGroups = count - remainder;
            info.textContent = `${largerGroups}x ${baseSize + 1}er-Gruppe, ${smallerGroups}x ${baseSize}er-Gruppe`;
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

        const count = parseInt(document.getElementById('groupCount').value);
        if (!count || count < 1) {
            alert('Bitte gib eine gültige Gruppenanzahl ein');
            return;
        }

        // Special case: count = 1 means generate random sequence
        if (count === 1) {
            this.isSequenceMode = true;
            // Generate random sequence
            const shuffled = [...students].sort(() => Math.random() - 0.5);
            this.groups = [shuffled]; // Store as single group for compatibility
            this.displayGroups();
            return;
        }

        this.isSequenceMode = false;
        this.groups = this.generateByCount(students, count, restrictions);

        if (this.groups) {
            this.displayGroups();
        } else {
            // Try without restrictions
            this.groups = this.generateByCount(students, count, {});
            if (this.groups) {
                alert('Gruppeneinteilung erstellt, aber einige "Nie mit..."-Einschränkungen mussten ignoriert werden.');
                this.displayGroups();
            } else {
                alert('Keine Gruppeneinteilung möglich');
            }
        }
    }

    generateByCount(students, count, restrictions) {
        const totalStudents = students.length;
        const baseSize = Math.floor(totalStudents / count);
        const remainder = totalStudents % count;

        // Calculate target size for each group
        // First 'remainder' groups get baseSize+1, rest get baseSize
        const targetSizes = Array.from({ length: count }, (_, i) =>
            i < remainder ? baseSize + 1 : baseSize
        );

        // Try multiple times with different shuffles
        const maxGlobalAttempts = 100;

        for (let globalAttempt = 0; globalAttempt < maxGlobalAttempts; globalAttempt++) {
            // Shuffle students
            const shuffled = [...students].sort(() => Math.random() - 0.5);

            // Initialize groups
            const groups = Array.from({ length: count }, () => []);
            const assigned = new Set();

            let success = true;

            // Try to place each student
            for (const student of shuffled) {
                let placed = false;

                // Try each group in random order, but only if it hasn't reached target size
                const groupIndices = Array.from({ length: count }, (_, i) => i)
                    .filter(i => groups[i].length < targetSizes[i])
                    .sort(() => Math.random() - 0.5);

                for (const groupIndex of groupIndices) {
                    if (this.canPlaceInGroup(student, groups[groupIndex], restrictions)) {
                        groups[groupIndex].push(student);
                        assigned.add(student);
                        placed = true;
                        break;
                    }
                }

                if (!placed) {
                    success = false;
                    break;
                }
            }

            if (success) {
                return groups.filter(g => g.length > 0);
            }
        }

        // Couldn't find valid distribution
        return null;
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

        // Special display for sequence mode
        if (this.isSequenceMode && this.groups.length === 1) {
            const sequence = this.groups[0];
            const sequenceDiv = document.createElement('div');
            sequenceDiv.style.columnCount = '2';
            sequenceDiv.style.columnGap = '40px';
            sequenceDiv.style.marginTop = '20px';

            const list = document.createElement('ol');
            list.style.margin = '0';
            list.style.padding = '0 0 0 25px';

            sequence.forEach(student => {
                const li = document.createElement('li');
                li.textContent = student;
                li.style.marginBottom = '8px';
                list.appendChild(li);
            });

            sequenceDiv.appendChild(list);
            container.appendChild(sequenceDiv);

            display.style.display = 'block';
            exportBtn.style.display = 'inline-block';
            return;
        }

        // Normal group display
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

            let contentHTML = '<div style="padding: 20px; font-family: Arial, sans-serif;">';

            // Special handling for sequence mode
            if (this.isSequenceMode && this.groups.length === 1) {
                const sequence = this.groups[0];
                contentHTML += `<h1 style="text-align: center; margin-bottom: 30px;">Reihenfolge ${this.currentClass}</h1>`;
                contentHTML += '<div style="column-count: 2; column-gap: 40px;">';
                contentHTML += '<ol style="margin: 0; padding-left: 25px;">';

                sequence.forEach(student => {
                    contentHTML += `<li style="margin-bottom: 8px;">${this.escapeHtml(student)}</li>`;
                });

                contentHTML += '</ol></div></div>';
            } else {
                // Collect group titles from inputs
                const groupTitles = [];
                document.querySelectorAll('.group-title-input').forEach(input => {
                    groupTitles[parseInt(input.dataset.groupIndex)] = input.value;
                });

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
            }

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
