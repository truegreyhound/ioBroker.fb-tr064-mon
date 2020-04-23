//!P! ?? import { hostname } from "os";

export const HTML = '<table class="mdui-table"><thead><tr><th>Name</th><th>Status</th><th>Kommt</th><th>Geht</th></tr></thead><tbody>';
export const HTML_HISTORY  = '<table class="mdui-table"><thead><tr><th>Status</th><th>Date</th></tr></thead><tbody>';
export const HTML_END = '</body></table>';
//export const HTML_GUEST  = '<table class="mdui-table"><thead><tr><th>Hostname</th><th>IPAddress</th><th>MACAddress</th></tr></thead><tbody>';

export const TR064_DESC= '/tr64desc.xml';
export const TR064_DEVINFO = '/deviceinfoSCPD.xml';
export const TR064_HOSTS = '/hostsSCPD.xml';

//!P!
export const HTML_GUEST = '';
export const URN = 'urn:dslforum-org:service:';

export const GetSpecificHostEntry = 'GetSpecificHostEntry';
export const GetSecurityPort = 'GetSecurityPort';
export const X_AVM_DE_GetHostListPath = 'X_AVM-DE_GetHostListPath';
export const X_AVM_DE_GetSpecificHostEntryByIP = 'X_AVM-DE_GetSpecificHostEntryByIP';

export let supportedFunctions: string[] = [];

export interface IDeviceInfo {
	hostname: string;
	port: number;
	sslPort: number;
	uid: string;
	pwd: string;
}


export interface IAuth {
	uid: string;
	pwd: string;
	sn: string|null;
	auth: string|null;
	realm: string;
	chCount: number;
}

export interface IDevice {
	devicename: string;
	ipaddress: string;
	macaddress: string;
	ownername: string;
	active: boolean;
	interfacetype: string;
	warn: boolean;
	watch: boolean;
	guest: boolean;
}

export interface IDeviceList {
	devices: IDevice[];
	onlyActive: boolean;
	error?: Error;
}

export const dppFB_Info = 'info.';
export const dppFB_Info_SupportedFunctions = 'info.supportedFunction.';
export const dppDevices = 'devices.';

export const idFritzBoxVersion = dppFB_Info + 'version';
export const idFritzBoxName = dppFB_Info + 'name';
export const idSupportedFunctions_FritzBoxVersion = dppFB_Info + 'supportedFunction_version';
export const idFritzBoxIP = dppFB_Info + 'fb_IP';
export const idFritzBoxMAC = dppFB_Info + 'fb_MAC';

export const idCountDevicesTotal = dppDevices + 'countDevicesTotal';
export const idCountDevicesActive = dppDevices + 'countDevicesActive';
export const idCountDevicesActiveLAN = dppDevices + 'countDevicesActiveLAN';
export const idCountDevicesActiveWLAN = dppDevices + 'countDevicesActiveWLAN';
export const idCountDevicesActiveGuests = dppDevices + 'countDevicesActiveGuests';

export const idDeviceListAll_JSON = dppDevices + 'deviceListAll_JSON';
export const idDeviceListInactive_JSON = dppDevices + 'deviceListInactive_JSON';
export const idDeviceListActive_JSON = dppDevices + 'deviceListActive_JSON';
export const idDeviceListActiveLAN_JSON = dppDevices + 'deviceListActiveLAN_JSON';
export const idDeviceListActiveWLAN_JSON = dppDevices + 'deviceListActiveWLAN_JSON';
export const idDeviceListActiveGuests_JSON = dppDevices + 'deviceListActiveGuests_JSON';

export const idnDeviceActive = 'active';
export const idnDeviceName = 'deviceName';
export const idnDeviceHostname = 'hostName';
export const idnDeviceIP = 'IP';
export const idnDeviceLastIP = 'IPlast';
export const idnDeviceMAC = 'MAC';
export const idnDeviceLastMAC = 'MAClast';
export const idnDeviceOwner = 'owner';
export const idnDeviceLastActive = 'lastActive';
export const idnDeviceLastInactive = 'lastInactive';
export const idnDeviceInterfaceType = 'interfacetype';
export const idnDeviceFbPort = 'port';
export const idnDeviceFbSpeed = 'speed';
export const idnDeviceFbGuest = 'guest';

