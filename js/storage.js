/**
 * LocalStorage Management für Klassenliste
 */

const Storage = {
    STORAGE_KEY: 'klassenliste_data',

    /**
     * Initialisiert den Storage mit Demo-Daten falls leer
     */
    init() {
        if (!this.getData()) {
            this.setData(this.getDefaultData());
        }
    },

    /**
     * Gibt die Standard-Demo-Daten zurück
     */
    getDefaultData() {
        return {
            classes: {
                'demo': {
                    name: 'demo',
                    students: [
                        'Max M',
                        'Anna S',
                        'Leon W',
                        'Emma Mü',
                        'Lukas F',
                        'Mia W',
                        'Jonas B',
                        'Sophie S',
                        'Felix H',
                        'Lena K',
                        'Paul R',
                        'Laura Kl',
                        'Noah Z',
                        'Hannah B',
                        'Ben Kr',
                        'Lea S',
                        'Tim H',
                        'Sarah L',
                        'Jan W',
                        'Marie P'
                    ],
                    restrictions: {}
                }
            }
        };
    },

    /**
     * Lädt alle Daten aus dem LocalStorage
     */
    getData() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Fehler beim Laden der Daten:', error);
            return null;
        }
    },

    /**
     * Speichert alle Daten im LocalStorage
     */
    setData(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Fehler beim Speichern der Daten:', error);
            return false;
        }
    },

    /**
     * Gibt alle Klassen zurück
     */
    getClasses() {
        const data = this.getData();
        return data ? data.classes : {};
    },

    /**
     * Gibt eine bestimmte Klasse zurück
     */
    getClass(className) {
        const classes = this.getClasses();
        return classes[className] || null;
    },

    /**
     * Erstellt eine neue Klasse
     */
    addClass(className) {
        const data = this.getData();
        if (data.classes[className]) {
            return { success: false, message: 'Klasse existiert bereits' };
        }

        data.classes[className] = {
            name: className,
            students: [],
            restrictions: {}
        };

        this.setData(data);
        return { success: true, message: 'Klasse erstellt' };
    },

    /**
     * Benennt eine Klasse um
     */
    renameClass(oldName, newName) {
        const data = this.getData();

        if (!data.classes[oldName]) {
            return { success: false, message: 'Klasse nicht gefunden' };
        }

        if (data.classes[newName] && oldName !== newName) {
            return { success: false, message: 'Klasse mit diesem Namen existiert bereits' };
        }

        if (oldName !== newName) {
            data.classes[newName] = { ...data.classes[oldName], name: newName };
            delete data.classes[oldName];
        }

        this.setData(data);
        return { success: true, message: 'Klasse umbenannt' };
    },

    /**
     * Löscht eine Klasse
     */
    deleteClass(className) {
        const data = this.getData();

        if (!data.classes[className]) {
            return { success: false, message: 'Klasse nicht gefunden' };
        }

        delete data.classes[className];
        this.setData(data);
        return { success: true, message: 'Klasse gelöscht' };
    },

    /**
     * Fügt einen Schüler zu einer Klasse hinzu
     */
    addStudent(className, studentName) {
        const data = this.getData();

        if (!data.classes[className]) {
            return { success: false, message: 'Klasse nicht gefunden' };
        }

        // Validate student name
        const validation = this.validateStudentName(studentName);
        if (!validation.valid) {
            return { success: false, message: validation.message };
        }

        const validName = validation.name;

        if (data.classes[className].students.includes(validName)) {
            return { success: false, message: 'Schüler existiert bereits' };
        }

        data.classes[className].students.push(validName);
        this.setData(data);
        return { success: true, message: 'Schüler hinzugefügt' };
    },

    /**
     * Fügt mehrere Schüler zu einer Klasse hinzu
     */
    addMultipleStudents(className, studentNames) {
        const data = this.getData();

        if (!data.classes[className]) {
            return { success: false, message: 'Klasse nicht gefunden' };
        }

        let added = 0;
        let skipped = 0;

        studentNames.forEach(name => {
            const validation = this.validateStudentName(name);
            if (validation.valid) {
                const validName = validation.name;
                if (!data.classes[className].students.includes(validName)) {
                    data.classes[className].students.push(validName);
                    added++;
                } else {
                    skipped++;
                }
            } else {
                skipped++;
            }
        });

        this.setData(data);
        return {
            success: true,
            message: `${added} Schüler hinzugefügt${skipped > 0 ? `, ${skipped} übersprungen` : ''}`,
            added,
            skipped
        };
    },

    /**
     * Benennt einen Schüler um
     */
    renameStudent(className, oldName, newName) {
        const data = this.getData();

        if (!data.classes[className]) {
            return { success: false, message: 'Klasse nicht gefunden' };
        }

        const students = data.classes[className].students;
        const index = students.indexOf(oldName);

        if (index === -1) {
            return { success: false, message: 'Schüler nicht gefunden' };
        }

        if (students.includes(newName) && oldName !== newName) {
            return { success: false, message: 'Schüler mit diesem Namen existiert bereits' };
        }

        students[index] = newName;
        this.setData(data);
        return { success: true, message: 'Schüler umbenannt' };
    },

    /**
     * Löscht einen Schüler aus einer Klasse
     */
    deleteStudent(className, studentName) {
        const data = this.getData();

        if (!data.classes[className]) {
            return { success: false, message: 'Klasse nicht gefunden' };
        }

        const students = data.classes[className].students;
        const index = students.indexOf(studentName);

        if (index === -1) {
            return { success: false, message: 'Schüler nicht gefunden' };
        }

        students.splice(index, 1);
        this.setData(data);
        return { success: true, message: 'Schüler gelöscht' };
    },

    /**
     * Gibt die Schüler einer Klasse zurück
     */
    getStudents(className) {
        const classData = this.getClass(className);
        return classData ? classData.students : [];
    },

    /**
     * Gibt die Einschränkungen ("nie mit...") einer Klasse zurück
     */
    getRestrictions(className) {
        const classData = this.getClass(className);
        if (!classData) return {};
        // Ensure restrictions object exists (for backwards compatibility)
        if (!classData.restrictions) {
            classData.restrictions = {};
            this.setData(this.getData());
        }
        return classData.restrictions;
    },

    /**
     * Setzt Einschränkungen für einen Schüler (bidirektional)
     */
    setStudentRestrictions(className, studentName, restrictedNames) {
        const data = this.getData();
        if (!data.classes[className]) {
            return { success: false, message: 'Klasse nicht gefunden' };
        }

        if (!data.classes[className].restrictions) {
            data.classes[className].restrictions = {};
        }

        const restrictions = data.classes[className].restrictions;

        // Set restrictions for the student
        restrictions[studentName] = restrictedNames;

        // Bidirectional: Add reciprocal restrictions
        const allStudents = data.classes[className].students;
        allStudents.forEach(otherStudent => {
            if (otherStudent === studentName) return;

            if (!restrictions[otherStudent]) {
                restrictions[otherStudent] = [];
            }

            const shouldHaveRestriction = restrictedNames.includes(otherStudent);
            const hasRestriction = restrictions[otherStudent].includes(studentName);

            if (shouldHaveRestriction && !hasRestriction) {
                restrictions[otherStudent].push(studentName);
            } else if (!shouldHaveRestriction && hasRestriction) {
                restrictions[otherStudent] = restrictions[otherStudent].filter(name => name !== studentName);
            }
        });

        this.setData(data);
        return { success: true, message: 'Einschränkungen gespeichert' };
    },

    /**
     * Validiert Schülernamen (max. 12 Zeichen)
     */
    validateStudentName(name) {
        const trimmed = name.trim();
        if (!trimmed) {
            return { valid: false, message: 'Name darf nicht leer sein' };
        }
        if (trimmed.length > 12) {
            return { valid: false, message: 'Name darf maximal 12 Zeichen haben' };
        }
        return { valid: true, name: trimmed };
    },

    /**
     * Gibt die zuletzt gewählte Klasse zurück
     */
    getLastSelectedClass() {
        try {
            return localStorage.getItem('klassenliste_last_selected') || null;
        } catch (error) {
            console.error('Fehler beim Laden der letzten Auswahl:', error);
            return null;
        }
    },

    /**
     * Speichert die zuletzt gewählte Klasse
     */
    setLastSelectedClass(className) {
        try {
            localStorage.setItem('klassenliste_last_selected', className);
            return true;
        } catch (error) {
            console.error('Fehler beim Speichern der letzten Auswahl:', error);
            return false;
        }
    }
};

// Initialisiere Storage beim Laden
Storage.init();
