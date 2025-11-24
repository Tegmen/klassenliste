/**
 * Hauptanwendung für Klassenliste PWA
 */

class KlassenlisteApp {
    constructor() {
        this.currentClass = null;
        this.modalMode = null;
        this.currentStudent = null;

        this.init();
    }

    /**
     * Initialisiert die Anwendung
     */
    init() {
        // Wait for DOM if not ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.loadClassSelectors();
                this.registerServiceWorker();
                this.setupPWAInstall();
            });
        } else {
            this.setupEventListeners();
            this.loadClassSelectors();
            this.registerServiceWorker();
            this.setupPWAInstall();
        }
    }

    /**
     * Event Listener einrichten
     */
    setupEventListeners() {
        // Tab Navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Klassen-Verwaltung
        document.getElementById('classSelect').addEventListener('change', (e) => {
            this.selectClass(e.target.value);
        });

        document.getElementById('addClassBtn').addEventListener('click', () => {
            this.openClassModal('add');
        });

        document.getElementById('renameClassBtn').addEventListener('click', () => {
            this.openClassModal('rename');
        });

        document.getElementById('deleteClassBtn').addEventListener('click', () => {
            this.deleteClass();
        });

        // Class Modal
        document.getElementById('saveClassBtn').addEventListener('click', () => {
            this.saveClass();
        });

        document.getElementById('cancelClassBtn').addEventListener('click', () => {
            this.closeClassModal();
        });

        document.getElementById('classNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveClass();
        });

        // Schüler hinzufügen (einzeln)
        document.getElementById('addSingleStudentBtn').addEventListener('click', () => {
            this.addSingleStudent();
        });

        document.getElementById('singleStudentInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSingleStudent();
        });

        // Schüler hinzufügen (mehrere)
        document.getElementById('addMultiStudentBtn').addEventListener('click', () => {
            this.addMultipleStudents();
        });

        // Student Modal
        document.getElementById('saveStudentBtn').addEventListener('click', () => {
            this.saveStudent();
        });

        document.getElementById('cancelStudentBtn').addEventListener('click', () => {
            this.closeStudentModal();
        });

        document.getElementById('studentNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveStudent();
        });

        // Restriction Modal
        const saveRestrictionsBtn = document.getElementById('saveRestrictionsBtn');
        if (saveRestrictionsBtn) {
            saveRestrictionsBtn.addEventListener('click', () => {
                this.saveRestrictions();
            });
        }

        const cancelRestrictionsBtn = document.getElementById('cancelRestrictionsBtn');
        if (cancelRestrictionsBtn) {
            cancelRestrictionsBtn.addEventListener('click', () => {
                this.closeRestrictionModal();
            });
        }
    }

    /**
     * Tab wechseln
     */
    switchTab(tabName) {
        // Tab-Buttons aktualisieren
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Tab-Inhalte aktualisieren
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    /**
     * Lädt alle Klassen in die Dropdowns
     */
    loadClassSelectors() {
        const classes = Storage.getClasses();
        const selectors = [
            document.getElementById('classSelect'),
            document.getElementById('groupsClassSelect'),
            document.getElementById('checklistClassSelect'),
            document.getElementById('seatingClassSelect'),
            document.getElementById('wochnerClassSelect')
        ];

        // Clear and populate each selector
        selectors.forEach(selector => {
            if (!selector) return;
            selector.innerHTML = '<option value="">-- Klasse auswählen --</option>';
            Object.keys(classes).sort().forEach(className => {
                selector.add(new Option(className, className));
            });
        });
    }

    /**
     * Klasse auswählen
     */
    selectClass(className) {
        this.currentClass = className;

        const studentSection = document.getElementById('studentSection');
        const renameBtn = document.getElementById('renameClassBtn');
        const deleteBtn = document.getElementById('deleteClassBtn');

        if (className) {
            studentSection.style.display = 'block';
            renameBtn.disabled = false;
            deleteBtn.disabled = false;

            document.getElementById('currentClassName').textContent = className;
            this.loadStudents();
        } else {
            studentSection.style.display = 'none';
            renameBtn.disabled = true;
            deleteBtn.disabled = true;
        }
    }

    /**
     * Lädt die Schüler der aktuellen Klasse
     */
    loadStudents() {
        const students = Storage.getStudents(this.currentClass);
        const studentsList = document.getElementById('studentsList');
        const studentCount = document.getElementById('studentCount');

        studentCount.textContent = students.length;

        if (students.length === 0) {
            studentsList.innerHTML = '<li class="empty-state">Noch keine Schüler in dieser Klasse</li>';
            return;
        }

        studentsList.innerHTML = students.map(student => `
            <li>
                <span class="student-name">${this.escapeHtml(student)}</span>
                <div class="student-actions">
                    <button class="btn btn-secondary btn-small" onclick="app.openRestrictionModal('${this.escapeHtml(student)}')">
                        Nie mit...
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="app.openStudentModal('${this.escapeHtml(student)}')">
                        Umbenennen
                    </button>
                    <button class="btn btn-danger btn-small" onclick="app.deleteStudent('${this.escapeHtml(student)}')">
                        Löschen
                    </button>
                </div>
            </li>
        `).join('');
    }

    /**
     * Modal für Klasse öffnen
     */
    openClassModal(mode) {
        this.modalMode = mode;
        const modal = document.getElementById('classModal');
        const input = document.getElementById('classNameInput');
        const title = document.getElementById('modalTitle');

        if (mode === 'add') {
            title.textContent = 'Neue Klasse erstellen';
            input.value = '';
        } else if (mode === 'rename') {
            title.textContent = 'Klasse umbenennen';
            input.value = this.currentClass;
        }

        modal.classList.add('active');
        input.focus();
    }

    /**
     * Modal für Klasse schließen
     */
    closeClassModal() {
        document.getElementById('classModal').classList.remove('active');
    }

    /**
     * Klasse speichern
     */
    saveClass() {
        const input = document.getElementById('classNameInput');
        const className = input.value.trim();

        if (!className) {
            alert('Bitte geben Sie einen Klassennamen ein');
            return;
        }

        let result;

        if (this.modalMode === 'add') {
            result = Storage.addClass(className);
        } else if (this.modalMode === 'rename') {
            result = Storage.renameClass(this.currentClass, className);
        }

        if (result.success) {
            this.loadClassSelectors();

            if (this.modalMode === 'rename') {
                this.currentClass = className;
                document.getElementById('classSelect').value = className;
                this.selectClass(className);
            }

            this.closeClassModal();
        } else {
            alert(result.message);
        }
    }

    /**
     * Klasse löschen
     */
    deleteClass() {
        if (!this.currentClass) return;

        if (confirm(`Möchten Sie die Klasse "${this.currentClass}" wirklich löschen?`)) {
            const result = Storage.deleteClass(this.currentClass);

            if (result.success) {
                this.currentClass = null;
                this.loadClassSelectors();
                document.getElementById('classSelect').value = '';
                this.selectClass('');
            } else {
                alert(result.message);
            }
        }
    }

    /**
     * Einzelnen Schüler hinzufügen
     */
    addSingleStudent() {
        const input = document.getElementById('singleStudentInput');
        const studentName = input.value.trim();

        if (!studentName) {
            alert('Bitte geben Sie einen Namen ein');
            return;
        }

        const result = Storage.addStudent(this.currentClass, studentName);

        if (result.success) {
            input.value = '';
            this.loadStudents();
        } else {
            alert(result.message);
        }
    }

    /**
     * Mehrere Schüler hinzufügen
     */
    addMultipleStudents() {
        const input = document.getElementById('multiStudentInput');
        const text = input.value.trim();

        if (!text) {
            alert('Bitte geben Sie mindestens einen Namen ein');
            return;
        }

        const names = text.split('\n').map(n => n.trim()).filter(n => n);
        const result = Storage.addMultipleStudents(this.currentClass, names);

        if (result.success) {
            input.value = '';
            this.loadStudents();
            alert(result.message);
        } else {
            alert(result.message);
        }
    }

    /**
     * Modal für Schüler öffnen
     */
    openStudentModal(studentName) {
        this.currentStudent = studentName;
        const modal = document.getElementById('studentModal');
        const input = document.getElementById('studentNameInput');

        input.value = studentName;
        modal.classList.add('active');
        input.focus();
    }

    /**
     * Modal für Schüler schließen
     */
    closeStudentModal() {
        document.getElementById('studentModal').classList.remove('active');
    }

    /**
     * Schüler umbenennen
     */
    saveStudent() {
        const input = document.getElementById('studentNameInput');
        const newName = input.value.trim();

        if (!newName) {
            alert('Bitte geben Sie einen Namen ein');
            return;
        }

        const result = Storage.renameStudent(this.currentClass, this.currentStudent, newName);

        if (result.success) {
            this.loadStudents();
            this.closeStudentModal();
        } else {
            alert(result.message);
        }
    }

    /**
     * Schüler löschen
     */
    deleteStudent(studentName) {
        if (confirm(`Möchten Sie "${studentName}" wirklich löschen?`)) {
            const result = Storage.deleteStudent(this.currentClass, studentName);

            if (result.success) {
                this.loadStudents();
            } else {
                alert(result.message);
            }
        }
    }

    /**
     * Öffnet das Einschränkungs-Modal ("Nie mit...")
     */
    openRestrictionModal(studentName) {
        this.currentStudent = studentName;
        const modal = document.getElementById('restrictionModal');
        const nameSpan = document.getElementById('restrictionStudentName');
        const listDiv = document.getElementById('restrictionList');

        if (!modal || !nameSpan || !listDiv) return;

        nameSpan.textContent = studentName;
        listDiv.innerHTML = '';

        const students = Storage.getStudents(this.currentClass);
        const restrictions = Storage.getRestrictions(this.currentClass);
        const currentRestrictions = restrictions[studentName] || [];

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

    /**
     * Schließt das Einschränkungs-Modal
     */
    closeRestrictionModal() {
        const modal = document.getElementById('restrictionModal');
        if (modal) modal.classList.remove('active');
    }

    /**
     * Speichert die Einschränkungen
     */
    saveRestrictions() {
        const listDiv = document.getElementById('restrictionList');
        if (!listDiv || !this.currentStudent) return;

        const newRestrictions = Array.from(listDiv.querySelectorAll('input:checked'))
            .map(cb => cb.value);

        const result = Storage.setStudentRestrictions(this.currentClass, this.currentStudent, newRestrictions);

        if (result.success) {
            this.closeRestrictionModal();
        } else {
            alert(result.message);
        }
    }

    /**
     * Klassenliste anzeigen
     */
    displayClassList(className) {
        const listDisplay = document.getElementById('listDisplay');
        const listClassName = document.getElementById('listClassName');
        const displayList = document.getElementById('displayList');

        if (!className) {
            listDisplay.style.display = 'none';
            return;
        }

        const students = Storage.getStudents(className);

        listClassName.textContent = className;
        listDisplay.style.display = 'block';

        if (students.length === 0) {
            displayList.innerHTML = '<li class="empty-state">Keine Schüler in dieser Klasse</li>';
            return;
        }

        displayList.innerHTML = students.map(student =>
            `<li>${this.escapeHtml(student)}</li>`
        ).join('');
    }

    /**
     * HTML escapen
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Service Worker registrieren
     */
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registriert:', registration);
                })
                .catch(error => {
                    console.log('Service Worker Registrierung fehlgeschlagen:', error);
                });
        }
    }

    /**
     * PWA Installation einrichten
     */
    setupPWAInstall() {
        let deferredPrompt;
        const installBtn = document.getElementById('installBtn');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installBtn.style.display = 'block';
        });

        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response: ${outcome}`);
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA wurde installiert');
            installBtn.style.display = 'none';
        });
    }
}

// App initialisieren und global verfügbar machen
let app;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new KlassenlisteApp();
        window.app = app; // Global verfügbar machen für onclick Handler
    });
} else {
    app = new KlassenlisteApp();
    window.app = app; // Global verfügbar machen für onclick Handler
}
