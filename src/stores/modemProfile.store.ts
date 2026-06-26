import { create } from 'zustand';
import { ModemProfile } from '@/types';
import {
    getModemProfiles,
    saveModemProfiles,
    getModemProfilePassword,
    saveModemProfilePassword,
    deleteModemProfilePassword,
    clearModemDataCache,
} from '@/utils/storage';
import { ModemAPIClient } from '@/services/api.service';
import { useAuthStore } from './auth.store';

const MAX_PROFILES = 5;

interface ModemProfileState {
    profiles: ModemProfile[];
    isSwitching: boolean;
    switchError: string | null;

    loadProfiles: () => Promise<void>;
    addProfile: (data: { name: string; modemIp: string; username: string; password: string }) => Promise<ModemProfile | null>;
    updateProfile: (id: string, data: Partial<{ name: string; modemIp: string; username: string; password: string }>) => Promise<void>;
    deleteProfile: (id: string) => Promise<void>;
    switchProfile: (id: string) => Promise<boolean>;
    getActiveProfile: () => ModemProfile | null;
    clearSwitchError: () => void;
    ensureProfile: (data: { modemIp: string; username: string; password: string }) => Promise<void>;
}

export const useModemProfileStore = create<ModemProfileState>((set, get) => ({
    profiles: [],
    isSwitching: false,
    switchError: null,

    loadProfiles: async () => {
        const profiles = await getModemProfiles();
        set({ profiles });
    },

    addProfile: async ({ name, modemIp, username, password }) => {
        const { profiles } = get();
        if (profiles.length >= MAX_PROFILES) {
            return null;
        }

        const id = `profile_${Date.now()}`;
        const isFirst = profiles.length === 0;

        const newProfile: ModemProfile = {
            id,
            name,
            modemIp,
            username,
            lastLogin: undefined,
            isActive: isFirst,
        };

        const updatedProfiles = isFirst
            ? [...profiles.map((p) => ({ ...p, isActive: false })), newProfile]
            : [...profiles, newProfile];

        await saveModemProfilePassword(id, password);
        await saveModemProfiles(updatedProfiles);
        set({ profiles: updatedProfiles });

        return newProfile;
    },

    updateProfile: async (id, data) => {
        const { profiles } = get();
        const updatedProfiles = profiles.map((p) => {
            if (p.id !== id) return p;
            const { password: _, ...rest } = data;
            return { ...p, ...rest };
        });

        if (data.password !== undefined) {
            await saveModemProfilePassword(id, data.password);
        }

        await saveModemProfiles(updatedProfiles);
        set({ profiles: updatedProfiles });
    },

    deleteProfile: async (id) => {
        const { profiles } = get();
        const deletedProfile = profiles.find((p) => p.id === id);

        let remaining = profiles.filter((p) => p.id !== id);

        if (deletedProfile?.isActive && remaining.length > 0) {
            remaining = remaining.map((p, index) => ({ ...p, isActive: index === 0 }));
        }

        await deleteModemProfilePassword(id);
        await saveModemProfiles(remaining);
        set({ profiles: remaining });
    },

    switchProfile: async (id) => {
        const { profiles } = get();
        const targetProfile = profiles.find((p) => p.id === id);
        if (!targetProfile) return false;

        set({ isSwitching: true, switchError: null });

        try {
            // 1. Logout from current active modem
            const currentActive = profiles.find((p) => p.isActive);
            if (currentActive) {
                try {
                    console.log(`[ModemProfile Store] Logging out from current modem ${currentActive.modemIp}...`);
                    const oldClient = new ModemAPIClient(currentActive.modemIp);
                    await oldClient.logout();
                } catch {
                    // Ignore logout errors — modem may be unreachable
                }
            }

            // 2. Load password for the target profile from SecureStore
            const password = await getModemProfilePassword(id);

            // 3. Clear existing cached data of the old modem
            await clearModemDataCache();

            // 4. Perform direct API login to the new modem (retry up to 3 times)
            const apiClient = new ModemAPIClient(targetProfile.modemIp);
            let success = false;
            let lastError = null;

            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    console.log(`[ModemProfile Store] Attempting API login to ${targetProfile.modemIp} (Attempt ${attempt}/3)...`);
                    success = await apiClient.login(targetProfile.username, password);
                    if (success) {
                        break;
                    }
                } catch (err: any) {
                    lastError = err;
                    if (attempt < 3) {
                        await new Promise((resolve) => setTimeout(resolve, 500));
                    }
                }
            }

            if (!success) {
                throw lastError || new Error('Could not establish session with target modem');
            }

            // 5. Update auth store with the new active credentials
            const authStore = useAuthStore.getState();
            await authStore.login({
                modemIp: targetProfile.modemIp,
                username: targetProfile.username,
                password,
            });

            // 6. Mark target profile as active in storage & store state
            const updatedProfiles = profiles.map((p) => ({
                ...p,
                isActive: p.id === id,
                lastLogin: p.id === id ? Date.now() : p.lastLogin,
            }));

            await saveModemProfiles(updatedProfiles);
            set({ profiles: updatedProfiles, isSwitching: false });
            return true;
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Failed to switch profile';
            console.error('[ModemProfile Store] Switch failed:', errMsg);
            set({ isSwitching: false, switchError: errMsg });
            return false;
        }
    },

    getActiveProfile: () => {
        return get().profiles.find((p) => p.isActive) || null;
    },

    clearSwitchError: () => {
        set({ switchError: null });
    },

    ensureProfile: async ({ modemIp, username, password }) => {
        const { profiles, addProfile } = get();

        // Skip if limit reached or this modemIp already has a saved profile
        if (profiles.length >= MAX_PROFILES) return;
        if (profiles.some((p) => p.modemIp === modemIp)) return;

        // Generate next available default name: Modem 1, Modem 2, ...
        const existingNumbers = profiles
            .map((p) => {
                const match = p.name.match(/^Modem (\d+)$/);
                return match ? parseInt(match[1], 10) : 0;
            })
            .filter(Boolean);

        let nextNumber = 1;
        while (existingNumbers.includes(nextNumber)) {
            nextNumber++;
        }

        await addProfile({ name: `Modem ${nextNumber}`, modemIp, username, password });
    },
}));
