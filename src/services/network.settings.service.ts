import { ModemAPIClient } from './api.service';
import {
    APNProfile,
    EthernetSettings,
    EthernetStatus,
    PPPoEProfile,
    DynamicIPProfile,
} from '@/types';
import { parseXMLValue } from '@/utils/helpers';

export class NetworkSettingsService {
    private apiClient: ModemAPIClient;

    constructor(modemIp: string) {
        this.apiClient = new ModemAPIClient(modemIp);
    }

    // ============ APN Management ============

    async getAPNProfiles(): Promise<APNProfile[]> {
        try {
            const response = await this.apiClient.get('/api/dialup/profiles');
            const profiles: APNProfile[] = [];
            const profilesXML = response.match(/<Profile>(.*?)<\/Profile>/gs);

            if (profilesXML) {
                profilesXML.forEach((profileXML, index) => {
                    profiles.push({
                        id: parseXMLValue(profileXML, 'Index') || String(index),
                        name: parseXMLValue(profileXML, 'Name') || '',
                        apn: parseXMLValue(profileXML, 'ApnName') || '',
                        username: parseXMLValue(profileXML, 'Username') || '',
                        password: parseXMLValue(profileXML, 'Password') || '',
                        authType: this.parseAuthType(parseXMLValue(profileXML, 'AuthMode')),
                        ipType: this.parseIpType(parseXMLValue(profileXML, 'IpType')),
                        isDefault: parseXMLValue(profileXML, 'IsDefault') === '1',
                    });
                });
            }

            return profiles;
        } catch (error) {
            console.error('Error getting APN profiles:', error);
            return [];
        }
    }

    async getActiveAPNProfile(): Promise<string> {
        try {
            const response = await this.apiClient.get('/api/dialup/connection');
            return parseXMLValue(response, 'CurrentProfile') || '0';
        } catch (error) {
            console.error('Error getting active APN profile:', error);
            return '0';
        }
    }

    async createAPNProfile(profile: Omit<APNProfile, 'id'>): Promise<boolean> {
        try {
            const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Delete>0</Delete>
          <SetDefault>0</SetDefault>
          <Modify>0</Modify>
          <Profile>
            <Index></Index>
            <IsValid>1</IsValid>
            <Name>${profile.name}</Name>
            <ApnName>${profile.apn}</ApnName>
            <Username>${profile.username}</Username>
            <Password>${profile.password}</Password>
            <AuthMode>${this.authTypeToValue(profile.authType)}</AuthMode>
            <IpType>${this.ipTypeToValue(profile.ipType)}</IpType>
            <IsDefault>${profile.isDefault ? '1' : '0'}</IsDefault>
          </Profile>
        </request>`;

            await this.apiClient.post('/api/dialup/profiles', data);
            return true;
        } catch (error) {
            console.error('Error creating APN profile:', error);
            throw error;
        }
    }

    async updateAPNProfile(profile: APNProfile): Promise<boolean> {
        try {
            const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Delete>0</Delete>
          <SetDefault>0</SetDefault>
          <Modify>1</Modify>
          <Profile>
            <Index>${profile.id}</Index>
            <IsValid>1</IsValid>
            <Name>${profile.name}</Name>
            <ApnName>${profile.apn}</ApnName>
            <Username>${profile.username}</Username>
            <Password>${profile.password}</Password>
            <AuthMode>${this.authTypeToValue(profile.authType)}</AuthMode>
            <IpType>${this.ipTypeToValue(profile.ipType)}</IpType>
            <IsDefault>${profile.isDefault ? '1' : '0'}</IsDefault>
          </Profile>
        </request>`;

            await this.apiClient.post('/api/dialup/profiles', data);
            return true;
        } catch (error) {
            console.error('Error updating APN profile:', error);
            throw error;
        }
    }

    async deleteAPNProfile(profileId: string): Promise<boolean> {
        try {
            const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Delete>1</Delete>
          <SetDefault>0</SetDefault>
          <Modify>0</Modify>
          <Profile>
            <Index>${profileId}</Index>
          </Profile>
        </request>`;

            await this.apiClient.post('/api/dialup/profiles', data);
            return true;
        } catch (error) {
            console.error('Error deleting APN profile:', error);
            throw error;
        }
    }

    async setActiveAPNProfile(profileId: string): Promise<boolean> {
        try {
            const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Delete>0</Delete>
          <SetDefault>1</SetDefault>
          <Modify>0</Modify>
          <Profile>
            <Index>${profileId}</Index>
          </Profile>
        </request>`;

            await this.apiClient.post('/api/dialup/profiles', data);
            return true;
        } catch (error) {
            console.error('Error setting active APN profile:', error);
            throw error;
        }
    }

    // ============ Ethernet Management ============

