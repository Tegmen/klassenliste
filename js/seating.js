/**
 * Sitzordnungs-Generator
 */

class SeatingGenerator {
    constructor() {
        this.currentClass = null;
        this.seatingState = {
            title: 'Sitzordnung',
            grid: { cols: 7, rows: 7, desks: [], arrangement: [] },
            studentRestrictions: {} // studentName -> [restrictedNames]
        };
        this.currentStudentForRestriction = null;
        this.currentCellForPin = null;
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
        const classSelect = document.getElementById('seatingClassSelect');
        if (classSelect) {
            classSelect.addEventListener('change', (e) => {
                this.selectClass(e.target.value);
            });
        }

        // Grid-Einstellungen
        const applyGridBtn = document.getElementById('applyGridBtn');
        if (applyGridBtn) {
            applyGridBtn.addEventListener('click', () => this.applyGridSettings());
        }

        // Aktionen
        const generateBtn = document.getElementById('generateSeatingBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateSeatingChart());
        }

        const clearBtn = document.getElementById('clearSeatingBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAssignments(true));
        }

        const exportBtn = document.getElementById('exportSeatingBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToPDF());
        }

        // Titel
        const titleInput = document.getElementById('seatingTitle');
        if (titleInput) {
            titleInput.addEventListener('change', (e) => {
                this.seatingState.title = e.target.value;
                this.saveSeatingState();
            });
        }

        // Modals
        const saveRestrictionsBtn = document.getElementById('saveRestrictionsBtn');
        if (saveRestrictionsBtn) {
            saveRestrictionsBtn.addEventListener('click', () => this.saveRestrictions());
        }

        const cancelRestrictionsBtn = document.getElementById('cancelRestrictionsBtn');
        if (cancelRestrictionsBtn) {
            cancelRestrictionsBtn.addEventListener('click', () => this.closeRestrictionModal());
        }

        const savePinBtn = document.getElementById('savePinBtn');
        if (savePinBtn) {
            savePinBtn.addEventListener('click', () => this.savePin());
        }

        const unpinBtn = document.getElementById('unpinBtn');
        if (unpinBtn) {
            unpinBtn.addEventListener('click', () => this.unpinDesk());
        }

        const cancelPinBtn = document.getElementById('cancelPinBtn');
        if (cancelPinBtn) {
            cancelPinBtn.addEventListener('click', () => this.closePinModal());
        }
    }

    selectClass(className) {
        this.currentClass = className;
        const generator = document.getElementById('seatingGenerator');

        if (className && generator) {
            generator.style.display = 'block';

            // Titel aktualisieren
            const titleInput = document.getElementById('seatingTitle');
            if (titleInput) {
                titleInput.value = `Sitzordnung ${className}`;
                this.seatingState.title = titleInput.value;
            }

            // State laden oder initialisieren
            this.loadSeatingState();
            this.createGrid();
            this.renderStudentList();
        } else if (generator) {
            generator.style.display = 'none';
        }
    }

    loadSeatingState() {
        const savedState = localStorage.getItem(`seating_${this.currentClass}`);
        if (savedState) {
            this.seatingState = JSON.parse(savedState);
        } else {
            this.seatingState = {
                title: `Sitzordnung ${this.currentClass}`,
                grid: { cols: 7, rows: 7, desks: [], arrangement: [] },
                studentRestrictions: {}
            };
        }

        // Update UI
        const colsInput = document.getElementById('gridCols');
        const rowsInput = document.getElementById('gridRows');
        const titleInput = document.getElementById('seatingTitle');

        if (colsInput) colsInput.value = this.seatingState.grid.cols;
        if (rowsInput) rowsInput.value = this.seatingState.grid.rows;
        if (titleInput) titleInput.value = this.seatingState.title;
    }

