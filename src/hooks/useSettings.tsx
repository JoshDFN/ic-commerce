import React, { createContext, useContext, useState, useEffect } from 'react';
import { getBackend } from '../lib/backend';

export interface StoreSetting {
    key: string;
    value: string;
}

interface SettingsContextType {
    settings: Record<string, string>;
    loading: boolean;
    refreshSettings: () => Promise<void>;
    updateSettings: (newSettings: StoreSetting[]) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const backend = await getBackend();
            const res = await backend.get_store_settings();
            if ('Ok' in res) {
                const settingsMap: Record<string, string> = {};
                res.Ok.forEach((s: StoreSetting) => {
                    settingsMap[s.key] = s.value;
                });
                setSettings(settingsMap);
            }
        } catch {
            // Settings fetch failed - will use empty defaults
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (newSettings: StoreSetting[]) => {
        const backend = await getBackend();
        const res = await backend.update_store_settings({ settings: newSettings });
        if ('Ok' in res) {
            await fetchSettings();
        } else {
            throw new Error(res.Err);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};