    async getEthernetSettings(): Promise<EthernetSettings> {
        try {
            const response = await this.apiClient.get('/api/cradle/basic-info');
            const modeValue = parseXMLValue(response, 'CradleMode') || '0';

            return {
                connectionMode: this.parseCradleMode(modeValue),
                status: await this.getEthernetStatus(),
            };
        } catch (error) {
            console.error('Error getting ethernet settings:', error);
            return {
                connectionMode: 'auto',
                status: {
                    connected: false,
                    ipAddress: '',
                    gateway: '',
                    netmask: '',
                    dns1: '',
                    dns2: '',
                    macAddress: '',
                },
            };
        }
    }

    async getEthernetStatus(): Promise<EthernetStatus> {
        try {
            const response = await this.apiClient.get('/api/cradle/status-info');

            return {
                connected: parseXMLValue(response, 'CradleStatus') === '1',
                ipAddress: parseXMLValue(response, 'CradleIPAddress') || '',
                gateway: parseXMLValue(response, 'CradleGateway') || '',
                netmask: parseXMLValue(response, 'CradleNetMask') || '',
                dns1: parseXMLValue(response, 'CradlePrimaryDNS') || '',
                dns2: parseXMLValue(response, 'CradleSecondaryDNS') || '',
                macAddress: parseXMLValue(response, 'CradleMACAddress') || '',
            };
        } catch (error) {
            console.error('Error getting ethernet status:', error);
            return {
                connected: false,
                ipAddress: '',
                gateway: '',
                netmask: '',
                dns1: '',
                dns2: '',
                macAddress: '',
            };
        }
    }

    async setEthernetConnectionMode(mode: EthernetSettings['connectionMode']): Promise<boolean> {
        try {
            const modeValue = this.cradleModeToValue(mode);
            const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <CradleMode>${modeValue}</CradleMode>
        </request>`;

            await this.apiClient.post('/api/cradle/basic-info', data);
            return true;
        } catch (error) {
            console.error('Error setting ethernet connection mode:', error);
            throw error;
        }
    }

    // ============ PPPoE Profile Management ============

    async getPPPoEProfiles(): Promise<PPPoEProfile[]> {
        try {
            const response = await this.apiClient.get('/api/cradle/pppoe-profiles');
            const profiles: PPPoEProfile[] = [];
            const profilesXML = response.match(/<Profile>(.*?)<\/Profile>/gs);

            if (profilesXML) {
                profilesXML.forEach((profileXML, index) => {
                    profiles.push({
                        id: parseXMLValue(profileXML, 'Index') || String(index),
                        name: parseXMLValue(profileXML, 'Name') || '',
                        username: parseXMLValue(profileXML, 'Username') || '',
                        password: parseXMLValue(profileXML, 'Password') || '',
                        serviceName: parseXMLValue(profileXML, 'ServiceName') || '',
                        mtu: parseInt(parseXMLValue(profileXML, 'MTU') || '1492'),
                        isDefault: parseXMLValue(profileXML, 'IsDefault') === '1',
                    });
                });
            }

            return profiles;
        } catch (error) {
            console.error('Error getting PPPoE profiles:', error);
            return [];
        }
    }

    async createPPPoEProfile(profile: Omit<PPPoEProfile, 'id'>): Promise<boolean> {
        try {
            const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Delete>0</Delete>
          <Modify>0</Modify>
          <Profile>
            <Name>${profile.name}</Name>
            <Username>${profile.username}</Username>
            <Password>${profile.password}</Password>
            <ServiceName>${profile.serviceName}</ServiceName>
            <MTU>${profile.mtu}</MTU>
            <IsDefault>${profile.isDefault ? '1' : '0'}</IsDefault>
          </Profile>
        </request>`;

            await this.apiClient.post('/api/cradle/pppoe-profiles', data);
            return true;
        } catch (error) {
            console.error('Error creating PPPoE profile:', error);
            throw error;
        }
    }

    async updatePPPoEProfile(profile: PPPoEProfile): Promise<boolean> {
        try {
            const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Delete>0</Delete>
          <Modify>1</Modify>
          <Profile>
            <Index>${profile.id}</Index>
            <Name>${profile.name}</Name>
            <Username>${profile.username}</Username>
            <Password>${profile.password}</Password>
            <ServiceName>${profile.serviceName}</ServiceName>
            <MTU>${profile.mtu}</MTU>
            <IsDefault>${profile.isDefault ? '1' : '0'}</IsDefault>
          </Profile>
        </request>`;

            await this.apiClient.post('/api/cradle/pppoe-profiles', data);
            return true;
        } catch (error) {
            console.error('Error updating PPPoE profile:', error);
            throw error;
        }
    }

    async deletePPPoEProfile(profileId: string): Promise<boolean> {
        try {
            const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Delete>1</Delete>
          <Modify>0</Modify>
          <Profile>
            <Index>${profileId}</Index>
          </Profile>
        </request>`;

            await this.apiClient.post('/api/cradle/pppoe-profiles', data);
            return true;
        } catch (error) {
            console.error('Error deleting PPPoE profile:', error);
            throw error;
        }
    }