    saveSeatingState() {
        // Arrangement aktualisieren
        this.seatingState.grid.arrangement = [];
        const gridContainer = document.getElementById('classroomGrid');
        if (gridContainer) {
            gridContainer.querySelectorAll('.grid-cell.occupied, .grid-cell.pinned').forEach(cell => {
                const studentName = cell.dataset.studentName;
                if (studentName) {
                    this.seatingState.grid.arrangement.push({
                        studentName: studentName,
                        cellIndex: parseInt(cell.dataset.index)
                    });
                }
            });
        }

        localStorage.setItem(`seating_${this.currentClass}`, JSON.stringify(this.seatingState));
    }

    renderStudentList() {
        const students = Storage.getStudents(this.currentClass);
        const list = document.getElementById('seatingStudentList');

        if (!list) return;

        list.innerHTML = '';

        students.forEach(student => {
            const li = document.createElement('li');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = student;
            li.appendChild(nameSpan);

            const lockBtn = document.createElement('button');
            lockBtn.textContent = '🔒';
            lockBtn.title = 'Sitz-Einschränkungen';
            lockBtn.addEventListener('click', () => this.openRestrictionModal(student));
            li.appendChild(lockBtn);

            list.appendChild(li);
        });
    }

    applyGridSettings() {
        const colsInput = document.getElementById('gridCols');
        const rowsInput = document.getElementById('gridRows');

        if (!colsInput || !rowsInput) return;

        const cols = parseInt(colsInput.value);
        const rows = parseInt(rowsInput.value);

        if (cols >= 3 && cols <= 15 && rows >= 3 && rows <= 15) {
            this.seatingState.grid.cols = cols;
            this.seatingState.grid.rows = rows;
            this.seatingState.grid.desks = [];
            this.seatingState.grid.arrangement = [];
            this.createGrid();
            this.saveSeatingState();
        }
    }

    createGrid() {
        const gridContainer = document.getElementById('classroomGrid');
        if (!gridContainer) return;

        gridContainer.innerHTML = '';
        gridContainer.style.gridTemplateColumns = `repeat(${this.seatingState.grid.cols}, 1fr)`;
        gridContainer.style.gridTemplateRows = `repeat(${this.seatingState.grid.rows}, auto)`;

        for (let i = 0; i < this.seatingState.grid.cols * this.seatingState.grid.rows; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.index = i;

            const nameSpan = document.createElement('div');
            nameSpan.className = 'cell-name';
            cell.appendChild(nameSpan);

            const pinIcon = document.createElement('div');
            pinIcon.className = 'pin-icon';
            pinIcon.textContent = '📌';
            pinIcon.title = 'Schüler fixieren / Pult sperren';
            pinIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                if (cell.classList.contains('desk')) this.openPinModal(cell);
            });
            cell.appendChild(pinIcon);

            const deskInfo = this.seatingState.grid.desks.find(d => d.index === i);
            if (deskInfo) {
                cell.classList.add('desk');
                if (deskInfo.pinnedStudent) {
                    cell.classList.add('pinned');
                    cell.dataset.studentName = deskInfo.pinnedStudent;
                    nameSpan.textContent = deskInfo.pinnedStudent;
                } else if (deskInfo.isLockedEmpty) {
                    cell.classList.add('locked-empty');
                    nameSpan.textContent = 'X';
                }
            }

            cell.addEventListener('click', () => {
                cell.classList.toggle('desk');
                this.updateDeskState(i, cell.classList.contains('desk'));
                if (!cell.classList.contains('desk')) {
                    cell.classList.remove('pinned', 'occupied', 'locked-empty');
                    nameSpan.textContent = '';
                    delete cell.dataset.studentName;
                }
                this.clearAssignments(false);
                this.saveSeatingState();
            });

