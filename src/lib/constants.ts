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

export interface IFbDevice {
	Index: number;
	IPAddress: string;
	MACAddress: string;
	Active: string;			// number?
	HostName: string;
	InterfaceType: string;
	X_AVM_DE_Port: string;	// number?
	X_AVM_DE_Speed: string;	// number??
	X_AVM_DE_UpdateAvailable: string;	// number?
	X_AVM_DE_UpdateSuccessful: string;
	X_AVM_DE_InfoURL: string;
	X_AVM_DE_Model: string;
	X_AVM_DE_URL: string;
	X_AVM_DE_Guest: string;				// number?
}

export interface IDevice {
	devicename: string;
	ipaddress: string;
	macaddress: string;
	ownername: string;
	active: boolean;
	interfacetype: string;
	new: boolean;
	changed: boolean;
	warn: boolean;
	watch: boolean;
	guest: boolean;
}

export interface IDeviceList {
	devices: IDevice[];
	onlyActive: boolean;
	error?: Error;
}

export enum CachedDevice_State {
	new = 'new',
	non = 'non',
	removed = 'removed',
	changed = 'changed',
};


export interface ICachedDevice {
	State: CachedDevice_State;
	DeviceName: string;
	Active: boolean;
	Active_lc: number;
	Inactive_lc: number;
	HostName: string;
	HostName_lc: number;
	IPAddress: string;
	IPAddress_lc: number;
	MACAddress: string;
	Interfacetype: string;
	Guest: boolean;
	Port: number;
	Speed: number;
	ts: number;
	Warn: boolean;
	Watch: boolean;
}

export interface IChangedDevice {
	DeviceName: string;
	Active: boolean;
	Active_lc: number;
	Inactive_lc: number;
	HostName: string;
	HostName_lc: number;
	IPAddress: string;
	IPAddress_lc: number;
	MACAddress: string;
	Interfacetype: string;
	Guest: boolean;
	Port: number;
	Speed: number;
	ts: number;
	Count: number;
	Action: string;
}


export const dppFB_Info = 'info.';
export const dppFB_Info_SupportedFunctions = 'info.supportedFunctions.';
export const dppDevices = 'devices.';

export const idFritzBoxVersion = dppFB_Info + 'version';
export const idFritzBoxName = dppFB_Info + 'name';
export const idSupportedFunctions_FritzBoxVersion = dppFB_Info + 'supportedFunctions_version';
export const idFritzBoxIP = dppFB_Info + 'fb_IP';
export const idFritzBoxMAC = dppFB_Info + 'fb_MAC';

export const idCountDevicesTotal = dppDevices + 'countDevicesTotal';
export const idCountDevicesActive = dppDevices + 'countDevicesActive';
export const idCountDevicesActiveLAN = dppDevices + 'countDevicesActiveLAN';
export const idCountDevicesActiveWLAN = dppDevices + 'countDevicesActiveWLAN';
export const idCountDevicesActiveGuests = dppDevices + 'countDevicesActiveGuests';

export const idDeviceListActive_JSON = dppDevices + 'deviceListActive_JSON';
export const idDeviceListInactive_JSON = dppDevices + 'deviceListInactive_JSON';
export const idDeviceListActiveLAN_JSON = dppDevices + 'deviceListActiveLAN_JSON';
export const idDeviceListActiveWLAN_JSON = dppDevices + 'deviceListActiveWLAN_JSON';
export const idDeviceListActiveGuests_JSON = dppDevices + 'deviceListActiveGuests_JSON';

export const idDeviceList_NewAddedDevices_JSON = dppDevices + 'deviceList_NewAddedDevices_JSON';
export const idDeviceList_RemovedDevices_JSON = dppDevices + 'deviceList_RemovedDevices_JSON';

export const idDeviceList_Warn_JSON = dppDevices + 'deviceList_warn_JSON';
export const idDeviceList_Warn_active_JSON = dppDevices + 'deviceList_warn_active_JSON';
export const idDeviceList_Warn_inactive_JSON = dppDevices + 'deviceList_warn_inactive_JSON';

export const idDeviceList_DailyChanges_JSON = dppDevices + 'deviceList_daily_changes_JSON';
export const idDeviceList_DailyChanges_count = dppDevices + 'deviceList_daily_changes_count';
export const idDeviceList_DailyChanges_maxCount = dppDevices + 'deviceList_daily_changes_max_count';

export const idDeviceList_CachedDevices_JSON = dppDevices + 'deviceList_cached_devices_JSON';
export const idDeviceList_View_JSON = dppDevices + 'deviceList_view_JSON';
export const idDeviceList_View_JSON_Count = dppDevices + 'deviceList_view_JSON_count';
export const idDeviceList_View_Name = dppDevices + 'deviceList_view_name';

export const idDeviceList_ActiveChanged = dppDevices + 'deviceList_active_changed';	// active, hostname or ip changed
export const idDeviceList_IPChanged = dppDevices + 'deviceList_ip_changed';			// IP
export const idDeviceList_OwnerChanged = dppDevices + 'deviceList_owner_changed';	// owner
export const idDeviceList_WarnChanged = dppDevices + 'deviceList_warn_changed';		// warn
export const idDeviceList_WatchChanged = dppDevices + 'deviceList_watch_changed';	// watch

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
export const idnDeviceFbWarn = 'warn';
export const idnDeviceFbWatch = 'watch';
