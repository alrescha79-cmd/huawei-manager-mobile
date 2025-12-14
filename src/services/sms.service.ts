import { ModemAPIClient } from './api.service';
import { SMSMessage, SMSCount } from '@/types';
import { parseXMLValue } from '@/utils/helpers';

export class SMSService {
  private apiClient: ModemAPIClient;

  constructor(modemIp: string) {
    this.apiClient = new ModemAPIClient(modemIp);
  }

  async getSMSList(page: number = 1, count: number = 20): Promise<SMSMessage[]> {
    try {
      const response = await this.apiClient.get(`/api/sms/sms-list?page=${page}&count=${count}&sortType=0&readCount=0&boxType=1`);
      
      const messages: SMSMessage[] = [];
      const messagesXML = response.match(/<Message>(.*?)<\/Message>/gs);
      
      if (messagesXML) {
        messagesXML.forEach((messageXML) => {
          messages.push({
            index: parseXMLValue(messageXML, 'Index'),
            phone: parseXMLValue(messageXML, 'Phone'),
            content: parseXMLValue(messageXML, 'Content'),
            date: parseXMLValue(messageXML, 'Date'),
            smstat: parseXMLValue(messageXML, 'Smstat'),
          });
        });
      }
      
      return messages;
    } catch (error) {
      console.error('Error getting SMS list:', error);
      throw error;
    }
  }

  async getSMSCount(): Promise<SMSCount> {
    try {
      const response = await this.apiClient.get('/api/sms/sms-count');
      
      return {
        localUnread: parseInt(parseXMLValue(response, 'LocalUnread')),
        localInbox: parseInt(parseXMLValue(response, 'LocalInbox')),
        localOutbox: parseInt(parseXMLValue(response, 'LocalOutbox')),
        localDraft: parseInt(parseXMLValue(response, 'LocalDraft')),
        simUnread: parseInt(parseXMLValue(response, 'SimUnread')),
        simInbox: parseInt(parseXMLValue(response, 'SimInbox')),
        simOutbox: parseInt(parseXMLValue(response, 'SimOutbox')),
        simDraft: parseInt(parseXMLValue(response, 'SimDraft')),
        newMsg: parseInt(parseXMLValue(response, 'NewMsg')),
        localDeleted: parseInt(parseXMLValue(response, 'LocalDeleted')),
        simDeleted: parseInt(parseXMLValue(response, 'SimDeleted')),
        localMax: parseInt(parseXMLValue(response, 'LocalMax')),
        simMax: parseInt(parseXMLValue(response, 'SimMax')),
      };
    } catch (error) {
      console.error('Error getting SMS count:', error);
      throw error;
    }
  }

  async sendSMS(phone: string, content: string): Promise<boolean> {
    try {
      const smsData = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Index>-1</Index>
          <Phones>
            <Phone>${phone}</Phone>
          </Phones>
          <Sca></Sca>
          <Content>${content}</Content>
          <Length>${content.length}</Length>
          <Reserved>1</Reserved>
          <Date>${new Date().toISOString()}</Date>
        </request>`;
      
      await this.apiClient.post('/api/sms/send-sms', smsData);
      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  async deleteSMS(index: string): Promise<boolean> {
    try {
      const deleteData = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Index>${index}</Index>
        </request>`;
      
      await this.apiClient.post('/api/sms/delete-sms', deleteData);
      return true;
    } catch (error) {
      console.error('Error deleting SMS:', error);
      throw error;
    }
  }

  async markAsRead(index: string): Promise<boolean> {
    try {
      const readData = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Index>${index}</Index>
        </request>`;
      
      await this.apiClient.post('/api/sms/set-read', readData);
      return true;
    } catch (error) {
      console.error('Error marking SMS as read:', error);
      throw error;
    }
  }
}
