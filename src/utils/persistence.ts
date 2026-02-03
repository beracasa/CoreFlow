export const saveToStorage = <T>(key: string, data: T): void => {
    try {
        const serializedData = JSON.stringify(data);
        localStorage.setItem(key, serializedData);
    } catch (error) {
        console.error(`Error saving to localStorage key "${key}":`, error);
    }
};

export const loadFromStorage = <T>(key: string, seedData: T): T => {
    try {
        const serializedData = localStorage.getItem(key);
        if (serializedData === null) {
            return seedData;
        }
        return JSON.parse(serializedData) as T;
    } catch (error) {
        console.error(`Error loading from localStorage key "${key}":`, error);
        return seedData;
    }
};
