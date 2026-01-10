import { ModemAPIClient } from './api.service';
import { SMSMessage, SMSCount } from '@/types';
import { parseXMLValue } from '@/utils/helpers';

// Mock SMS data for testing when modem doesn't support SMS
const MOCK_SMS_MESSAGES: SMSMessage[] = [
  {
    index: '40012',
    phone: 'Telkomsel',
    content: 'Selamat! Anda mendapat bonus kuota 2GB. Aktif hingga 7 hari.',
    date: '2026-01-10 09:25:00',
    smstat: '0',
  },
  {
    index: '40011',
    phone: 'Indosat',
    content: 'Promo spesial IM3! Dapatkan kuota 50GB hanya Rp50.000. Buruan aktifkan sekarang di *123*888#. Berlaku hingga 31 Januari 2026. Info lengkap: indosat.com/promo',
    date: '2026-01-08 19:30:45',
    smstat: '0',
  },
  {
    index: '40010',
    phone: 'XL',
    content: 'Kuota Anda hampir habis. Ayo isi ulang!',
    date: '2026-01-07 14:22:10',
    smstat: '1',
  },
  {
    index: '40009',
    phone: '081234567890',
    content: 'Halo, ini dari kantor. Besok ada meeting jam 9 pagi ya. Jangan lupa bawa laptop dan dokumen presentasi Q4. Terima kasih.',
    date: '2026-01-07 16:45:33',
    smstat: '1',
  },
  {
    index: '40008',
    phone: 'BANK BCA',
    content: 'Transaksi berhasil. Transfer Rp500.000 ke rek 1234567890 a.n JOHN DOE. Saldo: Rp2.500.000. Jika bukan Anda, hubungi 1500888.',
    date: '2026-01-07 10:12:00',
    smstat: '1',
  },
  {
    index: '40007',
    phone: 'Tri',
    content: 'Hai Sobat Tri! Kuota kamu udah diisi. Happy browsing!',
    date: '2026-01-06 22:00:15',
    smstat: '1',
  },
  {
    index: '40006',
    phone: 'Smartfren',
    content: 'Selamat datang di jaringan Smartfren. Nikmati pengalaman 4G LTE terbaik dengan kecepatan hingga 100Mbps. Aktifkan paket unlimited sekarang di *123# atau melalui aplikasi MySmartfren.',
    date: '2026-01-06 08:30:00',
    smstat: '1',
  },
  {
    index: '40005',
    phone: '089876543210',
    content: 'Meeting jam 3 sore dibatalkan. Diganti besok.',
    date: '2026-01-05 14:00:00',
    smstat: '1',
  },
  {
    index: '40004',
    phone: 'GOJEK',
    content: 'Kode OTP GoJek: 847291. JANGAN BAGIKAN kode ini. Berlaku 5 menit.',
    date: '2026-01-05 09:15:22',
    smstat: '1',
  },
  {
    index: '40003',
    phone: 'Telkomsel',
    content: 'Sisa pulsa Anda Rp25.000.',
    date: '2026-01-04 18:30:00',
    smstat: '1',
  },
  {
    index: '40002',
    phone: 'TOKOPEDIA',
    content: 'Pesanan #INV/20260104/MPL/123456789 sedang dalam perjalanan. Estimasi tiba: 6 Jan 2026. Lacak pengiriman di aplikasi Tokopedia.',
    date: '2026-01-04 12:00:00',
    smstat: '1',
  },
  {
    index: '40001',
    phone: 'Indosat',
    content: 'Flash sale! Kuota 100GB cuma 100rb. *123*100#',
    date: '2026-01-03 20:00:00',
    smstat: '1',
  },
  {
    index: '40000',
    phone: '082111222333',
    content: 'Jangan lupa bayar listrik bulan ini ya. Sudah jatuh tempo tanggal 20. Bisa bayar lewat m-banking atau minimarket terdekat. Thanks!',
    date: '2026-01-02 15:45:00',
    smstat: '1',
  },
];

const MOCK_SMS_COUNT: SMSCount = {
  localUnread: 2,
  localInbox: 8,
  localOutbox: 1,
  localDraft: 0,
  simUnread: 0,
  simInbox: 0,
  simOutbox: 0,
  simDraft: 0,
  newMsg: 2,
  localDeleted: 0,
  simDeleted: 0,
  localMax: 500,
  simMax: 10,
};

// Global flag to enable mock mode for testing
let useMockSMSData = true;

export function setMockSMSMode(enabled: boolean): void {
  useMockSMSData = enabled;
  console.log(`[SMS] Mock mode ${enabled ? 'enabled' : 'disabled'}`);
}

export function isMockSMSMode(): boolean {
  return useMockSMSData;
}

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
    // Mock mode always reports SMS as supported
    if (useMockSMSData) {
      return true;
    }

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
    // Return mock data if mock mode is enabled
    if (useMockSMSData) {
      // Simulate pagination
      const start = (page - 1) * count;
      return MOCK_SMS_MESSAGES.slice(start, start + count);
    }

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
    // Return mock data if mock mode is enabled
    if (useMockSMSData) {
      return MOCK_SMS_COUNT;
    }

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
