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
                        'Max Mustermann',
                        'Anna Schmidt',
                        'Leon Weber',
                        'Emma Müller',
                        'Lukas Fischer',
                        'Mia Wagner',
                        'Jonas Becker',
                        'Sophie Schulz',
                        'Felix Hoffmann',
                        'Lena Koch',
                        'Paul Richter',
                        'Laura Klein',
                        'Noah Zimmermann',
                        'Hannah Braun',
                        'Ben Krüger',
                        'Lea Schmitt',
                        'Tim Hartmann',
                        'Sarah Lange',
                        'Jan Werner',
                        'Marie Peters'
                    ]
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
            students: []
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

        if (data.classes[className].students.includes(studentName)) {
            return { success: false, message: 'Schüler existiert bereits' };
        }

        data.classes[className].students.push(studentName);
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
            const trimmedName = name.trim();
            if (trimmedName && !data.classes[className].students.includes(trimmedName)) {
                data.classes[className].students.push(trimmedName);
                added++;
            } else if (trimmedName) {
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
    }
};

// Initialisiere Storage beim Laden
Storage.init();
