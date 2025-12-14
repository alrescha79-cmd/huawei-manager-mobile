import * as SecureStore from 'expo-secure-store';
import { ModemCredentials } from '@/types';

const CREDENTIALS_KEY = 'modem_credentials';

export const saveCredentials = async (credentials: ModemCredentials): Promise<void> => {
  try {
    await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials));
  } catch (error) {
    console.error('Error saving credentials:', error);
    throw error;
  }
};

export const getCredentials = async (): Promise<ModemCredentials | null> => {
  try {
    const credentials = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    return credentials ? JSON.parse(credentials) : null;
  } catch (error) {
    console.error('Error getting credentials:', error);
    return null;
  }
};

export const deleteCredentials = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
  } catch (error) {
    console.error('Error deleting credentials:', error);
    throw error;
  }
};
