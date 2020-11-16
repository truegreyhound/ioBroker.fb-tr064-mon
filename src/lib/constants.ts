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
	host: string;
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
	name: string;
	ip: string;
	mac: string;
	active: boolean;
}

export interface IDeviceList {
	devices: IDevice[];
	onlyActive: boolean;
	error?: Error;
}

export const dppFB_Info = 'info.';
export const dppFB_Info_SupportedFunctions = 'info.supportedFunction.';

export const idFritzBoxVersion = dppFB_Info + 'version';