            gridContainer.appendChild(cell);
        }

        this.restoreArrangement();
        this.updateAllFontSizes();
    }

    updateDeskState(index, isDesk) {
        const deskExists = this.seatingState.grid.desks.some(d => d.index === index);
        if (isDesk && !deskExists) {
            this.seatingState.grid.desks.push({ index: index });
        } else if (!isDesk && deskExists) {
            this.seatingState.grid.desks = this.seatingState.grid.desks.filter(d => d.index !== index);
        }
    }

    restoreArrangement() {
        if (!this.seatingState.grid.arrangement) return;

        const gridContainer = document.getElementById('classroomGrid');
        if (!gridContainer) return;

        this.seatingState.grid.arrangement.forEach(item => {
            const cell = gridContainer.querySelector(`.grid-cell[data-index='${item.cellIndex}']`);
            if (cell) {
                cell.dataset.studentName = item.studentName;
                const nameSpan = cell.querySelector('.cell-name');
                if (nameSpan) nameSpan.textContent = item.studentName;
                cell.classList.add('occupied');
                if (cell.classList.contains('pinned')) cell.classList.add('pinned');
            }
        });

        this.updateAllFontSizes();
    }

    clearAssignments(clearPinned = true) {
        const gridContainer = document.getElementById('classroomGrid');
        if (!gridContainer) return;

        gridContainer.querySelectorAll('.grid-cell.occupied').forEach(cell => {
            if (!cell.classList.contains('pinned') && !cell.classList.contains('locked-empty')) {
                cell.classList.remove('occupied');
                const nameSpan = cell.querySelector('.cell-name');
                if (nameSpan) {
                    nameSpan.textContent = '';
                    nameSpan.style.transform = 'scale(1)';
                }
                delete cell.dataset.studentName;
            }
        });

        if (clearPinned) {
            gridContainer.querySelectorAll('.grid-cell.pinned, .grid-cell.locked-empty').forEach(cell => {
                cell.classList.remove('pinned', 'occupied', 'locked-empty');
                const nameSpan = cell.querySelector('.cell-name');
                if (nameSpan) {
                    nameSpan.textContent = '';
                    nameSpan.style.transform = 'scale(1)';
                }
                delete cell.dataset.studentName;
                const deskInfo = this.seatingState.grid.desks.find(d => d.index === parseInt(cell.dataset.index));
                if (deskInfo) {
                    delete deskInfo.pinnedStudent;
                    delete deskInfo.isLockedEmpty;
                }
            });
        }

        const messageArea = document.getElementById('seatingMessage');
        if (messageArea) messageArea.textContent = '';

        this.saveSeatingState();
    }

    updateAllFontSizes() {
        const gridContainer = document.getElementById('classroomGrid');
        if (!gridContainer) return;

        gridContainer.querySelectorAll('.grid-cell').forEach(cell => {
            const nameSpan = cell.querySelector('.cell-name');
            if (!nameSpan || !nameSpan.textContent) {
                if (nameSpan) nameSpan.style.transform = 'scale(1)';
                return;
            }

            nameSpan.style.transform = 'scale(1)';

            const availableWidth = cell.clientWidth * 0.9;
            const availableHeight = cell.clientHeight * 0.9;

            const contentWidth = nameSpan.scrollWidth;
            const contentHeight = nameSpan.scrollHeight;

            if (contentWidth === 0 || contentHeight === 0) return;

            const scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
            nameSpan.style.transform = `scale(${scale})`;
        });
    }

    openRestrictionModal(studentName) {
        this.currentStudentForRestriction = studentName;
        const modal = document.getElementById('restrictionModal');
        const nameSpan = document.getElementById('restrictionStudentName');
        const listDiv = document.getElementById('restrictionList');

        if (!modal || !nameSpan || !listDiv) return;

        nameSpan.textContent = studentName;
        listDiv.innerHTML = '';

        const students = Storage.getStudents(this.currentClass);
        const currentRestrictions = this.seatingState.studentRestrictions[studentName] || [];

        students.filter(s => s !== studentName).forEach(otherStudent => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = otherStudent;
            checkbox.checked = currentRestrictions.includes(otherStudent);
            label.appendChild(checkbox);
            label.append(` ${otherStudent}`);
            listDiv.appendChild(label);
        });

        modal.classList.add('active');
    }

    closeRestrictionModal() {
        const modal = document.getElementById('restrictionModal');
        if (modal) modal.classList.remove('active');
    }

    saveRestrictions() {
        const listDiv = document.getElementById('restrictionList');
        if (!listDiv || !this.currentStudentForRestriction) return;

        const newRestrictions = Array.from(listDiv.querySelectorAll('input:checked'))
            .map(cb => cb.value);

        this.seatingState.studentRestrictions[this.currentStudentForRestriction] = newRestrictions;

        // Bidirektional: Wenn A nicht neben B sitzen will, will B auch nicht neben A sitzen
        const students = Storage.getStudents(this.currentClass);
        students.forEach(student => {
            if (student === this.currentStudentForRestriction) return;

            if (!this.seatingState.studentRestrictions[student]) {
                this.seatingState.studentRestrictions[student] = [];
            }

            const hasRestriction = newRestrictions.includes(student);
            const hasReverseRestriction = this.seatingState.studentRestrictions[student].includes(this.currentStudentForRestriction);

            if (hasRestriction && !hasReverseRestriction) {
                this.seatingState.studentRestrictions[student].push(this.currentStudentForRestriction);
            } else if (!hasRestriction && hasReverseRestriction) {
                this.seatingState.studentRestrictions[student] = this.seatingState.studentRestrictions[student]
                    .filter(name => name !== this.currentStudentForRestriction);
            }
        });

        this.closeRestrictionModal();
        this.saveSeatingState();
    }

    openPinModal(cell) {
        this.currentCellForPin = cell;
        const modal = document.getElementById('pinModal');
        const select = document.getElementById('pinStudentSelect');
        const unpinBtn = document.getElementById('unpinBtn');

        if (!modal || !select || !unpinBtn) return;

        select.innerHTML = '';
        select.innerHTML += '<option value="">-- Zufällig zuweisen --</option>';
        select.innerHTML += '<option value="empty">-- Pult leer lassen --</option>';

        const cellIndex = parseInt(cell.dataset.index);
        const deskInfo = this.seatingState.grid.desks.find(d => d.index === cellIndex);

        const pinnedStudents = this.seatingState.grid.desks
            .map(d => d.pinnedStudent)
            .filter(name => name);

        const students = Storage.getStudents(this.currentClass);
        students.forEach(student => {
            if (!pinnedStudents.includes(student) || (deskInfo && deskInfo.pinnedStudent === student)) {
                const option = document.createElement('option');
                option.value = student;
                option.textContent = student;
                select.appendChild(option);
            }
        });

        if (deskInfo && (deskInfo.pinnedStudent || deskInfo.isLockedEmpty)) {
            unpinBtn.style.display = 'inline-block';
            if (deskInfo.isLockedEmpty) {
                select.value = 'empty';
            } else {
                select.value = deskInfo.pinnedStudent || '';
            }
        } else {
            unpinBtn.style.display = 'none';
            select.value = '';
        }

        modal.classList.add('active');
    }

    closePinModal() {
        const modal = document.getElementById('pinModal');
        if (modal) modal.classList.remove('active');
    }

    savePin() {
        this.clearAssignments(false);

        const select = document.getElementById('pinStudentSelect');
        if (!select || !this.currentCellForPin) return;

        const selectedValue = select.value;
        const cellIndex = parseInt(this.currentCellForPin.dataset.index);

        const currentDesk = this.seatingState.grid.desks.find(d => d.index === cellIndex);
        if (!currentDesk) return;

        // Entferne vorherige Pins dieses Schülers
        if (selectedValue && selectedValue !== 'empty') {
            this.seatingState.grid.desks.forEach(desk => {
                if (desk.pinnedStudent === selectedValue && desk.index !== cellIndex) {
                    delete desk.pinnedStudent;
                }
            });
        }

        delete currentDesk.pinnedStudent;
        delete currentDesk.isLockedEmpty;

        if (selectedValue === 'empty') {
            currentDesk.isLockedEmpty = true;
        } else if (selectedValue) {
            currentDesk.pinnedStudent = selectedValue;
        }

        this.closePinModal();
        this.createGrid();
        this.saveSeatingState();
    }

    unpinDesk() {
        if (!this.currentCellForPin) return;

        const cellIndex = parseInt(this.currentCellForPin.dataset.index);
        const deskInfo = this.seatingState.grid.desks.find(d => d.index === cellIndex);

        if (deskInfo) {
            delete deskInfo.pinnedStudent;
            delete deskInfo.isLockedEmpty;
        }

        this.closePinModal();
        this.createGrid();
        this.saveSeatingState();
    }

    generateSeatingChart() {
        this.clearAssignments(false);

        const gridContainer = document.getElementById('classroomGrid');
        const messageArea = document.getElementById('seatingMessage');
        if (!gridContainer || !messageArea) return;

        const allDeskIndexes = this.seatingState.grid.desks.map(d => d.index);
        const pinnedOrLockedDesks = this.seatingState.grid.desks.filter(d => d.pinnedStudent || d.isLockedEmpty);
        const pinnedStudents = pinnedOrLockedDesks.map(d => d.pinnedStudent).filter(name => name);

        const availableDeskIndexes = allDeskIndexes.filter(index =>
            !pinnedOrLockedDesks.some(d => d.index === index)
        );

        const students = Storage.getStudents(this.currentClass);
        const unassignedStudents = students.filter(s => !pinnedStudents.includes(s));

        if (unassignedStudents.length > availableDeskIndexes.length) {
            messageArea.textContent = `Fehler: ${unassignedStudents.length} freie Schüler, aber nur ${availableDeskIndexes.length} freie Pulte.`;
            messageArea.style.color = 'var(--danger-color)';
            return;
        }

        const shuffledStudents = [...unassignedStudents].sort(() => Math.random() - 0.5);
        const shuffledDesks = availableDeskIndexes
            .map(index => gridContainer.children[index])
            .sort(() => Math.random() - 0.5);

        const solution = this.solve(shuffledStudents, shuffledDesks);

        if (solution) {
            solution.forEach(assignment => {
                const { student, desk } = assignment;
                desk.classList.add('occupied');
                desk.querySelector('.cell-name').textContent = student;
                desk.dataset.studentName = student;
            });
            messageArea.textContent = 'Sitzordnung erfolgreich generiert!';
            messageArea.style.color = 'var(--primary-color)';
        } else {
            messageArea.textContent = 'Keine gültige Sitzordnung mit diesen Einschränkungen gefunden!';
            messageArea.style.color = 'var(--danger-color)';
        }

        this.updateAllFontSizes();
        this.saveSeatingState();
    }

    solve(studentsToPlace, desksToFill) {
        const assignments = [];

        const findSolution = (studentIndex) => {
            if (studentIndex >= studentsToPlace.length) return true;

            const student = studentsToPlace[studentIndex];

            for (let i = 0; i < desksToFill.length; i++) {
                const desk = desksToFill[i];

                if (assignments.some(a => a.desk === desk)) continue;

                if (this.isValidPlacement(student, desk, assignments)) {
                    assignments.push({ student, desk });

                    if (findSolution(studentIndex + 1)) return true;

                    assignments.pop();
                }
            }

            return false;
        };

        if (findSolution(0)) return assignments;
        return null;
    }

    isValidPlacement(student, desk, currentAssignments) {
        const deskIndex = parseInt(desk.dataset.index);
        const { cols, rows } = this.seatingState.grid;

        const neighborIndices = [];
        if (deskIndex % cols !== 0) neighborIndices.push(deskIndex - 1);
        if (deskIndex % cols !== cols - 1) neighborIndices.push(deskIndex + 1);
        if (deskIndex >= cols) neighborIndices.push(deskIndex - cols);
        if (deskIndex < (rows - 1) * cols) neighborIndices.push(deskIndex + cols);

        const studentRestrictions = this.seatingState.studentRestrictions[student] || [];

        for (const neighborIndex of neighborIndices) {
            const gridContainer = document.getElementById('classroomGrid');
            if (!gridContainer) continue;

            const neighborCell = gridContainer.children[neighborIndex];
            if (!neighborCell) continue;

            // Check pinned desks
            const pinnedDeskInfo = this.seatingState.grid.desks.find(
                d => d.index === neighborIndex && d.pinnedStudent
            );
            if (pinnedDeskInfo && studentRestrictions.includes(pinnedDeskInfo.pinnedStudent)) {
                return false;
            }

            // Check currently assigned neighbors
            const assignedNeighbor = currentAssignments.find(
                a => parseInt(a.desk.dataset.index) === neighborIndex
            );
            if (assignedNeighbor && studentRestrictions.includes(assignedNeighbor.student)) {
                return false;
            }
        }

        return true;
    }

    async exportToPDF() {
        const { jsPDF } = window.jspdf;
        const gridElement = document.getElementById('classroomGrid');

        if (!gridElement) return;

        try {
            const canvas = await html2canvas(gridElement, {
                scale: 3,
                useCORS: true,
                onclone: (document) => {
                    const clonedGrid = document.getElementById('classroomGrid');
                    if (clonedGrid) {
                        clonedGrid.querySelectorAll('.grid-cell').forEach(cell => {
                            cell.style.color = 'black';
                            if (cell.classList.contains('desk')) {
                                cell.style.backgroundColor = '#cccccc';
                            }
                            if (cell.classList.contains('locked-empty')) {
                                const nameEl = cell.querySelector('.cell-name');
                                if (nameEl) nameEl.textContent = 'X';
                            }
                            const pin = cell.querySelector('.pin-icon');
                            if (pin) pin.style.display = 'none';
                        });
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const margin = 10;
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const usableWidth = pdfWidth - (margin * 2);
            const usableHeight = pdfHeight - (margin * 2);

            const title = this.seatingState.title;
            const date = new Date().toLocaleDateString('de-CH', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            pdf.setFontSize(16);
            pdf.text(title, margin, margin + 2);
            pdf.setFontSize(10);
            pdf.text(date, pdfWidth - margin, margin + 2, { align: 'right' });

            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const canvasAspectRatio = canvasWidth / canvasHeight;

            const imageStartY = margin + 10;
            const imageUsableHeight = pdfHeight - imageStartY - margin;

            let finalWidth, finalHeight;
            const imageUsableAspectRatio = usableWidth / imageUsableHeight;

            if (canvasAspectRatio > imageUsableAspectRatio) {
                finalWidth = usableWidth;
                finalHeight = usableWidth / canvasAspectRatio;
            } else {
                finalHeight = imageUsableHeight;
                finalWidth = imageUsableHeight * canvasAspectRatio;
            }

            const x = margin + (usableWidth - finalWidth) / 2;
            const y = imageStartY + (imageUsableHeight - finalHeight) / 2;

            pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
            pdf.save(`${title.replace(/ /g, '_')}.pdf`);
        } catch (error) {
            console.error('PDF Export Fehler:', error);
            alert('Fehler beim PDF-Export');
        }
    }
}

// Initialisiere Sitzordnungs-Generator
const seatingGenerator = new SeatingGenerator();

// ResizeObserver für responsive Schriftgröße
window.addEventListener('load', () => {
    const gridContainer = document.getElementById('classroomGrid');
    if (gridContainer) {
        new ResizeObserver(() => {
            if (seatingGenerator) {
                seatingGenerator.updateAllFontSizes();
            }
        }).observe(gridContainer);
    }
});
