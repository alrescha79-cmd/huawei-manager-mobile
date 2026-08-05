import { create } from 'zustand';
import { SMSMessage, SMSCount } from '@/types';

interface SMSState {
  messages: SMSMessage[];
  smsCount: SMSCount | null;

  setMessages: (messages: SMSMessage[]) => void;
  setSMSCount: (count: SMSCount) => void;
  removeMessage: (index: string) => void;
}

export const useSMSStore = create<SMSState>((set) => ({
  messages: [],
  smsCount: null,

  setMessages: (messages) => set({ messages }),
  setSMSCount: (count) => set({ smsCount: count }),
  removeMessage: (index) => set((state) => ({ 
    messages: state.messages.filter(msg => msg.index !== index) 
  })),
}));
