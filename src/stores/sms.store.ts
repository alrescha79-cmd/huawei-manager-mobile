import { create } from 'zustand';
import { SMSMessage, SMSCount } from '@/types';

interface SMSState {
  messages: SMSMessage[];
  smsCount: SMSCount | null;
  isLoading: boolean;
  error: string | null;

  setMessages: (messages: SMSMessage[]) => void;
  setSMSCount: (count: SMSCount) => void;
  addMessage: (message: SMSMessage) => void;
  removeMessage: (index: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSMSStore = create<SMSState>((set) => ({
  messages: [],
  smsCount: null,
  isLoading: false,
  error: null,

  setMessages: (messages) => set({ messages }),
  setSMSCount: (count) => set({ smsCount: count }),
  addMessage: (message) => set((state) => ({ 
    messages: [message, ...state.messages] 
  })),
  removeMessage: (index) => set((state) => ({ 
    messages: state.messages.filter(msg => msg.index !== index) 
  })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  reset: () => set({
    messages: [],
    smsCount: null,
    isLoading: false,
    error: null,
  }),
}));
