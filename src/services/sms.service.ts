import { ModemAPIClient } from './api.service';
import { SMSMessage, SMSCount } from '@/types';
import { parseXMLValue } from '@/utils/helpers';

export class SMSService {
  private apiClient: ModemAPIClient;
  private _smsSupportCache: boolean | null = null;

  constructor(modemIp: string) {
    this.apiClient = new ModemAPIClient(modemIp);
  }

  /**
   * Check if SMS is supported by the modem
   * Reference: https://github.com/Salamek/huawei-lte-api/blob/master/huawei_lte_api/api/Sms.py
   * Uses sms-feature-switch endpoint to check support
   */
  async isSMSSupported(): Promise<boolean> {
    // Return cached result if available
    if (this._smsSupportCache !== null) {
      return this._smsSupportCache;
    }

    try {
      const response = await this.apiClient.get('/api/sms/sms-feature-switch');

      // Check if we got a valid response (not an error)
      // If the endpoint returns error 404 or similar, SMS is not supported
      if (!response || response.includes('<error>')) {
        this._smsSupportCache = false;
        return false;
      }

      // If we get here, SMS is supported
      this._smsSupportCache = true;
      return true;
    } catch (error: any) {
      // Check if it's a session error - those should be re-thrown
      if (error?.message?.includes('125003') || error?.message?.includes('125002')) {
        throw error; // Re-throw session errors so they trigger re-login
      }

      // Any other error (404, etc) means SMS is not supported
      this._smsSupportCache = false;
      return false;
    }
  }

  /**
   * Reset SMS support cache (call this after re-login)
   */
  resetSMSCache(): void {
    this._smsSupportCache = null;
  }

  async getSMSList(page: number = 1, count: number = 20, boxType: number = 1): Promise<SMSMessage[]> {
    try {
      // SMS list requires POST with XML body
      const requestData = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <PageIndex>${page}</PageIndex>
          <ReadCount>${count}</ReadCount>
          <BoxType>${boxType}</BoxType>
          <SortType>0</SortType>
          <Ascending>0</Ascending>
          <UnreadPreferred>0</UnreadPreferred>
        </request>`;

      const response = await this.apiClient.post('/api/sms/sms-list', requestData);

      const messages: SMSMessage[] = [];
      // Use [\s\S] instead of . to properly match content including newlines
      const messagesXML = response.match(/<Message>[\s\S]*?<\/Message>/g);

      if (messagesXML) {
        messagesXML.forEach((messageXML) => {
          // Extract and decode content, handling potential CDATA and special characters
          let content = parseXMLValue(messageXML, 'Content');
          // Decode HTML entities if present
          content = content
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
            .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

          messages.push({
            index: parseXMLValue(messageXML, 'Index'),
            phone: parseXMLValue(messageXML, 'Phone'),
            content: content,
            date: parseXMLValue(messageXML, 'Date'),
            smstat: parseXMLValue(messageXML, 'Smstat'),
          });
        });
      }

      return messages;
    } catch (error: any) {
      // Re-throw session errors so the app can handle re-login
      if (error?.message?.includes('125003') || error?.message?.includes('125002')) {
        throw error;
      }

      // For other errors, return empty array - SMS not supported
      return [];
    }
  }

  async getSMSCount(): Promise<SMSCount> {
    try {
      const response = await this.apiClient.get('/api/sms/sms-count');

      return {
        localUnread: parseInt(parseXMLValue(response, 'LocalUnread')) || 0,
        localInbox: parseInt(parseXMLValue(response, 'LocalInbox')) || 0,
        localOutbox: parseInt(parseXMLValue(response, 'LocalOutbox')) || 0,
        localDraft: parseInt(parseXMLValue(response, 'LocalDraft')) || 0,
        simUnread: parseInt(parseXMLValue(response, 'SimUnread')) || 0,
        simInbox: parseInt(parseXMLValue(response, 'SimInbox')) || 0,
        simOutbox: parseInt(parseXMLValue(response, 'SimOutbox')) || 0,
        simDraft: parseInt(parseXMLValue(response, 'SimDraft')) || 0,
        newMsg: parseInt(parseXMLValue(response, 'NewMsg')) || 0,
        localDeleted: parseInt(parseXMLValue(response, 'LocalDeleted')) || 0,
        simDeleted: parseInt(parseXMLValue(response, 'SimDeleted')) || 0,
        localMax: parseInt(parseXMLValue(response, 'LocalMax')) || 0,
        simMax: parseInt(parseXMLValue(response, 'SimMax')) || 0,
      };
    } catch (error: any) {
      // Re-throw session errors so the app can handle re-login
      if (error?.message?.includes('125003') || error?.message?.includes('125002')) {
        throw error;
      }

      // For other errors, return default values - SMS not supported
      return {
        localUnread: 0,
        localInbox: 0,
        localOutbox: 0,
        localDraft: 0,
        simUnread: 0,
        simInbox: 0,
        simOutbox: 0,
        simDraft: 0,
        newMsg: 0,
        localDeleted: 0,
        simDeleted: 0,
        localMax: 0,
        simMax: 0,
      };
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
