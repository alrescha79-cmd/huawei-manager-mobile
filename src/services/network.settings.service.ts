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
            // Try primary endpoint first
            let response: string;
            try {
                console.log('[DEBUG] getAPNProfiles: Fetching from /api/dialup/profiles');
                response = await this.apiClient.get('/api/dialup/profiles');
                console.log('[DEBUG] getAPNProfiles: Raw response:', response.substring(0, 500));
            } catch {
                // Try alternative endpoint
                try {
                    console.log('[DEBUG] getAPNProfiles: Trying /api/dialup/profile-list');
                    response = await this.apiClient.get('/api/dialup/profile-list');
                } catch {
                    console.log('[DEBUG] getAPNProfiles: Both endpoints failed');
                    return [];
                }
            }

            const profiles: APNProfile[] = [];
            // Use [\s\S] for multiline matching
            const profilesXML = response.match(/<Profile>[\s\S]*?<\/Profile>/g);
            console.log('[DEBUG] getAPNProfiles: Found profiles:', profilesXML?.length || 0);

            if (profilesXML) {
                profilesXML.forEach((profileXML, index) => {
                    const profile = {
                        id: parseXMLValue(profileXML, 'Index') || String(index),
                        name: parseXMLValue(profileXML, 'Name') ||
                            parseXMLValue(profileXML, 'ProfileName') || '',
                        apn: parseXMLValue(profileXML, 'ApnName') ||
                            parseXMLValue(profileXML, 'APN') || '',
                        username: parseXMLValue(profileXML, 'Username') ||
                            parseXMLValue(profileXML, 'UserName') || '',
                        password: parseXMLValue(profileXML, 'Password') || '',
                        authType: this.parseAuthType(parseXMLValue(profileXML, 'AuthMode') ||
                            parseXMLValue(profileXML, 'AuthType')),
                        ipType: this.parseIpType(parseXMLValue(profileXML, 'IpType') ||
                            parseXMLValue(profileXML, 'IPType') ||
                            parseXMLValue(profileXML, 'PdpType')),
                        isDefault: parseXMLValue(profileXML, 'IsDefault') === '1' ||
                            parseXMLValue(profileXML, 'Default') === '1',
                    };
                    console.log('[DEBUG] getAPNProfiles: Profile', index, ':', profile.name, profile.apn);
                    profiles.push(profile);
                });
            }

            return profiles;
        } catch (error) {
            console.error('[DEBUG] getAPNProfiles: Error:', error);
            return [];
        }
    }

    async getActiveAPNProfile(): Promise<string> {
        try {
            const response = await this.apiClient.get('/api/dialup/connection');
            const activeId = parseXMLValue(response, 'CurrentProfile') || '0';
            console.log('[DEBUG] getActiveAPNProfile: Response:', response.substring(0, 200));
            console.log('[DEBUG] getActiveAPNProfile: Active ID:', activeId);
            return activeId;
        } catch (error) {
            console.error('Error getting active APN profile:', error);
            return '0';
        }
    }

    async createAPNProfile(profile: Omit<APNProfile, 'id'>): Promise<boolean> {
        try {
            console.log('[DEBUG] createAPNProfile: Profile data:', profile);

            // Format based on huawei-lte-api library
            // Key differences: Modify=1 for create, iptype lowercase, ReadOnly field
            const data = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<SetDefault>${profile.isDefault ? '1' : '0'}</SetDefault>
<Delete>0</Delete>
<Modify>1</Modify>
<Profile>
<Index></Index>
<IsValid>1</IsValid>
<Name>${profile.name}</Name>
<ApnIsStatic>1</ApnIsStatic>
<ApnName>${profile.apn}</ApnName>
<DialupNum>*99#</DialupNum>
<Username>${profile.username || ''}</Username>
<Password>${profile.password || ''}</Password>
<AuthMode>${this.authTypeToValue(profile.authType)}</AuthMode>
<IpIsStatic></IpIsStatic>
<IpAddress></IpAddress>
<DnsIsStatic></DnsIsStatic>
<PrimaryDns></PrimaryDns>
<SecondaryDns></SecondaryDns>
<ReadOnly>0</ReadOnly>
<iptype>${this.ipTypeToValue(profile.ipType)}</iptype>
</Profile>
</request>`;
            console.log('[DEBUG] createAPNProfile: Sending data:', data);

            const response = await this.apiClient.post('/api/dialup/profiles', data);
            console.log('[DEBUG] createAPNProfile: Response:', response);

            // Check if response indicates success
            if (response.includes('<response>OK</response>') || response.includes('OK')) {
                return true;
            }

            // Check for error
            if (response.includes('<error>')) {
                const errorCode = response.match(/<code>(\d+)<\/code>/)?.[1];
                throw new Error(`APN creation failed with error code: ${errorCode}`);
            }

            return true;
        } catch (error) {
            console.error('[DEBUG] createAPNProfile: Error:', error);
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
            // Try primary endpoint first
            let response: string;
            try {
                console.log('[DEBUG] getEthernetSettings: Trying /api/cradle/basic-info');
                response = await this.apiClient.get('/api/cradle/basic-info');
                console.log('[DEBUG] getEthernetSettings: Primary response:', response);
            } catch (primaryError) {
                console.log('[DEBUG] getEthernetSettings: Primary failed, trying /api/ethernet/settings');
                // Try alternative endpoint
                try {
                    response = await this.apiClient.get('/api/ethernet/settings');
                    console.log('[DEBUG] getEthernetSettings: Alternative response:', response);
                } catch {
                    console.log('[DEBUG] getEthernetSettings: Both endpoints failed, returning defaults');
                    // Return default if no endpoint available
                    return {
                        connectionMode: 'auto',
                        status: await this.getEthernetStatus(),
                    };
                }
            }

            const modeValue = parseXMLValue(response, 'CradleMode') ||
                parseXMLValue(response, 'connectionmode') ||
                parseXMLValue(response, 'Mode') ||
                parseXMLValue(response, 'ConnectionMode') || '0';
            console.log('[DEBUG] getEthernetSettings: Mode value:', modeValue);

            return {
                connectionMode: this.parseCradleMode(modeValue),
                status: await this.getEthernetStatus(),
            };
        } catch (error) {
            console.error('[DEBUG] getEthernetSettings: Error:', error);
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
            // Try primary endpoint first
            let response: string;
            try {
                response = await this.apiClient.get('/api/cradle/status-info');
            } catch {
                // Try alternative endpoint
                try {
                    response = await this.apiClient.get('/api/ethernet/status');
                } catch {
                    return this.getDefaultEthernetStatus();
                }
            }

            return {
                connected: parseXMLValue(response, 'CradleStatus') === '1' ||
                    parseXMLValue(response, 'Status') === '1' ||
                    parseXMLValue(response, 'Connected') === '1',
                ipAddress: parseXMLValue(response, 'CradleIPAddress') ||
                    parseXMLValue(response, 'IPAddress') || '',
                gateway: parseXMLValue(response, 'CradleGateway') ||
                    parseXMLValue(response, 'Gateway') || '',
                netmask: parseXMLValue(response, 'CradleNetMask') ||
                    parseXMLValue(response, 'NetMask') ||
                    parseXMLValue(response, 'SubnetMask') || '',
                dns1: parseXMLValue(response, 'CradlePrimaryDNS') ||
                    parseXMLValue(response, 'PrimaryDNS') ||
                    parseXMLValue(response, 'DNS1') || '',
                dns2: parseXMLValue(response, 'CradleSecondaryDNS') ||
                    parseXMLValue(response, 'SecondaryDNS') ||
                    parseXMLValue(response, 'DNS2') || '',
                macAddress: parseXMLValue(response, 'CradleMACAddress') ||
                    parseXMLValue(response, 'MACAddress') || '',
            };
        } catch (error) {
            console.error('Error getting ethernet status:', error);
            return this.getDefaultEthernetStatus();
        }
    }

    private getDefaultEthernetStatus(): EthernetStatus {
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

    async setEthernetConnectionMode(mode: EthernetSettings['connectionMode']): Promise<boolean> {
        try {
            const modeValue = this.cradleModeToValue(mode);
            const data = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <CradleMode>${modeValue}</CradleMode>
        </request>`;

            // Try primary endpoint first
            try {
                await this.apiClient.post('/api/cradle/basic-info', data);
                return true;
            } catch {
                // Try alternative endpoint
                await this.apiClient.post('/api/ethernet/settings', data);
                return true;
            }
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
