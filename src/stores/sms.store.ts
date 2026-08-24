import { create } from 'zustand';
import { SMSMessage, SMSCount } from '@/types';

interface SMSState {
  messages: SMSMessage[];
  smsCount: SMSCount | null;

  setMessages: (messages: SMSMessage[]) => void;
  setSMSCount: (count: SMSCount) => void;
  removeMessage: (key: string) => void;
}

export const useSMSStore = create<SMSState>((set) => ({
  messages: [],
  smsCount: null,

  setMessages: (messages) =>
    set((state) => {
      const prev = state.messages;
      if (
        prev.length === messages.length &&
        prev.every(
          (m, i) =>
            m.boxType === messages[i].boxType &&
            m.index === messages[i].index &&
            m.date === messages[i].date &&
            m.smstat === messages[i].smstat &&
            m.content === messages[i].content &&
            m.phone === messages[i].phone
        )
      ) {
        return state;
      }
      return { messages };
    }),
  setSMSCount: (count) => set({ smsCount: count }),
  removeMessage: (key) =>
    set((state) => ({
      messages: state.messages.filter((msg) => `${msg.boxType}-${msg.index}` !== key),
    })),
}));