    // ============ Dynamic IP Profile Management ============

    async getDynamicIPProfiles(): Promise<DynamicIPProfile[]> {
        try {
            const response = await this.apiClient.get('/api/cradle/dhcp-profiles');
            const profiles: DynamicIPProfile[] = [];
            const profilesXML = response.match(/<Profile>(.*?)<\/Profile>/gs);

            if (profilesXML) {
                profilesXML.forEach((profileXML, index) => {
                    profiles.push({
                        id: parseXMLValue(profileXML, 'Index') || String(index),
                        name: parseXMLValue(profileXML, 'Name') || '',
                        hostname: parseXMLValue(profileXML, 'Hostname') || '',
                        mtu: parseInt(parseXMLValue(profileXML, 'MTU') || '1500'),
                        isDefault: parseXMLValue(profileXML, 'IsDefault') === '1',
                    });
                });
            }

            return profiles;
        } catch (error) {
            console.error('Error getting Dynamic IP profiles:', error);
            return [];
        }
    }

    async createDynamicIPProfile(profile: Omit<DynamicIPProfile, 'id'>): Promise<boolean> {
        try {
            const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Delete>0</Delete>
          <Modify>0</Modify>
          <Profile>
            <Name>${profile.name}</Name>
            <Hostname>${profile.hostname}</Hostname>
            <MTU>${profile.mtu}</MTU>
            <IsDefault>${profile.isDefault ? '1' : '0'}</IsDefault>
          </Profile>
        </request>`;

            await this.apiClient.post('/api/cradle/dhcp-profiles', data);
            return true;
        } catch (error) {
            console.error('Error creating Dynamic IP profile:', error);
            throw error;
        }
    }

    async updateDynamicIPProfile(profile: DynamicIPProfile): Promise<boolean> {
        try {
            const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Delete>0</Delete>
          <Modify>1</Modify>
          <Profile>
            <Index>${profile.id}</Index>
            <Name>${profile.name}</Name>
            <Hostname>${profile.hostname}</Hostname>
            <MTU>${profile.mtu}</MTU>
            <IsDefault>${profile.isDefault ? '1' : '0'}</IsDefault>
          </Profile>
        </request>`;

            await this.apiClient.post('/api/cradle/dhcp-profiles', data);
            return true;
        } catch (error) {
            console.error('Error updating Dynamic IP profile:', error);
            throw error;
        }
    }

    async deleteDynamicIPProfile(profileId: string): Promise<boolean> {
        try {
            const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Delete>1</Delete>
          <Modify>0</Modify>
          <Profile>
            <Index>${profileId}</Index>
          </Profile>
        </request>`;

            await this.apiClient.post('/api/cradle/dhcp-profiles', data);
            return true;
        } catch (error) {
            console.error('Error deleting Dynamic IP profile:', error);
            throw error;
        }
    }

    // ============ Helper Methods ============

    private parseAuthType(value: string): APNProfile['authType'] {
        switch (value) {
            case '0': return 'none';
            case '1': return 'pap';
            case '2': return 'chap';
            case '3': return 'pap_chap';
            default: return 'none';
        }
    }

    private authTypeToValue(authType: APNProfile['authType']): string {
        switch (authType) {
            case 'none': return '0';
            case 'pap': return '1';
            case 'chap': return '2';
            case 'pap_chap': return '3';
            default: return '0';
        }
    }

    private parseIpType(value: string): APNProfile['ipType'] {
        switch (value) {
            case '0': return 'ipv4';
            case '1': return 'ipv6';
            case '2': return 'ipv4v6';
            default: return 'ipv4';
        }
    }

    private ipTypeToValue(ipType: APNProfile['ipType']): string {
        switch (ipType) {
            case 'ipv4': return '0';
            case 'ipv6': return '1';
            case 'ipv4v6': return '2';
            default: return '0';
        }
    }

    private parseCradleMode(value: string): EthernetSettings['connectionMode'] {
        switch (value) {
            case '0': return 'auto';
            case '1': return 'lan_only';
            case '2': return 'pppoe';
            case '3': return 'dynamic_ip';
            case '4': return 'pppoe_dynamic';
            default: return 'auto';
        }
    }

    private cradleModeToValue(mode: EthernetSettings['connectionMode']): string {
        switch (mode) {
            case 'auto': return '0';
            case 'lan_only': return '1';
            case 'pppoe': return '2';
            case 'dynamic_ip': return '3';
            case 'pppoe_dynamic': return '4';
            default: return '0';
        }
    }
}
